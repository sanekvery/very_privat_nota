# 🚀 Deployment Guide - Telegram VPN Mini App

Подробное руководство по развертыванию приложения в production.

## 📋 Содержание

- [Требования](#требования)
- [Архитектура Deployment](#архитектура-deployment)
- [Подготовка сервера](#подготовка-сервера)
- [Вариант 1: Docker Compose](#вариант-1-docker-compose)
- [Вариант 2: Systemd Services](#вариант-2-systemd-services)
- [Настройка Telegram Bot](#настройка-telegram-bot)
- [Настройка TON Payments](#настройка-ton-payments)
- [Развертывание Agent на VPN серверах](#развертывание-agent-на-vpn-серверах)
- [SSL/TLS сертификаты](#ssltls-сертификаты)
- [Мониторинг](#мониторинг)
- [Backup](#backup)
- [Troubleshooting](#troubleshooting)

---

## Требования

### Основной сервер (Main Application)

**Минимальные требования:**
- Ubuntu 22.04 LTS / Debian 12
- 2 CPU cores
- 4 GB RAM
- 40 GB SSD
- Public IP address
- Domain name (для SSL)

**Рекомендуемые:**
- 4 CPU cores
- 8 GB RAM
- 100 GB SSD
- Backup storage

### VPN серверы (Agent)

**На каждый VPN сервер:**
- Ubuntu 22.04 LTS
- 1 CPU core (minimum)
- 1 GB RAM
- 20 GB SSD
- WireGuard support
- Public IP address

### Программное обеспечение

```bash
- Node.js 20 LTS
- PostgreSQL 16
- Redis 7
- Docker & Docker Compose (опционально)
- Nginx (для reverse proxy)
- Certbot (для SSL)
```

---

## Архитектура Deployment

```
┌─────────────────────────────────────────────────────────┐
│                    Internet / Users                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ├─ HTTPS (443)
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Nginx Reverse Proxy                     │
│              (SSL/TLS Termination)                       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            Next.js Application (Port 3000)               │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  13 Backend Modules + API Routes                 │  │
│  └──────────────────────────────────────────────────┘  │
└──────┬──────────────────────────┬─────────────────────┘
       │                          │
       │                          │
┌──────▼─────────┐        ┌──────▼──────────┐
│  PostgreSQL 16 │        │    Redis 7      │
│  (Port 5432)   │        │  (Port 6379)    │
└────────────────┘        └─────────────────┘
       │
       │ HTTP API calls
       │
┌──────▼─────────────────────────────────────────────────┐
│             VPN Servers (1...N)                         │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │  Agent Application (Port 3001)                  │   │
│  │  - WireGuard Management                         │   │
│  │  - Metrics Collection                           │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │  WireGuard (Port 51820 UDP)                     │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Подготовка сервера

### 1. Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git
```

### 2. Установка Node.js 20

```bash
# Используем NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка
node --version  # должно быть v20.x
npm --version
```

### 3. Установка PostgreSQL 16

```bash
# Add PostgreSQL repo
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# Start и enable
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создать пользователя и базу
sudo -u postgres psql <<EOF
CREATE USER vpn_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE vpn_db OWNER vpn_user;
GRANT ALL PRIVILEGES ON DATABASE vpn_db TO vpn_user;
\q
EOF
```

### 4. Установка Redis

```bash
sudo apt install -y redis-server

# Настроить пароль
sudo nano /etc/redis/redis.conf
# Найти и раскомментировать:
# requirepass your_redis_password

sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Проверка
redis-cli ping
# PONG
```

### 5. Установка Nginx

```bash
sudo apt install -y nginx

# Start и enable
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Вариант 1: Docker Compose

### Установка Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### Deployment с Docker

```bash
# 1. Clone repository
git clone https://github.com/sanekvery/very_privat_nota.git
cd very_privat_nota

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env (IMPORTANT!)
nano .env
# Set all required values:
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET
# - TELEGRAM_BOT_TOKEN
# - TON_MERCHANT_WALLET
# etc.

# 4. Create docker/.env for PostgreSQL
cd docker
cp .env.example .env
nano .env
# Set POSTGRES_PASSWORD

# 5. Run services
docker compose up -d

# 6. Check logs
docker compose logs -f app

# 7. Run migrations
docker compose exec app npx prisma migrate deploy

# 8. Generate Prisma Client
docker compose exec app npx prisma generate

# 9. (Optional) Seed database
docker compose exec app npx tsx prisma/seed.ts
```

### Docker Production Configuration

Создайте `docker/docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      # ... other env vars from .env
    depends_on:
      - postgres
      - redis
    networks:
      - vpn-network
    volumes:
      - ../logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - vpn-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - vpn-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ../public:/usr/share/nginx/html:ro
    depends_on:
      - app
    networks:
      - vpn-network

volumes:
  postgres-data:
  redis-data:

networks:
  vpn-network:
    driver: bridge
```

---

## Вариант 2: Systemd Services

### 1. Клонирование и установка

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/sanekvery/very_privat_nota.git vpn-app
cd vpn-app

# Install dependencies
sudo npm ci --only=production

# Build
sudo npm run build
```

### 2. Настройка environment

```bash
sudo cp .env.example .env
sudo nano .env
# Set all required values
```

### 3. Database setup

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Seed (optional)
npx tsx prisma/seed.ts
```

### 4. Создание systemd service

Создайте `/etc/systemd/system/vpn-app.service`:

```ini
[Unit]
Description=Telegram VPN Mini App
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/vpn-app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/vpn-app/.next/standalone/server.js
Restart=always
RestartSec=10

# Logging
StandardOutput=append:/var/log/vpn-app/output.log
StandardError=append:/var/log/vpn-app/error.log

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/vpn-app/logs

[Install]
WantedBy=multi-user.target
```

```bash
# Create log directory
sudo mkdir -p /var/log/vpn-app
sudo chown www-data:www-data /var/log/vpn-app

# Change ownership
sudo chown -R www-data:www-data /opt/vpn-app

# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start vpn-app
sudo systemctl enable vpn-app

# Check status
sudo systemctl status vpn-app

# View logs
sudo journalctl -u vpn-app -f
```

---

## Настройка Telegram Bot

### 1. Создание бота

1. Открыть [@BotFather](https://t.me/BotFather) в Telegram
2. Отправить `/newbot`
3. Следовать инструкциям
4. Сохранить **Bot Token**

### 2. Настройка Mini App

```
/newapp - create new Mini App
/myapps - manage existing apps
```

1. Выбрать бота
2. Создать Mini App
3. Название: "VPN Access"
4. Описание: "Manage your VPN subscriptions"
5. Upload icon (512x512 PNG)
6. Web App URL: `https://your-domain.com`

### 3. Настройка команд бота

```
/setcommands
```

Установить команды:
```
start - Start the bot and open Mini App
help - Get help
support - Contact support
```

### 4. Настройка Webhook (опционально)

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

---

## Настройка TON Payments

### 1. Создание TON кошелька

Используйте [Tonkeeper](https://tonkeeper.com/) или [TON Wallet](https://wallet.ton.org/):

1. Создать кошелек
2. Сохранить seed phrase (24 слова)
3. Скопировать адрес кошелька
4. Вставить в `.env` → `TON_MERCHANT_WALLET`

### 2. Получение TON API Key

1. Зарегистрироваться на [TON Center](https://toncenter.com/)
2. Получить API key
3. Вставить в `.env` → `TON_API_KEY`

### 3. Настройка TON Connect

В Mini App добавить:

```typescript
// Configure TON Connect
import { TonConnectUI } from '@tonconnect/ui-react';

const tonConnectUI = new TonConnectUI({
  manifestUrl: 'https://your-domain.com/tonconnect-manifest.json',
});
```

Создать `public/tonconnect-manifest.json`:

```json
{
  "url": "https://your-domain.com",
  "name": "VPN Access",
  "iconUrl": "https://your-domain.com/icon-512.png"
}
```

---

## Развертывание Agent на VPN серверах

### Для каждого VPN сервера:

#### 1. Установка WireGuard

```bash
sudo apt update
sudo apt install -y wireguard

# Generate server keys
wg genkey | sudo tee /etc/wireguard/server_private.key | wg pubkey | sudo tee /etc/wireguard/server_public.key
sudo chmod 600 /etc/wireguard/server_private.key

# Configure WireGuard
sudo nano /etc/wireguard/wg0.conf
```

`/etc/wireguard/wg0.conf`:
```ini
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <paste server_private.key content>
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

#### 2. Установка Agent

```bash
cd /opt
sudo git clone https://github.com/sanekvery/very_privat_nota.git vpn-agent
cd vpn-agent/agent

# Install dependencies
sudo npm ci --only=production

# Configure
sudo cp .env.example .env
sudo nano .env
```

`.env` для Agent:
```env
PORT=3001
NODE_ENV=production
BEARER_TOKEN=<generate with: openssl rand -base64 32>
WG_INTERFACE=wg0
WG_CONFIG_PATH=/etc/wireguard/wg0.conf
LOG_LEVEL=info
```

```bash
# Build
sudo npm run build
```

#### 3. Systemd service для Agent

`/etc/systemd/system/vpn-agent.service`:

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

StandardOutput=append:/var/log/vpn-agent.log
StandardError=append:/var/log/vpn-agent-error.log

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start vpn-agent
sudo systemctl enable vpn-agent
sudo systemctl status vpn-agent
```

#### 4. Firewall

```bash
# Allow WireGuard
sudo ufw allow 51820/udp

# Allow Agent API только с main server IP
sudo ufw allow from <MAIN_SERVER_IP> to any port 3001

sudo ufw enable
```

#### 5. Добавление сервера в БД

В main application выполнить SQL:

```sql
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
  'US-NY-01',
  'New York',
  'US',
  '1.2.3.4',
  'http://1.2.3.4:3001',
  '<paste BEARER_TOKEN from agent .env>',
  '<paste content of server_public.key>',
  1000,
  true,
  'active'
);
```

---

## SSL/TLS сертификаты

### Используя Let's Encrypt + Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Nginx конфигурация

`/etc/nginx/sites-available/vpn-app`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (если используются)
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/vpn-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Мониторинг

### 1. Application logs

```bash
# Systemd service logs
sudo journalctl -u vpn-app -f

# Application logs
tail -f /opt/vpn-app/logs/*.log

# Docker logs
docker compose logs -f app
```

### 2. Database monitoring

```bash
# Connect to PostgreSQL
sudo -u postgres psql vpn_db

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('vpn_db'));
```

### 3. Redis monitoring

```bash
redis-cli -a your_redis_password

# Info
INFO

# Memory usage
INFO memory

# Keys count
DBSIZE
```

### 4. Health checks

```bash
# Application health
curl https://your-domain.com/api/monitoring/health

# Agent health (from main server)
curl -H "Authorization: Bearer <token>" http://vpn-server-ip:3001/health
```

### 5. Setup monitoring tools (опционально)

**Prometheus + Grafana:**

```bash
# Install Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /opt/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Install Grafana
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

---

## Backup

### 1. Database backup script

`/opt/scripts/backup-db.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/opt/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="vpn_db_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

# Create backup
sudo -u postgres pg_dump vpn_db | gzip > "$BACKUP_DIR/$FILENAME"

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup created: $FILENAME"
```

```bash
chmod +x /opt/scripts/backup-db.sh

# Setup cron (daily at 2 AM)
crontab -e
0 2 * * * /opt/scripts/backup-db.sh
```

### 2. Redis backup

Redis автоматически создает RDB snapshots в `/var/lib/redis/dump.rdb`.

Копировать в безопасное место:

```bash
# Backup script
#!/bin/bash
cp /var/lib/redis/dump.rdb /opt/backups/redis/dump_$(date +%Y%m%d).rdb
```

### 3. Application files backup

```bash
# Backup .env and logs
tar -czf /opt/backups/app_$(date +%Y%m%d).tar.gz \
  /opt/vpn-app/.env \
  /opt/vpn-app/logs
```

---

## Troubleshooting

### Application не запускается

```bash
# Check logs
sudo journalctl -u vpn-app -n 100

# Check if port is already in use
sudo lsof -i :3000

# Check environment variables
cat /opt/vpn-app/.env | grep -v '#'

# Test database connection
npx prisma db pull
```

### Database connection errors

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U vpn_user -d vpn_db

# Check logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### WireGuard issues на VPN сервере

```bash
# Check WireGuard status
sudo wg show

# Restart WireGuard
sudo wg-quick down wg0
sudo wg-quick up wg0

# Check IP forwarding
sysctl net.ipv4.ip_forward

# Test connectivity
ping 10.0.0.1
```

### Agent не отвечает

```bash
# Check Agent status
sudo systemctl status vpn-agent

# Check Agent logs
sudo journalctl -u vpn-agent -n 50

# Test Agent API
curl -H "Authorization: Bearer <token>" http://localhost:3001/health

# Check firewall
sudo ufw status
```

### High memory usage

```bash
# Check memory
free -h

# Check processes
top
htop

# PostgreSQL connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Restart services if needed
sudo systemctl restart vpn-app
sudo systemctl restart postgresql
sudo systemctl restart redis
```

---

## Проверка успешного деплоя

### Чек-лист:

- [ ] Application отвечает на https://your-domain.com
- [ ] SSL сертификат валиден
- [ ] Database migrations применены
- [ ] Redis работает и доступен
- [ ] Telegram Bot отвечает на /start
- [ ] Mini App открывается
- [ ] Можно войти через Telegram
- [ ] Agent на VPN сервере отвечает
- [ ] WireGuard запущен
- [ ] Logs пишутся корректно
- [ ] Health checks проходят
- [ ] Backup настроен

---

## Обновление приложения

```bash
# 1. Backup database
/opt/scripts/backup-db.sh

# 2. Pull latest changes
cd /opt/vpn-app
sudo git pull origin master

# 3. Install dependencies
sudo npm ci --only=production

# 4. Build
sudo npm run build

# 5. Run migrations
npx prisma migrate deploy

# 6. Restart application
sudo systemctl restart vpn-app

# 7. Check logs
sudo journalctl -u vpn-app -f
```

---

## Security Checklist

- [ ] Используются сильные пароли для PostgreSQL и Redis
- [ ] JWT secrets сгенерированы криптографически безопасно
- [ ] .env файл не коммитится в git (.gitignore)
- [ ] Firewall настроен (только необходимые порты открыты)
- [ ] SSL/TLS сертификат установлен
- [ ] SSH доступ только по ключам (отключен пароль)
- [ ] Fail2ban установлен для защиты от brute-force
- [ ] Regular security updates (unattended-upgrades)
- [ ] Backup стратегия настроена
- [ ] Monitoring и alerting работает

---

## Контакты и поддержка

При возникновении проблем:

1. Проверить логи (см. Troubleshooting)
2. Проверить GitHub Issues
3. Обратиться в поддержку

---

**Документация обновлена:** 2025-01-26

**Версия:** 1.0.0
