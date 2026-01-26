# LIB - Shared Utilities

## Описание

Базовая инфраструктура проекта - переиспользуемые утилиты, клиенты, обработка ошибок, валидация.

Все модули импортируют из `@/lib`, например:
```typescript
import { prisma, logger, createSuccessResponse } from '@/lib';
```

## Компоненты

### 1. Prisma Client (`prisma.ts`)

**Назначение:** Singleton instance Prisma ORM клиента

**Критичный момент:** В development Prisma создает новое соединение при каждом hot reload Next.js. Singleton паттерн предотвращает exhaustion пула соединений.

```typescript
import { prisma } from '@/lib/prisma';

// ✅ ПРАВИЛЬНО - используем singleton
const user = await prisma.user.findUnique({ where: { id } });

// ❌ НЕПРАВИЛЬНО - создавать новый instance
const newPrisma = new PrismaClient();
```

**Логирование:**
- **Development:** `['query', 'error', 'warn']` - все запросы в консоль
- **Production:** `['error']` - только ошибки

**Graceful Shutdown:**
```typescript
// Next.js автоматически вызывает disconnect при остановке
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
});
```

### 2. Redis Client (`redis.ts`)

**Назначение:** Singleton Redis клиент с автопереподключением

**Библиотека:** `ioredis` (не `redis` пакет!)

**Преимущества ioredis:**
- Автоматический reconnect
- Cluster support
- Better TypeScript types
- Pipeline support

**Конфигурация:**
```typescript
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  // При ошибке: retry через 50ms, 100ms, 150ms, ..., max 2000ms
});
```

**События:**
```typescript
redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', err));
redis.on('reconnecting', () => logger.warn('Redis reconnecting...'));
```

**Методы:**
```typescript
// Простые операции
await redis.set('key', 'value');
await redis.get('key');
await redis.del('key');

// С TTL
await redis.setex('session:abc', 3600, JSON.stringify(data));

// Паттерны
const keys = await redis.keys('session:*');

// Pipeline (batch операции)
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
await pipeline.exec();
```

**Graceful Shutdown:**
```typescript
process.on('SIGTERM', async () => {
  redis.disconnect();
});
```

### 3. Logger (`logger.ts`)

**Назначение:** Структурированное логирование через Winston

**Уровни:**
- `error` - ошибки, требующие внимания
- `warn` - предупреждения
- `info` - важные события (login, config created, etc.)
- `debug` - детальная информация для debugging

**Форматы:**

**Development:**
```
2024-01-25 10:30:45 [INFO]: User logged in { userId: "123", telegramId: "456" }
```

**Production:**
```json
{
  "timestamp": "2024-01-25T10:30:45.123Z",
  "level": "info",
  "message": "User logged in",
  "userId": "123",
  "telegramId": "456"
}
```

**Использование:**
```typescript
import { logger } from '@/lib/logger';

// Простое сообщение
logger.info('Server started');

// С метаданными
logger.info('User logged in', {
  userId: user.id,
  telegramId: user.telegramId,
});

// Ошибки
logger.error('Failed to create config', {
  error: error.message,
  stack: error.stack,
  userId,
});

// Debug (только в development)
logger.debug('Request received', { method: 'POST', url: '/api/vpn' });
```

**Где логировать:**
- ✅ Критичные операции (auth, payment, vpn config)
- ✅ Ошибки и warnings
- ✅ Внешние вызовы (VPN Agent, TON API)
- ❌ Каждый HTTP request (используй middleware)
- ❌ Внутренние детали (если не debug level)

**Безопасность:**
```typescript
// ❌ НИКОГДА не логировать
logger.info('User data', { password: '...' }); // passwords
logger.info('Payment', { privateKey: '...' }); // private keys
logger.info('Session', { sessionToken: '...' }); // tokens

// ✅ Логировать хеши или ID
logger.info('Session created', { userId, sessionId: hash(token) });
```

### 4. Error Classes (`errors.ts`)

