# Promo Module

Модуль управления промокодами для Telegram VPN Mini App. Позволяет продавать подписки за наличные через промокоды.

## 📋 Содержание

- [Обзор](#обзор)
- [API Endpoints](#api-endpoints)
- [Типы данных](#типы-данных)
- [Сервис](#сервис)
- [Примеры использования](#примеры-использования)

## Обзор

Модуль предоставляет комплексную систему промокодов с поддержкой:

- Создание и управление промокодами (админ)
- Лимиты использования (max uses)
- Срок действия промокодов
- Активация промокодов пользователями
- Автоматическое создание подписки при активации
- Статистика и отчеты
- Валидация промокодов перед активацией

## API Endpoints

### User Endpoints

#### POST /api/promo/activate

Активировать промокод и создать подписку.

**Authentication:** Required

**Body:**
```json
{
  "code": "SUMMER2025"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "promoCodeId": "promo-uuid",
    "activatedAt": "2025-01-26T15:00:00.000Z",
    "user": {
      "id": "user-uuid",
      "username": "john_doe",
      "firstName": "John"
    },
    "promoCode": {
      "id": "promo-uuid",
      "code": "SUMMER2025",
      "planId": "plan-uuid",
      "durationDays": 30
    }
  }
}
```

**Errors:**
- `400` - Invalid promo code / Already used / Expired / Max uses reached
- `401` - Unauthorized

#### POST /api/promo/validate

Проверить валидность промокода без активации.

**Authentication:** Not required

**Body:**
```json
{
  "code": "SUMMER2025"
}
```

**Response (valid):**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "code": {
      "id": "uuid",
      "code": "SUMMER2025",
      "planId": "plan-uuid",
      "durationDays": 30,
      "maxUses": 100,
      "usedCount": 45,
      "expiresAt": "2025-12-31T23:59:59.000Z",
      "isActive": true
    }
  }
}
```

**Response (invalid):**
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "reason": "Promo code has expired"
  }
}
```

### Admin Endpoints

#### GET /api/promo

Получить список промокодов (только админы).

**Authentication:** Required (admin only)

**Query Parameters:**
- `page` (number, optional) - Номер страницы (default: 1)
- `limit` (number, optional) - Записей на странице (default: 20, max: 100)
- `isActive` (boolean, optional) - Фильтр по статусу активности
- `planId` (string, optional) - Фильтр по тарифному плану
- `sortBy` (string, optional) - Сортировка: `createdAt` | `expiresAt` | `usedCount` (default: createdAt)
- `order` (string, optional) - Порядок: `asc` | `desc` (default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "promoCodes": [
      {
        "id": "uuid",
        "code": "SUMMER2025",
        "planId": "plan-uuid",
        "durationDays": 30,
        "maxUses": 100,
        "usedCount": 45,
        "isActive": true,
        "expiresAt": "2025-12-31T23:59:59.000Z",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "createdBy": "admin-uuid",
        "plan": {
          "id": "plan-uuid",
          "name": "Pro Plan",
          "price": "500"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### POST /api/promo

Создать новый промокод (только админы).

**Authentication:** Required (admin only)

**Body:**
```json
{
  "code": "NEWYEAR2025",
  "planId": "plan-uuid",
  "durationDays": 90,
  "maxUses": 50,
  "expiresAt": "2025-12-31T23:59:59.000Z"
}
```

**Validation:**
- `code` - Uppercase letters, numbers, underscores, hyphens (3-50 chars)
- `durationDays` - 1-365 days
- `maxUses` - Optional, positive integer
- `expiresAt` - Optional, future date

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "NEWYEAR2025",
    "planId": "plan-uuid",
    "durationDays": 90,
    "maxUses": 50,
    "usedCount": 0,
    "isActive": true,
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "createdAt": "2025-01-26T15:00:00.000Z",
    "createdBy": "admin-uuid",
    "plan": {
      "id": "plan-uuid",
      "name": "Pro Plan"
    }
  }
}
```

#### GET /api/promo/:promoCodeId

Получить детали промокода (только админы).

**Authentication:** Required (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "SUMMER2025",
    "planId": "plan-uuid",
    "durationDays": 30,
    "maxUses": 100,
    "usedCount": 45,
    "isActive": true,
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "createdBy": "admin-uuid",
    "plan": {
      "id": "plan-uuid",
      "name": "Pro Plan"
    },
    "activations": [
      {
        "id": "uuid",
        "userId": "user-uuid",
        "activatedAt": "2025-01-26T10:00:00.000Z"
      }
    ]
  }
}
```

#### PATCH /api/promo/:promoCodeId

Обновить промокод (только админы).

**Authentication:** Required (admin only)

**Body:**
```json
{
  "maxUses": 200,
  "expiresAt": "2026-01-01T00:00:00.000Z",
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "SUMMER2025",
    "maxUses": 200,
    "expiresAt": "2026-01-01T00:00:00.000Z",
    "isActive": false,
    "updatedAt": "2025-01-26T16:00:00.000Z"
  }
}
```

#### DELETE /api/promo/:promoCodeId

Удалить промокод (только админы).

**Authentication:** Required (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Promo code deleted successfully"
  }
}
```

#### GET /api/promo/activations

Получить список активаций промокодов (только админы).

**Authentication:** Required (admin only)

**Query Parameters:**
- `promoCodeId` (string, optional) - Фильтр по промокоду
- `userId` (string, optional) - Фильтр по пользователю
- `page` (number, optional) - Номер страницы (default: 1)
- `limit` (number, optional) - Записей на странице (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "activations": [
      {
        "id": "uuid",
        "userId": "user-uuid",
        "promoCodeId": "promo-uuid",
        "activatedAt": "2025-01-26T15:00:00.000Z",
        "user": {
          "id": "user-uuid",
          "username": "john_doe",
          "firstName": "John"
        },
        "promoCode": {
          "code": "SUMMER2025",
          "planId": "plan-uuid"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 145,
      "totalPages": 8
    }
  }
}
```

#### GET /api/promo/statistics

Получить статистику промокодов (только админы).

**Authentication:** Required (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "active": 30,
    "inactive": 10,
    "expired": 5,
    "totalActivations": 523,
    "topPromoCodes": [
      {
        "code": "SUMMER2025",
        "usedCount": 145,
        "maxUses": 200,
        "planName": "Pro Plan"
      },
      {
        "code": "WELCOME",
        "usedCount": 89,
        "maxUses": null,
        "planName": "Basic Plan"
      }
    ]
  }
}
```

## Типы данных

### PromoCodeWithRelations

```typescript
interface PromoCodeWithRelations {
  id: string;
  code: string;
  planId: string;
  durationDays: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  plan: SubscriptionPlan;
  activations?: PromoActivation[];
}
```

### CreatePromoCodeInput

```typescript
interface CreatePromoCodeInput {
  code: string; // Uppercase A-Z, 0-9, _, - (3-50 chars)
  planId: string;
  durationDays: number; // 1-365
  maxUses?: number;
  expiresAt?: Date;
  createdBy: string;
}
```

### PromoCodeValidationResult

```typescript
interface PromoCodeValidationResult {
  isValid: boolean;
  code?: PromoCode;
  reason?: string; // If invalid
}
```

### PromoCodeStatistics

```typescript
interface PromoCodeStatistics {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  totalActivations: number;
  topPromoCodes: Array<{
    code: string;
    usedCount: number;
    maxUses: number | null;
    planName: string;
  }>;
}
```

## Сервис

### PromoService

Основной сервис для работы с промокодами.

```typescript
import { promoService } from '@/modules/promo';

// Создать промокод (admin)
const promoCode = await promoService.createPromoCode({
  code: 'WINTER2025',
  planId: 'plan-uuid',
  durationDays: 30,
  maxUses: 100,
  expiresAt: new Date('2025-12-31'),
  createdBy: 'admin-uuid'
});

// Обновить промокод (admin)
const updated = await promoService.updatePromoCode('promo-uuid', {
  maxUses: 200,
  isActive: false
});

// Удалить промокод (admin)
await promoService.deletePromoCode('promo-uuid');

// Получить промокод по ID
const promo = await promoService.getPromoCodeById('promo-uuid');

// Получить промокод по коду
const promo = await promoService.getPromoCodeByCode('SUMMER2025');

// Валидировать промокод
const validation = await promoService.validatePromoCode('SUMMER2025');
if (validation.isValid) {
  console.log('Promo code is valid!');
} else {
  console.log('Invalid:', validation.reason);
}

// Активировать промокод
const activation = await promoService.activatePromoCode({
  code: 'SUMMER2025',
  userId: 'user-uuid'
});

// Список промокодов (admin)
const result = await promoService.listPromoCodes({
  page: 1,
  limit: 20,
  isActive: true,
  sortBy: 'usedCount',
  order: 'desc'
});

// Список активаций
const activations = await promoService.listPromoActivations(
  'promo-uuid', // Optional: filter by promo code
  undefined,    // Optional: filter by user
  1,            // page
  20            // limit
);

// Статистика (admin)
const stats = await promoService.getPromoCodeStatistics();
```

## Примеры использования

### Пример 1: Создание промокода для продажи

```typescript
import { promoService } from '@/modules/promo';

async function createPromoForCashSale() {
  // Админ создает промокод для продажи за наличные
  const promoCode = await promoService.createPromoCode({
    code: 'CASH-12345',
    planId: 'pro-plan-uuid',
    durationDays: 30,
    maxUses: 1, // Одноразовый промокод
    createdBy: 'admin-uuid'
  });

  console.log(`Created promo code: ${promoCode.code}`);
  console.log(`Sell this code to customer for cash`);

  return promoCode.code;
}
```

### Пример 2: Активация промокода пользователем

```typescript
import { promoService } from '@/modules/promo';

async function activatePromoInMiniApp(userId: string, code: string) {
  try {
    // Сначала валидируем
    const validation = await promoService.validatePromoCode(code);

    if (!validation.isValid) {
      throw new Error(validation.reason);
    }

    // Показываем пользователю детали
    console.log(`
      Промокод: ${validation.code.code}
      План: ${validation.code.plan.name}
      Длительность: ${validation.code.durationDays} дней
      Осталось использований: ${validation.code.maxUses ? validation.code.maxUses - validation.code.usedCount : 'неограничено'}
    `);

    // Активируем
    const activation = await promoService.activatePromoCode({
      code,
      userId
    });

    console.log('Подписка активирована!');
    return activation;
  } catch (error) {
    console.error('Ошибка активации:', error.message);
    throw error;
  }
}
```

### Пример 3: Массовая генерация промокодов

```typescript
import { promoService } from '@/modules/promo';

async function generateBulkPromoCodes(count: number, planId: string) {
  const promoCodes = [];

  for (let i = 0; i < count; i++) {
    // Генерируем уникальный код
    const code = `PROMO-${Date.now()}-${i}`;

    const promoCode = await promoService.createPromoCode({
      code,
      planId,
      durationDays: 30,
      maxUses: 1,
      expiresAt: new Date('2025-12-31'),
      createdBy: 'admin-uuid'
    });

    promoCodes.push(promoCode.code);
  }

  console.log(`Generated ${promoCodes.length} promo codes`);
  return promoCodes;
}
```

### Пример 4: Отключение истекших промокодов

```typescript
import { promoService } from '@/modules/promo';

async function deactivateExpiredPromoCodes() {
  // Получаем все активные промокоды
  const result = await promoService.listPromoCodes({
    isActive: true,
    limit: 100
  });

  const now = new Date();
  let deactivated = 0;

  for (const promo of result.promoCodes) {
    // Проверяем истечение
    if (promo.expiresAt && promo.expiresAt < now) {
      await promoService.updatePromoCode(promo.id, {
        isActive: false
      });
      deactivated++;
      console.log(`Deactivated expired promo: ${promo.code}`);
    }

    // Проверяем лимит использований
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      await promoService.updatePromoCode(promo.id, {
        isActive: false
      });
      deactivated++;
      console.log(`Deactivated fully used promo: ${promo.code}`);
    }
  }

  console.log(`Deactivated ${deactivated} promo codes`);
}
```

### Пример 5: Админка - топ промокодов

```typescript
import { promoService } from '@/modules/promo';

async function showTopPromoCodesDashboard() {
  const stats = await promoService.getPromoCodeStatistics();

  console.log(`
    === Promo Codes Dashboard ===
    Total: ${stats.total}
    Active: ${stats.active}
    Inactive: ${stats.inactive}
    Expired: ${stats.expired}
    Total Activations: ${stats.totalActivations}

    Top Promo Codes:
  `);

  stats.topPromoCodes.forEach((promo, index) => {
    const usage = promo.maxUses
      ? `${promo.usedCount}/${promo.maxUses}`
      : `${promo.usedCount}/∞`;

    console.log(`${index + 1}. ${promo.code} - ${usage} (${promo.planName})`);
  });
}
```

### Пример 6: Проверка промокода перед оплатой

```typescript
import { promoService } from '@/modules/promo';

async function checkPromoBeforePayment(code: string) {
  const validation = await promoService.validatePromoCode(code);

  if (!validation.isValid) {
    return {
      canUse: false,
      error: validation.reason
    };
  }

  const promo = validation.code!;

  // Дополнительные проверки
  const remainingUses = promo.maxUses
    ? promo.maxUses - promo.usedCount
    : Infinity;

  return {
    canUse: true,
    promo: {
      code: promo.code,
      planName: promo.plan.name,
      durationDays: promo.durationDays,
      remainingUses,
      expiresAt: promo.expiresAt
    }
  };
}
```

## Workflow: Продажа промокодов

```
1. Админ создает промокод
   POST /api/promo
   {
     "code": "CASH-001",
     "planId": "plan-uuid",
     "durationDays": 30,
     "maxUses": 1
   }

2. Админ продает промокод пользователю за наличные
   (офлайн процесс)

3. Пользователь вводит промокод в Mini App

4. Mini App валидирует промокод
   POST /api/promo/validate
   { "code": "CASH-001" }

5. Пользователь подтверждает активацию

6. Mini App активирует промокод
   POST /api/promo/activate
   { "code": "CASH-001" }

7. Система создает подписку автоматически
   - subscription.status = 'active'
   - subscription.endDate = now + 30 days
   - promoCode.usedCount += 1

8. Пользователь получает доступ к VPN
```

## Логирование

Все операции логируются через Winston:

```typescript
// Успешные операции - info level
logger.info('Promo code created', {
  promoCodeId: promoCode.id,
  code: promoCode.code,
  createdBy: input.createdBy
});

logger.info('Promo code activated', {
  promoCodeId: promoCode.id,
  userId: input.userId,
  subscriptionId: subscription.id
});

// Ошибки - error level
logger.error('Failed to activate promo code', {
  error: error.message,
  input
});
```

## Ошибки

Модуль использует стандартные ошибки из `@/lib/errors`:

- **NotFoundError** - Промокод не найден
- **ValidationError** - Невалидный/истекший/использованный промокод
- **ForbiddenError** - Нет доступа (не админ)

## Зависимости

- **Prisma Client** - База данных
- **Winston** - Логирование
- **Zod** - Валидация схем
- **Auth Middleware** - Аутентификация

## Связанные модули

- **Subscriptions** - Создание подписки при активации
- **Payments** - Альтернативный способ оплаты (TON vs Promo)
- **Admin** - Управление промокодами через админку

## Database Schema

```prisma
model PromoCode {
  id           String   @id @default(uuid())
  code         String   @unique
  planId       String   @map("plan_id")
  durationDays Int      @map("duration_days")
  maxUses      Int?     @map("max_uses")
  usedCount    Int      @default(0) @map("used_count")
  isActive     Boolean  @default(true) @map("is_active")
  expiresAt    DateTime? @map("expires_at")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  createdBy    String?  @map("created_by")

  plan        SubscriptionPlan @relation(fields: [planId], references: [id])
  activations PromoActivation[]
  payments    Payment[]

  @@map("promo_codes")
  @@index([code])
  @@index([isActive, expiresAt])
}

model PromoActivation {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  promoCodeId String   @map("promo_code_id")
  activatedAt DateTime @default(now()) @map("activated_at")

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  promoCode PromoCode @relation(fields: [promoCodeId], references: [id], onDelete: Cascade)

  @@unique([userId, promoCodeId])
  @@map("promo_activations")
  @@index([promoCodeId])
}
```

## Производительность

- **Индексы** на `code`, `isActive`, `expiresAt` для быстрых запросов
- **Unique constraint** на `userId + promoCodeId` предотвращает дублирование активаций
- **Транзакции** для атомарности активации (subscription + activation + increment)
- **Пагинация** для всех списков

## Безопасность

- ✅ Аутентификация на admin endpoints
- ✅ Проверка роли админа
- ✅ Валидация всех входных данных через Zod
- ✅ Проверка уникальности кода при создании
- ✅ Проверка дублирования активации
- ✅ Валидация промокода перед активацией
- ✅ Uppercase-only коды для простоты ввода

---

**Статус модуля**: ✅ Production Ready

**Версия**: 1.0.0

**Последнее обновление**: 2025-01-26
