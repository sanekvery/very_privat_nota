#!/bin/bash

#####################################################################
# VPN Agent - Automated Setup Script
#
# Автоматически устанавливает и настраивает:
# - WireGuard
# - Node.js 20
# - Agent application
# - Systemd service
# - Firewall rules
#
# Использование:
#   curl -fsSL https://raw.githubusercontent.com/sanekvery/very_privat_nota/master/agent/setup.sh | sudo bash
#
# Или локально:
#   sudo bash setup.sh
#####################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AGENT_DIR="/opt/vpn-agent"
AGENT_USER="vpn-agent"
WG_INTERFACE="wg0"
WG_PORT="51820"
WG_SUBNET="10.0.0.0/24"
WG_SERVER_IP="10.0.0.1"
AGENT_PORT="3001"

#####################################################################
# Helper functions
#####################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        log_error "Cannot detect OS"
        exit 1
    fi

    log_info "Detected OS: $OS $VERSION"

    if [[ "$OS" != "ubuntu" ]] && [[ "$OS" != "debian" ]]; then
        log_warning "This script is tested on Ubuntu/Debian only"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

#####################################################################
# Installation steps
#####################################################################

install_wireguard() {
    log_info "Installing WireGuard..."

    apt-get update
    apt-get install -y wireguard wireguard-tools iptables

    log_success "WireGuard installed"
}

configure_wireguard() {
    log_info "Configuring WireGuard..."

    # Generate server keys if not exist
    if [ ! -f /etc/wireguard/server_private.key ]; then
        wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
        chmod 600 /etc/wireguard/server_private.key
        log_success "Generated WireGuard keys"
    else
        log_info "WireGuard keys already exist"
    fi

    SERVER_PRIVATE_KEY=$(cat /etc/wireguard/server_private.key)
    SERVER_PUBLIC_KEY=$(cat /etc/wireguard/server_public.key)

    # Get main network interface
    MAIN_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)

    # Create WireGuard config
    cat > /etc/wireguard/${WG_INTERFACE}.conf <<EOF
[Interface]
Address = ${WG_SERVER_IP}/24
ListenPort = ${WG_PORT}
PrivateKey = ${SERVER_PRIVATE_KEY}
PostUp = iptables -A FORWARD -i ${WG_INTERFACE} -j ACCEPT; iptables -t nat -A POSTROUTING -o ${MAIN_INTERFACE} -j MASQUERADE
PostDown = iptables -D FORWARD -i ${WG_INTERFACE} -j ACCEPT; iptables -t nat -D POSTROUTING -o ${MAIN_INTERFACE} -j MASQUERADE

# Peers will be added dynamically by Agent
EOF

    chmod 600 /etc/wireguard/${WG_INTERFACE}.conf

    # Enable IP forwarding
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
    sysctl -p

    # Start WireGuard
    wg-quick up ${WG_INTERFACE} 2>/dev/null || true
    systemctl enable wg-quick@${WG_INTERFACE}

    log_success "WireGuard configured"
}

install_nodejs() {
    log_info "Installing Node.js 20..."

    # Check if Node.js 20 is already installed
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 20 ]; then
            log_info "Node.js $NODE_VERSION already installed"
            return
        fi
    fi

    # Install Node.js 20 from NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs

    log_success "Node.js $(node -v) installed"
}