**Назначение:** Типизированные ошибки с HTTP статусами

**Иерархия:**
```
AppError (базовый класс)
├── ValidationError (400)
├── UnauthorizedError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── IpPoolExhaustedError (503)
├── ExternalServiceError (502)
└── ... (все наследуют AppError)
```

**Использование:**
```typescript
import { NotFoundError, ValidationError } from '@/lib/errors';

// Бросить ошибку
throw new NotFoundError('User', userId);
// → "User with ID 'abc-123' not found" (404)

throw new ValidationError('Subscription is not active');
// → "Subscription is not active" (400)

throw new IpPoolExhaustedError(serverId);
// → "No available IP addresses in pool" (503)
```

**Обработка в API:**
```typescript
// apiHandler автоматически конвертирует в HTTP response
export const GET = apiHandler(async (request) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User', id);
    // Вернет клиенту:
    // {
    //   "success": false,
    //   "error": {
    //     "message": "User with ID 'abc' not found",
    //     "code": "NOT_FOUND",
    //     "statusCode": 404
    //   }
    // }
  }
  return createSuccessResponse({ user });
});
```

**Создание кастомных ошибок:**
```typescript
export class CustomError extends AppError {
  constructor(details: string) {
    super(
      `Custom error: ${details}`,
      418, // HTTP status
      'CUSTOM_ERROR', // error code
      { details } // metadata
    );
  }
}
```

### 5. Constants (`constants.ts`)

**Назначение:** Глобальные константы и feature flags

**Структура:**
```typescript
// Feature flags
export const FEATURES = {
  WITHDRAWAL_ENABLED: process.env.WITHDRAWAL_ENABLED === 'true',
  PROMO_CODES_ENABLED: true,
  NOTIFICATIONS_ENABLED: true,
} as const;

// Business rules
export const SUBSCRIPTION_MAX_CONFIGS = {
  basic: 1,
  pro: 3,
  family: 5,
} as const;

// Timing
export const RETRY_DELAYS = [100, 500, 1000, 2000] as const;

// Limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
```

**Использование:**
```typescript
import { FEATURES, SUBSCRIPTION_MAX_CONFIGS } from '@/lib/constants';

if (!FEATURES.WITHDRAWAL_ENABLED) {
  throw new ValidationError('Withdrawals are currently disabled');
}

const maxConfigs = SUBSCRIPTION_MAX_CONFIGS[plan.type];
```

**Почему `as const`:**
```typescript
// Без as const
const FEATURES = { WITHDRAWAL_ENABLED: true };
// Type: { WITHDRAWAL_ENABLED: boolean }

// С as const
const FEATURES = { WITHDRAWAL_ENABLED: true } as const;
// Type: { readonly WITHDRAWAL_ENABLED: true }
// TypeScript знает точное значение!
```

### 6. Validation Schemas (`validation.ts`)

**Назначение:** Переиспользуемые Zod схемы

**Библиотека:** Zod - TypeScript-first валидация

**Базовые схемы:**
```typescript
import { uuidSchema, emailSchema, wireguardKeySchema } from '@/lib/validation';

// UUID v4
const userId = uuidSchema.parse(input); // throws если не UUID

// Email
const email = emailSchema.parse(input);

// WireGuard key (44 символа base64)
const publicKey = wireguardKeySchema.parse(input);

// Telegram ID (bigint)
const telegramId = telegramIdSchema.parse(input);

// IP address (IPv4)
const ip = ipAddressSchema.parse('10.0.1.5');
```

**Композиция схем:**
```typescript
import { z } from 'zod';
import { uuidSchema } from '@/lib/validation';

const createUserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string().min(1).max(100),
  age: z.number().int().positive().optional(),
});

type CreateUserInput = z.infer<typeof createUserSchema>;
// Type: { id: string; email: string; name: string; age?: number }
```

