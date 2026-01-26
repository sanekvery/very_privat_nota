# VPN Server Agent

Серверное приложение для управления WireGuard на VPN-серверах. Предоставляет REST API для добавления/удаления peers, сбора метрик и health check.

## 📋 Содержание

- [Обзор](#обзор)
- [Требования](#требования)
- [Установка](#установка)
- [Конфигурация](#конфигурация)
- [API Endpoints](#api-endpoints)
- [Развертывание](#развертывание)
- [Безопасность](#безопасность)

## Обзор

VPN Server Agent - это Node.js приложение, которое:

- Запускается на каждом VPN сервере
- Управляет WireGuard peers через REST API
- Собирает системные метрики (CPU, memory, disk, network)
- Собирает WireGuard метрики (peers, bandwidth)
- Предоставляет health check endpoint
- Защищен Bearer token аутентификацией

## Требования

### Система

- Ubuntu 20.04+ / Debian 11+ / любой Linux с WireGuard
- WireGuard установлен и настроен
- Node.js 20+
- Root права для управления WireGuard

### WireGuard Setup

```bash
# Install WireGuard
sudo apt update
sudo apt install wireguard

# Generate server keys
wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
chmod 600 /etc/wireguard/server_private.key

# Create WireGuard config
sudo nano /etc/wireguard/wg0.conf
```

Пример конфигурации `/etc/wireguard/wg0.conf`:

```ini
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <server_private_key>
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
```

```bash
# Enable IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Start WireGuard
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

## Установка

### Из исходников

```bash
# Clone repository
cd /opt
git clone <repository-url> vpn-agent
cd vpn-agent/agent

# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Edit configuration
nano .env

# Build
npm run build

# Start
npm start
```

### С помощью Docker

```bash
cd agent

# Build image
docker build -t vpn-agent:latest .

# Run container
docker run -d \
  --name vpn-agent \
  --net=host \
  --cap-add=NET_ADMIN \
  --cap-add=SYS_MODULE \
  -v /etc/wireguard:/etc/wireguard \
  -e BEARER_TOKEN=your-secret-token \
  -e WG_INTERFACE=wg0 \
  vpn-agent:latest
```

### Systemd Service

Создайте `/etc/systemd/system/vpn-agent.service`:

```ini
[Unit]
Description=VPN Server Agent
After=network.target wg-quick@wg0.service
Wants=wg-quick@wg0.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vpn-agent/agent
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable vpn-agent
sudo systemctl start vpn-agent
sudo systemctl status vpn-agent
```

## Конфигурация

Создайте `.env` файл на основе `.env.example`:

```env
# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# Security
BEARER_TOKEN=your-very-secure-random-token-here

# WireGuard Configuration
WG_INTERFACE=wg0
WG_CONFIG_PATH=/etc/wireguard/wg0.conf
WG_PORT=51820
WG_SUBNET=10.0.0.0/24

# Logging
LOG_LEVEL=info
```

### Генерация Bearer Token

```bash
# Generate secure random token
openssl rand -base64 32
```

Этот токен нужно:
1. Сохранить в `.env` файле агента
2. Сохранить в БД основного приложения в поле `vpn_servers.agent_bearer_token`

## API Endpoints

### Health Check

**GET /health**

Проверка здоровья сервера (без аутентификации).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1737892800000,
  "uptime": 3600,
  "wireguard": {
    "running": true,
    "interface": "wg0"
  },
  "system": {
    "cpuUsage": 15.5,
    "memoryUsage": 45.2,
    "diskUsage": 60
  }
}
```

### Peers Management

Все endpoints требуют Bearer token аутентификации:
```
Authorization: Bearer <your-token>
```

**POST /peers**

Добавить новый peer.

Request:
```json
{
  "publicKey": "peer_public_key_here",
  "presharedKey": "optional_preshared_key",
  "allowedIPs": ["10.0.0.2/32"]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "publicKey": "peer_public_key_here",
    "allowedIPs": ["10.0.0.2/32"],
    "message": "Peer added successfully"
  }
}
```

**DELETE /peers/:publicKey**

Удалить peer.

Response:
```json
{
  "success": true,
  "data": {
    "publicKey": "peer_public_key_here",
    "message": "Peer removed successfully"
  }
}
```

**GET /peers/:publicKey**

Получить статус peer.

Response:
```json
{
  "success": true,
  "data": {
    "publicKey": "peer_public_key_here",
    "endpoint": "192.168.1.100:54321",
    "latestHandshake": 1737892800,
    "transferRx": 1048576,
    "transferTx": 524288,
    "allowedIPs": ["10.0.0.2/32"]
  }
}
```

**GET /peers**

Получить список всех peers.

Response:
```json
{
  "success": true,
  "data": {
    "peers": [
      {
        "publicKey": "peer1_public_key",
        "endpoint": "192.168.1.100:54321",
        "latestHandshake": 1737892800,
        "transferRx": 1048576,
        "transferTx": 524288,
        "allowedIPs": ["10.0.0.2/32"]
      }
    ],
    "count": 1
  }
}
```

### Metrics

**GET /metrics**

Получить метрики сервера (требуется аутентификация).

Response:
```json
{
  "success": true,
  "data": {
    "cpuUsage": 15.5,
    "memoryUsage": 45.2,
    "diskUsage": 60,
    "networkStats": {
      "bytesReceived": 1073741824,
      "bytesSent": 536870912
    },
    "wireguard": {
      "activePeers": 5,
      "totalPeers": 10,
      "peers": [...]
    }
  }
}
```

## Развертывание

### Docker Compose

Пример `docker-compose.yml`:

```yaml
version: '3.8'

services:
  vpn-agent:
    build: .
    container_name: vpn-agent
    network_mode: host
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    volumes:
      - /etc/wireguard:/etc/wireguard
    environment:
      - PORT=3001
      - NODE_ENV=production
      - BEARER_TOKEN=${BEARER_TOKEN}
      - WG_INTERFACE=wg0
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Мониторинг

Рекомендуется настроить мониторинг:

1. **Logs**:
```bash
# Systemd logs
sudo journalctl -u vpn-agent -f

# Docker logs
docker logs -f vpn-agent
```

2. **Health Check**:
```bash
# Проверка здоровья
curl http://localhost:3001/health

# С красивым форматированием
curl -s http://localhost:3001/health | jq
```

3. **Metrics Collection**:
Основное приложение должно периодически запрашивать `/metrics` endpoint и сохранять в БД.

## Безопасность

### Firewall

Откройте только необходимые порты:

```bash
# Allow WireGuard
sudo ufw allow 51820/udp

# Allow Agent API только с IP основного сервера
sudo ufw allow from <main-server-ip> to any port 3001

# Enable firewall
sudo ufw enable
```

### Bearer Token

- Используйте длинные случайные токены (32+ символа)
- Никогда не коммитьте токены в git
- Регулярно меняйте токены
- Храните токены в переменных окружения

### Permissions

Agent должен запускаться с root правами для управления WireGuard:

```bash
# В production используйте systemd с User=root
# Docker контейнер должен иметь CAP_NET_ADMIN
```

### HTTPS

В production рекомендуется использовать reverse proxy (nginx) с HTTPS:

```nginx
server {
    listen 443 ssl http2;
    server_name vpn-server-1.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Интеграция с основным приложением

Основное Next.js приложение взаимодействует с агентом через REST API:

```typescript
// Пример из vpn.service.ts основного приложения
async function createPeerOnServer(serverId: string, config: VpnConfig) {
  const server = await prisma.vpnServer.findUnique({
    where: { id: serverId }
  });

  const response = await fetch(`${server.agentApiUrl}/peers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${server.agentBearerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      publicKey: config.publicKey,
      presharedKey: config.presharedKey,
      allowedIPs: [config.ipAddress]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create peer on server');
  }

  return await response.json();
}
```

## Troubleshooting

### WireGuard не запускается

```bash
# Check WireGuard status
sudo wg show

# Check interface
ip addr show wg0

# Restart WireGuard
sudo wg-quick down wg0
sudo wg-quick up wg0
```

### Agent не может добавить peer

```bash
# Check permissions
ls -la /etc/wireguard/

# Check logs
journalctl -u vpn-agent -n 50

# Test manually
sudo wg set wg0 peer <public_key> allowed-ips 10.0.0.2/32
```

### Health check fails

```bash
# Check if agent is running
curl http://localhost:3001/health

# Check WireGuard
sudo wg show wg0

# Check system resources
df -h
free -m
top
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Build
npm run build
```

## License

MIT

---

**Version:** 1.0.0

**Last Updated:** 2025-01-26
