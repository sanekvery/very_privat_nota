#!/bin/bash

#####################################################################
# VPN Agent - Docker Setup Script
#
# Самый простой способ развертывания Agent через Docker
#
# Использование:
#   curl -fsSL https://raw.githubusercontent.com/sanekvery/very_privat_nota/master/agent/setup-docker.sh | sudo bash
#####################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

WG_INTERFACE="wg0"
WG_PORT="51820"
AGENT_PORT="3001"

#####################################################################
# Installation
#####################################################################

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

install_docker() {
    log_info "Installing Docker..."

    if command -v docker &> /dev/null; then
        log_info "Docker already installed"
        return
    fi

    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker

    log_success "Docker installed"
}

install_wireguard() {
    log_info "Installing WireGuard..."

    apt-get update
    apt-get install -y wireguard wireguard-tools iptables

    # Generate keys
    if [ ! -f /etc/wireguard/server_private.key ]; then
        wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
        chmod 600 /etc/wireguard/server_private.key
    fi

    SERVER_PRIVATE_KEY=$(cat /etc/wireguard/server_private.key)
    MAIN_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)

    # Create WireGuard config
    cat > /etc/wireguard/${WG_INTERFACE}.conf <<EOF
[Interface]
Address = 10.0.0.1/24
ListenPort = ${WG_PORT}
PrivateKey = ${SERVER_PRIVATE_KEY}
PostUp = iptables -A FORWARD -i ${WG_INTERFACE} -j ACCEPT; iptables -t nat -A POSTROUTING -o ${MAIN_INTERFACE} -j MASQUERADE
PostDown = iptables -D FORWARD -i ${WG_INTERFACE} -j ACCEPT; iptables -t nat -D POSTROUTING -o ${MAIN_INTERFACE} -j MASQUERADE
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

deploy_agent() {
    log_info "Deploying Agent with Docker..."

    # Generate bearer token
    BEARER_TOKEN=$(openssl rand -base64 32)
    PUBLIC_IP=$(curl -s https://api.ipify.org)

    # Pull image (or build from source)
    docker pull ghcr.io/sanekvery/vpn-agent:latest || {
        log_info "Building Agent image..."
        cd /tmp
        git clone https://github.com/sanekvery/very_privat_nota.git
        cd very_privat_nota/agent
        docker build -t vpn-agent:latest .
        cd /
        rm -rf /tmp/very_privat_nota
    }

    # Stop and remove existing container
    docker stop vpn-agent 2>/dev/null || true
    docker rm vpn-agent 2>/dev/null || true

    # Run Agent container
    docker run -d \
      --name vpn-agent \
      --restart unless-stopped \
      --network host \
      --cap-add NET_ADMIN \
      --cap-add SYS_MODULE \
      -v /etc/wireguard:/etc/wireguard \
      -e PORT=${AGENT_PORT} \
      -e NODE_ENV=production \
      -e BEARER_TOKEN="${BEARER_TOKEN}" \
      -e WG_INTERFACE=${WG_INTERFACE} \
      -e WG_CONFIG_PATH=/etc/wireguard/${WG_INTERFACE}.conf \
      -e WG_PORT=${WG_PORT} \
      -e LOG_LEVEL=info \
      vpn-agent:latest

    log_success "Agent container started"

    # Save registration info
    SERVER_PUBLIC_KEY=$(cat /etc/wireguard/server_public.key)

    echo ""
    echo "=========================================================================="
    echo -e "${GREEN}✓ VPN Agent (Docker) Installation Complete!${NC}"
    echo "=========================================================================="
    echo ""
    echo -e "${YELLOW}Registration Information:${NC}"
    echo ""
    echo -e "${BLUE}Public IP:${NC}          ${PUBLIC_IP}"
    echo -e "${BLUE}Agent API URL:${NC}      http://${PUBLIC_IP}:${AGENT_PORT}"
    echo -e "${BLUE}Bearer Token:${NC}       ${BEARER_TOKEN}"
    echo -e "${BLUE}Server Public Key:${NC}  ${SERVER_PUBLIC_KEY}"
    echo ""
    echo "=========================================================================="
    echo ""
    echo -e "${YELLOW}Add to Admin Panel or run SQL:${NC}"
    echo ""
    cat <<EOF
INSERT INTO vpn_servers (
  id, name, location, country, public_ip, agent_api_url,
  agent_bearer_token, server_public_key, max_users, is_active, status
) VALUES (
  gen_random_uuid(), '$(hostname)', '[Location]', '[Country]',
  '${PUBLIC_IP}', 'http://${PUBLIC_IP}:${AGENT_PORT}',
  '${BEARER_TOKEN}', '${SERVER_PUBLIC_KEY}',
  1000, true, 'active'
);
EOF
    echo ""
    echo "=========================================================================="
    echo ""
    echo "Docker commands:"
    echo "  View logs:    docker logs -f vpn-agent"
    echo "  Restart:      docker restart vpn-agent"
    echo "  Stop:         docker stop vpn-agent"
    echo "  Health check: curl http://localhost:${AGENT_PORT}/health"
    echo ""
}

configure_firewall() {
    log_info "Configuring firewall..."

    if ! command -v ufw &> /dev/null; then
        apt-get install -y ufw
    fi

    ufw allow 22/tcp
    ufw allow ${WG_PORT}/udp
    ufw allow ${AGENT_PORT}/tcp
    ufw --force enable

    log_success "Firewall configured"
}

main() {
    log_info "Starting VPN Agent (Docker) installation..."
    echo ""

    check_root

    install_docker
    install_wireguard
    deploy_agent
    configure_firewall

    log_success "Installation complete!"
}

main "$@"