**В API routes:**
```typescript
import { createUserSchema } from './validation';

export const POST = apiHandler(async (request) => {
  const body = await parseRequestBody(request);
  const validated = createUserSchema.parse(body);
  // Если невалидно - бросит ZodError (apiHandler поймает и вернет 400)

  // validated имеет правильный тип!
  const user = await createUser(validated);
});
```

**Кастомные валидаторы:**
```typescript
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[0-9]/, 'Must contain number');
```

### 7. API Response Helpers (`api-response.ts`)

**Назначение:** Стандартизированные API responses

#### createSuccessResponse()

```typescript
import { createSuccessResponse } from '@/lib/api-response';

// Простой success
return createSuccessResponse({ user });
// → { "success": true, "data": { "user": {...} } }

// С дополнительными полями
return createSuccessResponse({ users }, { total: 100, page: 1 });
// → { "success": true, "data": { "users": [...] }, "total": 100, "page": 1 }
```

#### createErrorResponse()

```typescript
import { createErrorResponse } from '@/lib/api-response';

// Из Error объекта
return createErrorResponse(new Error('Something went wrong'));
// → {
//   "success": false,
//   "error": {
//     "message": "Something went wrong",
//     "statusCode": 500,
//     "code": "INTERNAL_SERVER_ERROR"
//   }
// }

// Из AppError
return createErrorResponse(new NotFoundError('User', id));
// → {
//   "success": false,
//   "error": {
//     "message": "User with ID 'abc' not found",
//     "statusCode": 404,
//     "code": "NOT_FOUND"
//   }
// }
```

#### apiHandler()

**Wrapper для автоматической обработки ошибок:**

```typescript
export const GET = apiHandler(async (request) => {
  // Любая брошенная ошибка автоматически конвертируется в JSON response
  const user = await getUser(id);
  if (!user) throw new NotFoundError('User', id);

  return createSuccessResponse({ user });
});

// Вместо:
export const GET = async (request) => {
  try {
    const user = await getUser(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: '...' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: { user } });
  } catch (error) {
    logger.error('Error', error);
    return NextResponse.json(
      { success: false, error: { message: 'Internal error' } },
      { status: 500 }
    );
  }
};
```

#### validateMethod()

```typescript
import { validateMethod } from '@/lib/api-response';

export const POST = apiHandler(async (request) => {
  validateMethod(request, ['POST']);
  // Если метод не POST - бросит MethodNotAllowedError (405)

  // ... rest of handler
});

// Для нескольких методов
validateMethod(request, ['GET', 'POST']);
```

#### parseRequestBody()

```typescript
import { parseRequestBody } from '@/lib/api-response';

export const POST = apiHandler(async (request) => {
  const body = await parseRequestBody<CreateUserInput>(request);
  // Парсит JSON, бросает ValidationError если невалидный JSON

  // TypeScript знает тип body
  console.log(body.email);
});
```

### 8. Auth Middleware (`auth-middleware.ts`)

**Назначение:** Защита API routes

#### requireAuth()

```typescript
import { requireAuth } from '@/lib/auth-middleware';

export const GET = async (request: NextRequest) => {
  const user = await requireAuth(request);
  // Если не авторизован - бросит UnauthorizedError (401)
  // Если сессия истекла - бросит UnauthorizedError
  // user: AuthUser (type-safe)

  return NextResponse.json({ userId: user.id });
};
```

#### requireAdmin()

```typescript
import { requireAdmin } from '@/lib/auth-middleware';

export const DELETE = async (request: NextRequest) => {
  const admin = await requireAdmin(request);
  // Если не авторизован - 401
  // Если не админ - 403

  // admin.isAdmin === true (гарантированно)
  await deleteUser(userId);
};
```

#### withAuth()

**Рекомендуемый способ - композиция с apiHandler:**

```typescript
import { withAuth } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-response';

export const GET = apiHandler(
  withAuth(async (request, user) => {
    // user уже validated
    // ошибки автоматически обрабатываются apiHandler

    const data = await getData(user.id);
    return createSuccessResponse({ data });
  })
);
```

