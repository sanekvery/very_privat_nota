# AUTH Module

## Описание

Модуль аутентификации для Telegram VPN Mini App. Поддерживает два типа входа:
- **Telegram WebApp** - для обычных пользователей через Telegram
- **Admin Login** - для администраторов (временный механизм)

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js)                      │
│  POST /api/auth/telegram  │  POST /api/auth/admin          │
│  GET  /api/auth/me        │  POST /api/auth/logout         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ AuthService  │  │TelegramService│ │SessionService│     │
│  │              │  │               │  │              │     │
│  │ • Login      │  │ • Validate    │  │ • Create     │     │
│  │ • Validate   │  │   initData    │  │ • Get        │     │
│  │ • Logout     │  │ • Parse user  │  │ • Delete     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                       │
│         Prisma (PostgreSQL)    │    Redis (Sessions)       │
└─────────────────────────────────────────────────────────────┘
```

## Компоненты

### 1. TelegramService (`telegram.service.ts`)

**Ответственность:** Валидация данных от Telegram WebApp

**Критичный момент:** HMAC SHA-256 проверка подлинности `initData`

```typescript
// Telegram передает данные в формате:
// auth_date=xxx&hash=yyy&query_id=zzz&user={"id":123,...}

// Алгоритм проверки:
// 1. Извлечь hash
// 2. Создать data_check_string (отсортированные параметры без hash)
// 3. secret_key = HMAC-SHA256("WebAppData", BOT_TOKEN)
// 4. calculated_hash = HMAC-SHA256(data_check_string, secret_key)
// 5. Сравнить calculated_hash === hash
```

**Методы:**
- `validateInitData(initData: string)` - валидация и парсинг
- Возвращает объект `TelegramUser` или бросает `UnauthorizedError`

**Ошибки:**
- `UnauthorizedError` - невалидный hash или истекший auth_date
- `ValidationError` - некорректный формат данных

### 2. SessionService (`session.service.ts`)

**Ответственность:** Управление сессиями в Redis

**TTL:** 30 дней (`SESSION_TTL = 30 * 24 * 60 * 60`)

**Формат ключа:** `session:{token}`

**Структура данных:**
```typescript
interface SessionData {
  userId: string;
  isAdmin: boolean;
  telegramId?: bigint;
  createdAt: Date;
  expiresAt: Date;
}
```

**Методы:**
- `createSession(userId, isAdmin, telegramId?)` → `{ token, expiresAt }`
- `getSession(token)` → `SessionData | null`
- `deleteSession(token)` → `void`

**Критичный момент:** Токены генерируются через `crypto.randomUUID()` (безопасный генератор)

### 3. AuthService (`auth.service.ts`)

**Ответственность:** Главная бизнес-логика аутентификации

**Поток аутентификации через Telegram:**

```
┌─────────────┐
│ Telegram    │
│ WebApp      │
│ initData    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ 1. Validate initData (HMAC SHA-256)     │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ 2. Parse TelegramUser                   │
│    { id, username, first_name, ... }    │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ 3. Find or Create User in DB            │
│    • Создать если новый                 │
│    • Обновить если существует           │
│    • Генерировать referralCode          │
│    • Привязать к реферу (startParam)    │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ 4. Create Session (Redis, 30 days)      │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ 5. Return { user, sessionToken }        │
└─────────────────────────────────────────┘
```

**Реферальная система:**
- При первом входе через ссылку `?startapp=REF123` → `referredBy = REF123`
- Каждый новый пользователь получает уникальный `referralCode`
- Генерация: `randomBytes(4).toString('hex').toUpperCase()` (8 символов)

**Методы:**
- `authenticateWithTelegram(initData, startParam?)` → `AuthResult`
- `authenticateAdmin(userId)` → `AuthResult`
- `validateSession(token)` → `AuthUser`
- `logout(token)` → `void`

## API Endpoints

### POST /api/auth/telegram

**Описание:** Аутентификация через Telegram WebApp

**Request:**
```json
{
  "initData": "auth_date=1234567890&hash=abc...&user=%7B%22id%22%3A123...",
  "startParam": "REF12345678" // опционально, для реферальных ссылок
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "telegramId": "123456789",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "isAdmin": false,
      "referralCode": "A1B2C3D4"
    },
    "sessionToken": "uuid-token"
  }
}
```

**Ошибки:**
- `401 Unauthorized` - невалидный initData
- `400 Bad Request` - некорректный формат
- `403 Forbidden` - пользователь забанен

### POST /api/auth/admin

**Описание:** Временная админ-аутентификация (без проверок)

**⚠️ ВНИМАНИЕ:** Только для разработки! В production отключить!

**Request:**
```json
{
  "userId": "uuid-admin-user"
}
```

### GET /api/auth/me

**Описание:** Получить текущего пользователя по сессии

**Headers:**
```
Authorization: Bearer <sessionToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { /* AuthUser объект */ }
  }
}
```

### POST /api/auth/logout

**Описание:** Выход (удаление сессии)

**Headers:**
```
Authorization: Bearer <sessionToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

