# 🤖 Telegram Bot + Mini App - Полная инструкция

## 📅 Дата: 27 января 2026

---

## ⚠️ ВАЖНО: Проблема с URL

**Telegram Mini Apps требуют HTTPS!**

Сейчас приложение доступно по HTTP:
- ❌ `http://176.109.111.245:8080` - НЕ РАБОТАЕТ для Mini App
- ✅ Нужен `https://your-domain.com` - РАБОТАЕТ

### 🎯 Два решения:

---

## 📋 Решение 1: Купить домен + SSL (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Купить домен
- Reg.ru, Namecheap, Cloudflare - любой регистратор
- Пример: `vpn-premium.com`
- Стоимость: ~$10/год

### Шаг 2: Настроить DNS
В настройках домена добавить A-запись:
```
Type: A
Name: @
Value: 176.109.111.245
TTL: 3600
```

Для поддомена (опционально):
```
Type: A
Name: app
Value: 176.109.111.245
```

Результат:
- `vpn-premium.com` → 176.109.111.245
- `app.vpn-premium.com` → 176.109.111.245

### Шаг 3: Получить SSL сертификат

#### Вариант A: Let's Encrypt (БЕСПЛАТНО)

На сервере выполнить:

```bash
# Установить Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Получить сертификат (замени vpn-premium.com на свой домен)
certbot --nginx -d vpn-premium.com -d www.vpn-premium.com

# Сертификат автоматически настроится в Nginx
```

#### Вариант B: Cloudflare SSL (БЕСПЛАТНО + CDN)

1. Перенести DNS на Cloudflare
2. В панели Cloudflare: SSL/TLS → Full (strict)
3. Cloudflare автоматически выдаст SSL

### Шаг 4: Обновить Nginx конфиг

Файл: `docker/nginx/nginx.conf`

```nginx
server {
    listen 80;
    server_name vpn-premium.com www.vpn-premium.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vpn-premium.com www.vpn-premium.com;

    ssl_certificate /etc/letsencrypt/live/vpn-premium.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vpn-premium.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Перезапустить Docker:
```bash
docker compose -f docker/docker-compose.yml restart nginx
```

### Шаг 5: Проверить HTTPS
Открыть в браузере: `https://vpn-premium.com`

Должно работать ✅

---

## 📋 Решение 2: Cloudflare Tunnel (БЕЗ ДОМЕНА, БЕСПЛАТНО)

Cloudflare дает бесплатный HTTPS туннель даже без домена.

### Шаг 1: Установить Cloudflared

На сервере:

```bash
# Скачать cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Авторизоваться
cloudflared tunnel login
```

Откроется браузер → войти в Cloudflare → выбрать домен (или создать бесплатный)

### Шаг 2: Создать туннель

```bash
# Создать туннель
cloudflared tunnel create vpn-miniapp

# Появится UUID туннеля, например: abc123-def456-ghi789

# Настроить конфиг
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Вставить:
```yaml
tunnel: abc123-def456-ghi789
credentials-file: /root/.cloudflared/abc123-def456-ghi789.json

ingress:
  - hostname: vpn-miniapp.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404
```

### Шаг 3: Запустить туннель

```bash
# Запустить как сервис
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared

# Проверить статус
systemctl status cloudflared
```

### Шаг 4: Получить URL

Cloudflare автоматически создаст URL вида:
- `https://vpn-miniapp.yourdomain.com`

ИЛИ бесплатный поддомен:
- `https://abc123-def456.trycloudflare.com`

---

## 🤖 Настройка Telegram Bot

### Шаг 1: Создать бота через @BotFather

1. Открыть Telegram → найти `@BotFather`
2. Отправить команду: `/newbot`
3. Ввести имя бота: `VPN Premium Bot`
4. Ввести username: `vpn_premium_bot` (должен заканчиваться на `_bot`)
5. Получить **BOT TOKEN**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

**СОХРАНИ TOKEN!** Он нужен для `.env`

### Шаг 2: Настроить Mini App

Отправить @BotFather команды:

#### 1) Установить описание:
```
/setdescription

Безопасный и быстрый VPN сервис. Подключайся к серверам в 8 странах. WireGuard шифрование. Без логов. 24/7 поддержка.
```

#### 2) Установить аватар (опционально):
```
/setuserpic

# Загрузить картинку с логотипом VPN
```

