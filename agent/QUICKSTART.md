# 🚀 VPN Agent - Quick Start Guide

Три способа развертывания Agent на VPN сервере - от самого простого к продвинутому.

---

## ⚡ Вариант 1: One-Line Install (Рекомендуется!)

**Самый простой способ** - запустить одну команду и всё готово!

```bash
curl -fsSL https://raw.githubusercontent.com/sanekvery/very_privat_nota/master/agent/setup.sh | sudo bash
```

### Что делает скрипт:
1. ✅ Устанавливает WireGuard
2. ✅ Настраивает WireGuard (генерирует ключи, создает конфиг)
3. ✅ Устанавливает Node.js 20
4. ✅ Клонирует и собирает Agent
5. ✅ Создает systemd service
6. ✅ Настраивает firewall
7. ✅ Выводит данные для регистрации в админке

### После установки:

Скрипт выведет:
```
========================================================================
✓ VPN Agent Installation Complete!
========================================================================

Registration Information (Add to Admin Panel):

Server Name:        your-hostname
Location:           [Your Location]
Country:            [Country Code]
Public IP:          1.2.3.4
Agent API URL:      http://1.2.3.4:3001
Bearer Token:       abc123...xyz
Server Public Key:  def456...uvw
Max Users:          1000

========================================================================
```

**Копируешь эти данные и вставляешь в админку!**

Или используешь готовый SQL запрос который тоже выведет скрипт.

---

## 🐳 Вариант 2: Docker (Еще проще!)

Если хочешь использовать Docker (меньше зависимостей):

```bash
curl -fsSL https://raw.githubusercontent.com/sanekvery/very_privat_nota/master/agent/setup-docker.sh | sudo bash
```

### Преимущества Docker:
- Изолированное окружение
- Легче обновлять (просто restart контейнера)
- Меньше конфликтов с системными пакетами

### Docker команды:

```bash
# Посмотреть логи
docker logs -f vpn-agent

# Перезапустить
docker restart vpn-agent

# Остановить
docker stop vpn-agent

# Запустить снова
docker start vpn-agent

# Обновить Agent
docker pull ghcr.io/sanekvery/vpn-agent:latest
docker restart vpn-agent
```

---

## 🔧 Вариант 3: Ручная установка

Если хочешь контроль над каждым шагом:

### 1. Установить WireGuard

```bash
sudo apt update
sudo apt install -y wireguard

# Генерация ключей
wg genkey | sudo tee /etc/wireguard/server_private.key | wg pubkey | sudo tee /etc/wireguard/server_public.key
sudo chmod 600 /etc/wireguard/server_private.key

# Создать конфиг
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
# Включить IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Запустить WireGuard
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

### 2. Установить Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Установить Agent

```bash
cd /opt
sudo git clone https://github.com/sanekvery/very_privat_nota.git vpn-agent
cd vpn-agent/agent

# Install dependencies
sudo npm ci --only=production

# Build
sudo npm run build
```

### 4. Настроить Agent

```bash
sudo cp .env.example .env
sudo nano .env
```

Установи:
```env
PORT=3001
NODE_ENV=production
BEARER_TOKEN=<generate with: openssl rand -base64 32>
WG_INTERFACE=wg0
WG_CONFIG_PATH=/etc/wireguard/wg0.conf
LOG_LEVEL=info
```

### 5. Создать systemd service

```bash
sudo nano /etc/systemd/system/vpn-agent.service
```

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
ExecStart=/usr/bin/node /opt/vpn-agent/agent/dist/index.js
Restart=always
RestartSec=10

StandardOutput=append:/var/log/vpn-agent.log
StandardError=append:/var/log/vpn-agent-error.log

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable vpn-agent
sudo systemctl start vpn-agent
sudo systemctl status vpn-agent
```

### 6. Firewall

```bash
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 51820/udp    # WireGuard
sudo ufw allow 3001/tcp     # Agent API (временно)
sudo ufw enable
```

### 7. Получить данные для регистрации

```bash
# Public IP
curl https://api.ipify.org

# Bearer Token
cat /opt/vpn-agent/agent/.env | grep BEARER_TOKEN

# Server Public Key
sudo cat /etc/wireguard/server_public.key
```

---

## 📝 Регистрация сервера в админке

После установки любым способом нужно добавить сервер в систему.

### Способ 1: Через админ панель (скоро будет UI)

1. Открыть админку: `https://your-main-app.com/admin/servers`
2. Нажать "Add Server"
3. Вставить данные из установки
4. Сохранить