**Извлечение токена:**
```typescript
// Из Authorization header
Authorization: Bearer <token>

// Функция extractToken() автоматически парсит
```

## Типы (`src/types/index.ts`)

### ApiResponse<T>

```typescript
type ApiResponse<T> =
  | {
      success: true;
      data: T;
      [key: string]: unknown; // дополнительные поля
    }
  | {
      success: false;
      error: {
        message: string;
        code?: string;
        statusCode: number;
        details?: unknown;
      };
    };
```

### AuthUser

```typescript
interface AuthUser {
  id: string;
  telegramId?: bigint;
  username?: string;
  firstName?: string;
  isAdmin: boolean;
}
```

### SessionData

```typescript
interface SessionData {
  userId: string;
  isAdmin: boolean;
  telegramId?: bigint;
  createdAt: Date;
  expiresAt: Date;
}
```

## Best Practices

### 1. Всегда используйте типизированные ошибки

```typescript
// ✅ ПРАВИЛЬНО
throw new NotFoundError('User', userId);

// ❌ НЕПРАВИЛЬНО
throw new Error('User not found');
// apiHandler вернет 500 вместо 404
```

### 2. Используйте apiHandler для всех routes

```typescript
// ✅ ПРАВИЛЬНО
export const POST = apiHandler(async (request) => {
  // ...
});

// ❌ НЕПРАВИЛЬНО (без error handling)
export const POST = async (request) => {
  // ...
};
```

### 3. Валидируйте входные данные

```typescript
// ✅ ПРАВИЛЬНО
const validated = createUserSchema.parse(body);

// ❌ НЕПРАВИЛЬНО
const user = await createUser(body); // body может быть чем угодно!
```

### 4. Логируйте важные события

```typescript
// ✅ ПРАВИЛЬНО
logger.info('VPN config created', { userId, serverId, ipAddress });

// ❌ НЕПРАВИЛЬНО
console.log('Config created'); // потеряется в production
```

### 5. Не создавайте новые Prisma/Redis instances

```typescript
// ✅ ПРАВИЛЬНО
import { prisma, redis } from '@/lib';

// ❌ НЕПРАВИЛЬНО
const prisma = new PrismaClient(); // exhaustion пула соединений
```

## Troubleshooting

### Проблема: "Too many Prisma connections"

**Причина:** Создание нового PrismaClient при каждом request

**Решение:**
```typescript
// Всегда импортировать singleton
import { prisma } from '@/lib/prisma';

// Никогда не создавать new PrismaClient()
```

### Проблема: "Redis connection timeout"

**Причина:** Redis недоступен или неправильный URL

**Диагностика:**
```bash
# Проверить Redis
docker ps | grep redis
redis-cli -h localhost -p 6379 ping

# Проверить REDIS_URL в .env
echo $REDIS_URL
```

**Решение:**
- Запустить Redis: `docker-compose up -d redis`
- Проверить `REDIS_URL=redis://localhost:6379`

### Проблема: "Zod validation error не возвращает 400"

**Причина:** ZodError не обрабатывается apiHandler

**Решение:**
```typescript
// apiHandler автоматически ловит ZodError
export const POST = apiHandler(async (request) => {
  const body = await parseRequestBody(request);
  const validated = schema.parse(body); // ZodError → 400 автоматически
});
```

### Проблема: "Logger не пишет в файл в production"

**Решение:** Добавить file transport в `logger.ts`:
```typescript
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }));
}
```

## Environment Variables

```bash
# .env
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
NODE_ENV=development # or production
LOG_LEVEL=debug # optional, default: info
```

## Testing

```bash
# Unit tests
npm test -- src/lib

# Проверка типов
npm run typecheck
```

## Roadmap

- [ ] Rate limiting middleware
- [ ] Request ID трекинг (correlation ID)
- [ ] Metrics collection (Prometheus)
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Circuit breaker для external services