#### 3) **ГЛАВНОЕ**: Создать Mini App
```
/newapp

# @BotFather спросит: Select a bot
Выбрать: @vpn_premium_bot

# Title
VPN Premium

# Description
Быстрый и безопасный VPN через Telegram

# Photo (512x512 PNG)
Загрузить иконку

# Web App URL (ЗДЕСЬ ВАЖНО!)
https://vpn-premium.com
```

⚠️ **ВАЖНО**: URL должен быть HTTPS! Иначе Mini App не откроется.

#### 4) Получить Web App URL

После создания Mini App получишь short name, например: `vpnapp`

Полная ссылка для запуска:
```
https://t.me/vpn_premium_bot/vpnapp
```

### Шаг 3: Настроить команды бота

```
/setcommands

start - Запустить VPN Mini App
help - Помощь и поддержка
plans - Тарифы и цены
support - Связаться с поддержкой
```

### Шаг 4: Добавить переменные в .env

В файле `docker/.env.example` (скопировать в `.env`):

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_MINI_APP_URL=https://vpn-premium.com
TELEGRAM_WEBHOOK_URL=https://vpn-premium.com/api/telegram/webhook

# JWT для авторизации
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### Шаг 5: Перезапустить Docker

```bash
cd /root/very_privat_nota

# Пересоздать .env
cp docker/.env.example docker/.env
nano docker/.env  # Вставить реальные значения

# Перезапустить
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml up -d
```

---

## 📱 Тестирование Mini App

### Вариант 1: Через бота

1. Открыть Telegram
2. Найти своего бота: `@vpn_premium_bot`
3. Отправить `/start`
4. Нажать кнопку "Открыть VPN Premium"
5. Откроется Mini App внутри Telegram

### Вариант 2: Прямая ссылка

Открыть в Telegram:
```
https://t.me/vpn_premium_bot/vpnapp
```

### Вариант 3: Inline button в сообщении

Bot будет отправлять сообщение с кнопкой:

```
Добро пожаловать в VPN Premium!

[Открыть приложение 🚀]  <- Mini App button
```

---

## 🔧 Что уже работает в коде

В файле `/src/app/api/auth/telegram/route.ts` уже реализовано:

1. ✅ Проверка Telegram InitData
2. ✅ Создание/вход пользователя
3. ✅ Генерация JWT токена
4. ✅ Сохранение в базу данных

В файле `/src/app/auth/page.tsx`:

1. ❌ Пока mock - alert
2. ✅ После настройки бота интегрируется автоматически

---

## 🎯 Полный чек-лист

### До запуска Mini App:

- [ ] Купить домен ИЛИ настроить Cloudflare Tunnel
- [ ] Получить SSL сертификат (Let's Encrypt)
- [ ] Обновить Nginx конфиг для HTTPS
- [ ] Создать Telegram Bot через @BotFather
- [ ] Создать Mini App через @BotFather
- [ ] Добавить `TELEGRAM_BOT_TOKEN` в `.env`
- [ ] Перезапустить Docker контейнеры
- [ ] Открыть https://your-domain.com в браузере
- [ ] Проверить что API работает
- [ ] Открыть Mini App в Telegram

### Для админки:

Админка доступна по обычному HTTPS (не через Mini App):
```
https://vpn-premium.com/admin
```

Можно тестировать прямо в браузере на компьютере.

---

## 🌐 Текущее состояние (27 января)

**Что работает:**
- ✅ API на http://176.109.111.245:8080
- ✅ База данных PostgreSQL
- ✅ Redis
- ✅ Все 13 backend модулей

**Что НЕ работает:**
- ❌ HTTPS (нужен домен + SSL)
- ❌ Telegram Bot (не настроен)
- ❌ Mini App (требует HTTPS)

**После настройки HTTPS все заработает!**

---

## 💡 Рекомендации

### Для тестирования (быстро):
1. Cloudflare Tunnel (10 минут, бесплатно)
2. Создать бота + Mini App
3. Тестировать в Telegram

### Для production:
1. Купить нормальный домен (~$10/год)
2. Let's Encrypt SSL (бесплатно)
3. Cloudflare для CDN (опционально, бесплатно)

---

## 📞 Поддержка

Если что-то не работает:

1. Проверить логи Docker: `docker compose logs app`
2. Проверить HTTPS: `curl -I https://your-domain.com`
3. Проверить Telegram webhook: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

---

**Автор:** Claude Code
**Последнее обновление:** 27 января 2026