### Способ 2: Через SQL

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
  'US-NY-01',                    -- Название сервера
  'New York',                    -- Локация
  'US',                          -- Код страны
  '1.2.3.4',                     -- Public IP
  'http://1.2.3.4:3001',         -- Agent API URL
  'abc123...xyz',                -- Bearer Token
  'def456...uvw',                -- Server Public Key
  1000,                          -- Max users
  true,                          -- Is active
  'active'                       -- Status
);
```

### Способ 3: Через API (автоматическая регистрация)

```bash
# From VPN server
curl -X POST https://your-main-app.com/api/admin/servers \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "US-NY-01",
    "location": "New York",
    "country": "US",
    "publicIp": "1.2.3.4",
    "agentApiUrl": "http://1.2.3.4:3001",
    "agentBearerToken": "abc123...xyz",
    "serverPublicKey": "def456...uvw",
    "maxUsers": 1000
  }'
```

---

## ✅ Проверка работы

### 1. Health Check

```bash
curl http://localhost:3001/health
```

Должно вернуть:
```json
{
  "status": "healthy",
  "timestamp": 1706281200000,
  "uptime": 3600,
  "wireguard": {
    "running": true,
    "interface": "wg0"
  }
}
```

### 2. WireGuard Status

```bash
sudo wg show
```

Должно показать интерфейс wg0.

### 3. Agent Logs

```bash
# Systemd
sudo journalctl -u vpn-agent -f

# Docker
docker logs -f vpn-agent

# File
sudo tail -f /var/log/vpn-agent.log
```

### 4. Test from Main Server

С основного сервера проверить:

```bash
curl -H "Authorization: Bearer <BEARER_TOKEN>" http://VPN_SERVER_IP:3001/health
```

---

## 🔒 Безопасность после установки

### 1. Ограничить доступ к Agent API

После добавления сервера в систему, ограничь доступ к API:

```bash
# Разрешить только с main server
sudo ufw allow from <MAIN_SERVER_IP> to any port 3001

# Удалить общее правило
sudo ufw delete allow 3001/tcp

# Проверить
sudo ufw status
```

### 2. Регулярные обновления

```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Agent updates (systemd)
cd /opt/vpn-agent/agent
sudo git pull
sudo npm ci --only=production
sudo npm run build
sudo systemctl restart vpn-agent

# Agent updates (Docker)
docker pull ghcr.io/sanekvery/vpn-agent:latest
docker restart vpn-agent
```

---

## 🐛 Troubleshooting

### Agent не запускается

```bash
# Check logs
sudo journalctl -u vpn-agent -n 50

# Check if port is in use
sudo lsof -i :3001

# Restart
sudo systemctl restart vpn-agent
```

### WireGuard не работает

```bash
# Check status
sudo wg show

# Restart
sudo wg-quick down wg0
sudo wg-quick up wg0

# Check IP forwarding
sysctl net.ipv4.ip_forward
```

### Agent не может добавить peer

```bash
# Check permissions
sudo ls -la /etc/wireguard/

# Check WireGuard config
sudo cat /etc/wireguard/wg0.conf

# Test manually
sudo wg set wg0 peer <PUBLIC_KEY> allowed-ips 10.0.0.2/32
```

### Firewall блокирует

```bash
# Check firewall
sudo ufw status verbose

# Temporarily disable for testing
sudo ufw disable

# Re-enable after fixing
sudo ufw enable
```

---

## 📊 Мониторинг

### Metrics endpoint

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3001/metrics
```

Возвращает:
- CPU usage
- Memory usage
- Disk usage
- Network stats
- WireGuard peers info

### Automated monitoring

Основное приложение автоматически проверяет:
- Health checks каждые 5 минут
- Metrics collection каждые 5 минут
- Capacity check перед добавлением пользователей

---

## 🔄 Массовое развертывание

Для развертывания на нескольких серверах одновременно:

### Вариант 1: Bash loop

```bash
# servers.txt содержит IP адреса серверов
for server in $(cat servers.txt); do
  echo "Installing on $server..."
  ssh root@$server 'curl -fsSL https://raw.githubusercontent.com/sanekvery/very_privat_nota/master/agent/setup.sh | bash'
done
```

### Вариант 2: Ansible (advanced)

```yaml
# playbook.yml
- hosts: vpn_servers
  become: yes
  tasks:
    - name: Download and run setup script
      shell: curl -fsSL https://raw.githubusercontent.com/sanekvery/very_privat_nota/master/agent/setup.sh | bash
```

```bash
ansible-playbook -i inventory playbook.yml
```

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверь [Troubleshooting](#troubleshooting)
2. Посмотри полную документацию: `agent/README.md`
3. Проверь GitHub Issues
4. Обратись в поддержку

---

**Готово! 🎉**

После установки Agent и добавления в систему, сервер автоматически начнет принимать пользователей согласно load balancing алгоритму основного приложения.