## Middleware

### requireAuth

**Использование:** Защита endpoint от неавторизованных запросов

```typescript
import { requireAuth } from '@/lib/auth-middleware';

export const GET = async (request: NextRequest) => {
  const user = await requireAuth(request); // бросит 401 если не авторизован
  // ... ваш код
};
```

### requireAdmin

**Использование:** Защита admin endpoint

```typescript
import { requireAdmin } from '@/lib/auth-middleware';

export const POST = async (request: NextRequest) => {
  const admin = await requireAdmin(request); // бросит 403 если не админ
  // ... ваш код
};
```

### withAuth

**Использование:** Wrapper для handler с автоматической аутентификацией

```typescript
import { withAuth } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-response';

export const GET = apiHandler(
  withAuth(async (request: NextRequest, user: AuthUser) => {
    // user уже валиден, не нужно проверять
    return createSuccessResponse({ userId: user.id });
  })
);
```

## Безопасность

### 1. HMAC Validation
- **Алгоритм:** SHA-256
- **Секрет:** BOT_TOKEN (из переменной окружения)
- **Защита:** Невозможно подделать initData без знания BOT_TOKEN

### 2. Session Tokens
- **Генерация:** `crypto.randomUUID()` (cryptographically secure)
- **Хранение:** Redis с TTL 30 дней
- **Передача:** Authorization header (не в cookies для безопасности)

### 3. XSS Protection
- Все данные от пользователя валидируются через Zod
- Никакой HTML не возвращается (только JSON)

### 4. Rate Limiting
**TODO:** Добавить rate limiting для auth endpoints (например, 5 попыток в минуту)

## Troubleshooting

### Проблема: "Invalid initData hash"

**Причина:** Невалидный HMAC или истекший auth_date

**Решение:**
1. Проверить что `TELEGRAM_BOT_TOKEN` правильный в `.env`
2. Проверить что initData не старше 1 часа (3600 секунд)
3. Проверить что initData не был модифицирован (encoding/decoding)

**Дебаг:**
```typescript
// Включить логи в telegram.service.ts
logger.debug('Parsed initData params', { params });
logger.debug('Calculated hash', { calculated: calculatedHash });
logger.debug('Received hash', { received: hash });
```

### Проблема: "Session not found"

**Причина:** Redis не работает или сессия истекла

**Решение:**
1. Проверить что Redis запущен: `docker ps | grep redis`
2. Проверить подключение: `redis-cli -h localhost -p 6379 ping`
3. Проверить ключи: `redis-cli keys "session:*"`

### Проблема: User создается, но referralCode не уникален

**Причина:** Collision в randomBytes (крайне редко)

**Решение:**
- Код автоматически регенерирует при конфликте:
```typescript
// В auth.service.ts:
let referralCode = generateReferralCode();
while (await prisma.user.findUnique({ where: { referralCode } })) {
  referralCode = generateReferralCode();
}
```

## Тестирование

### Unit тесты
```bash
npm test -- src/modules/auth
```

### Интеграционные тесты

**Telegram Auth:**
```bash
curl -X POST http://localhost:3000/api/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "initData": "..."
  }'
```

**Get Current User:**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

## Environment Variables

```bash
# .env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:password@localhost:5432/db
```

## Миграции

При изменении User модели:
```bash
npx prisma db push
# или
npx prisma migrate dev --name add_user_fields
```

## Roadmap

- [ ] OAuth провайдеры (Google, Apple) для non-Telegram входа
- [ ] 2FA для админов
- [ ] Rate limiting для auth endpoints
- [ ] Session refresh mechanism
- [ ] Device tracking (multiple sessions per user)