install_agent() {
    log_info "Installing Agent application..."

    # Create agent directory
    mkdir -p ${AGENT_DIR}
    cd ${AGENT_DIR}

    # Clone or download agent code
    if command -v git &> /dev/null; then
        log_info "Cloning from GitHub..."
        git clone https://github.com/sanekvery/very_privat_nota.git temp
        cp -r temp/agent/* .
        rm -rf temp
    else
        log_error "Git not installed. Please install git first: apt-get install -y git"
        exit 1
    fi

    # Install dependencies
    log_info "Installing Node.js dependencies..."
    npm ci --only=production

    # Build TypeScript
    log_info "Building application..."
    npm run build

    log_success "Agent application installed"
}

configure_agent() {
    log_info "Configuring Agent..."

    # Generate bearer token
    BEARER_TOKEN=$(openssl rand -base64 32)

    # Get server public IP
    PUBLIC_IP=$(curl -s https://api.ipify.org || curl -s https://ifconfig.me || echo "UNKNOWN")

    # Create .env file
    cat > ${AGENT_DIR}/.env <<EOF
# Server Configuration
PORT=${AGENT_PORT}
HOST=0.0.0.0
NODE_ENV=production

# Security
BEARER_TOKEN=${BEARER_TOKEN}

# WireGuard Configuration
WG_INTERFACE=${WG_INTERFACE}
WG_CONFIG_PATH=/etc/wireguard/${WG_INTERFACE}.conf
WG_PORT=${WG_PORT}
WG_SUBNET=${WG_SUBNET}

# Logging
LOG_LEVEL=info
EOF

    chmod 600 ${AGENT_DIR}/.env

    log_success "Agent configured"

    # Store registration data for later display
    SERVER_PUBLIC_KEY=$(cat /etc/wireguard/server_public.key)
    echo "${BEARER_TOKEN}" > /tmp/agent_bearer_token
    echo "${SERVER_PUBLIC_KEY}" > /tmp/agent_public_key
    echo "${PUBLIC_IP}" > /tmp/agent_public_ip
}

create_systemd_service() {
    log_info "Creating systemd service..."

    cat > /etc/systemd/system/vpn-agent.service <<EOF
[Unit]
Description=VPN Server Agent
After=network.target wg-quick@${WG_INTERFACE}.service
Wants=wg-quick@${WG_INTERFACE}.service

[Service]
Type=simple
User=root
WorkingDirectory=${AGENT_DIR}
Environment=NODE_ENV=production
ExecStart=/usr/bin/node ${AGENT_DIR}/dist/index.js
Restart=always
RestartSec=10

StandardOutput=append:/var/log/vpn-agent.log
StandardError=append:/var/log/vpn-agent-error.log

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable vpn-agent
    systemctl start vpn-agent

    log_success "Systemd service created and started"
}

configure_firewall() {
    log_info "Configuring firewall..."

    # Install ufw if not present
    if ! command -v ufw &> /dev/null; then
        apt-get install -y ufw
    fi

    # Allow SSH (important!)
    ufw allow 22/tcp

    # Allow WireGuard
    ufw allow ${WG_PORT}/udp

    # Note: Agent API port will be restricted later
    log_warning "Agent API port ${AGENT_PORT} is currently open to all"
    log_warning "After adding server to main app, run:"
    log_warning "  ufw allow from <MAIN_SERVER_IP> to any port ${AGENT_PORT}"
    log_warning "  ufw delete allow ${AGENT_PORT}"

    ufw allow ${AGENT_PORT}/tcp

    # Enable firewall
    ufw --force enable

    log_success "Firewall configured"
}

display_registration_info() {
    BEARER_TOKEN=$(cat /tmp/agent_bearer_token)
    SERVER_PUBLIC_KEY=$(cat /tmp/agent_public_key)
    PUBLIC_IP=$(cat /tmp/agent_public_ip)

    echo ""
    echo "=========================================================================="
    echo -e "${GREEN}✓ VPN Agent Installation Complete!${NC}"
    echo "=========================================================================="
    echo ""
    echo -e "${YELLOW}Registration Information (Add to Admin Panel):${NC}"
    echo ""
    echo -e "${BLUE}Server Name:${NC}        $(hostname) (или введи своё название)"
    echo -e "${BLUE}Location:${NC}           [Your Location] (например: New York, US)"
    echo -e "${BLUE}Country:${NC}            [Country Code] (например: US)"
    echo -e "${BLUE}Public IP:${NC}          ${PUBLIC_IP}"
    echo -e "${BLUE}Agent API URL:${NC}      http://${PUBLIC_IP}:${AGENT_PORT}"
    echo -e "${BLUE}Bearer Token:${NC}       ${BEARER_TOKEN}"
    echo -e "${BLUE}Server Public Key:${NC}  ${SERVER_PUBLIC_KEY}"
    echo -e "${BLUE}Max Users:${NC}          1000 (или установи свой лимит)"
    echo ""
    echo "=========================================================================="
    echo ""
    echo -e "${YELLOW}SQL для добавления в БД:${NC}"
    echo ""
    cat <<EOF
INSERT INTO vpn_servers (
  id,
  name,
  location,
  country,
  public_ip,
  agent_api_url,
  agent_bearer_token,
  server_public_key,
  max_users,
  is_active,
  status
) VALUES (
  gen_random_uuid(),
  '$(hostname)',
  '[Your Location]',
  '[Country]',
  '${PUBLIC_IP}',
  'http://${PUBLIC_IP}:${AGENT_PORT}',
  '${BEARER_TOKEN}',
  '${SERVER_PUBLIC_KEY}',
  1000,
  true,
  'active'
);
EOF
    echo ""
    echo "=========================================================================="
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Copy the registration information above"
    echo "2. Add server in Admin Panel: /admin/servers"
    echo "3. Restrict Agent API to main server IP:"
    echo "   ufw allow from <MAIN_SERVER_IP> to any port ${AGENT_PORT}"
    echo "   ufw delete allow ${AGENT_PORT}"
    echo ""
    echo -e "${GREEN}Agent is running and ready to accept connections!${NC}"
    echo ""
    echo "Check status: systemctl status vpn-agent"
    echo "View logs:    journalctl -u vpn-agent -f"
    echo "Health check: curl http://localhost:${AGENT_PORT}/health"
    echo ""

    # Save registration info to file
    cat > ${AGENT_DIR}/REGISTRATION_INFO.txt <<EOF
VPN Agent Registration Information
====================================

Generated: $(date)

Server Name: $(hostname)
Location: [Your Location]
Country: [Country Code]
Public IP: ${PUBLIC_IP}
Agent API URL: http://${PUBLIC_IP}:${AGENT_PORT}
Bearer Token: ${BEARER_TOKEN}
Server Public Key: ${SERVER_PUBLIC_KEY}
Max Users: 1000

SQL Query:
----------
INSERT INTO vpn_servers (
  id, name, location, country, public_ip, agent_api_url,
  agent_bearer_token, server_public_key, max_users, is_active, status
) VALUES (
  gen_random_uuid(), '$(hostname)', '[Your Location]', '[Country]',
  '${PUBLIC_IP}', 'http://${PUBLIC_IP}:${AGENT_PORT}',
  '${BEARER_TOKEN}', '${SERVER_PUBLIC_KEY}',
  1000, true, 'active'
);
EOF

    log_success "Registration info saved to ${AGENT_DIR}/REGISTRATION_INFO.txt"

    # Cleanup temp files
    rm -f /tmp/agent_bearer_token /tmp/agent_public_key /tmp/agent_public_ip
}

verify_installation() {
    log_info "Verifying installation..."

    # Check WireGuard
    if wg show ${WG_INTERFACE} &>/dev/null; then
        log_success "WireGuard is running"
    else
        log_error "WireGuard is not running"
        return 1
    fi

    # Check Agent service
    if systemctl is-active --quiet vpn-agent; then
        log_success "Agent service is running"
    else
        log_error "Agent service is not running"
        return 1
    fi

    # Check Agent health
    sleep 3
    if curl -s http://localhost:${AGENT_PORT}/health | grep -q "healthy"; then
        log_success "Agent health check passed"
    else
        log_warning "Agent health check failed (might need a moment to start)"
    fi

    return 0
}

#####################################################################
# Main installation flow
#####################################################################

main() {
    log_info "Starting VPN Agent installation..."
    echo ""

    check_root
    detect_os

    echo ""
    log_info "This script will install:"
    log_info "  - WireGuard VPN server"
    log_info "  - Node.js 20"
    log_info "  - VPN Agent application"
    log_info "  - Systemd service"
    log_info "  - Firewall rules"
    echo ""

    read -p "Continue with installation? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Installation cancelled"
        exit 0
    fi

    echo ""

    # Installation steps
    install_wireguard
    configure_wireguard
    install_nodejs
    install_agent
    configure_agent
    create_systemd_service
    configure_firewall

    echo ""

    if verify_installation; then
        display_registration_info
    else
        log_error "Installation completed with errors"
        log_info "Check logs: journalctl -u vpn-agent -f"
        exit 1
    fi
}

# Run main function
main "$@"
