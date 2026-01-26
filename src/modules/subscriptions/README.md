# SUBSCRIPTIONS Module

## Описание

Модуль управления подписками (subscriptions) и тарифными планами (subscription plans). Отвечает за жизненный цикл подписок: создание, продление, отмена, автоматическое истечение.

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                                │
│  GET  /api/subscriptions/plans                              │
│  GET  /api/subscriptions                                     │
│  POST /api/subscriptions                                     │
│  GET  /api/subscriptions/:id                                 │
│  POST /api/subscriptions/:id/cancel                          │
│  POST /api/subscriptions/:id/extend                          │
│  GET  /api/subscriptions/summary                             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌───────────────────┐  ┌──────────────────────┐           │
│  │ SubscriptionPlan  │  │  Subscription        │           │
│  │ Service           │  │  Service             │           │
│  │                   │  │                      │           │
│  │• Get active plans │  │• Create subscription │           │
│  │• CRUD plans       │  │• Cancel subscription │           │
│  │• Localization     │  │• Extend subscription │           │
│  │• Plan stats       │  │• Auto-expire         │           │
│  └───────────────────┘  │• Validity check      │           │
│                          │• User summary        │           │
│                          └──────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer                              │
│  ┌─────────────────┐  ┌──────────────────────┐             │
│  │SubscriptionPlan │  │ Subscription         │             │
│  │                 │  │                      │             │
│  │• id             │  │• id                  │             │
│  │• name / nameEn  │  │• userId              │             │
│  │• maxConfigs     │  │• planId              │             │
│  │• durationDays   │  │• status              │             │
│  │• price          │  │  (active/expired/    │             │
│  │• isActive       │  │   cancelled/pending) │             │
│  │• isCustom       │  │• startDate           │             │
│  └─────────────────┘  │• endDate             │             │
│                        │• cancelledAt         │             │
│                        └──────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## Компоненты

### 1. SubscriptionPlanService (`subscription-plan.service.ts`)

**Ответственность:** Управление тарифными планами

**Ключевые операции:**

#### getActivePlans()
Получение всех активных публичных планов (для пользователей)

```typescript
const plans = await subscriptionPlanService.getActivePlans();
// Returns: SubscriptionPlan[] (только isActive=true, isCustom=false)
```

**Сортировка:** По цене (от меньшей к большей)

#### getActivePlansWithLocale(locale)
Получение планов с локализацией

```typescript
const plans = await subscriptionPlanService.getActivePlansWithLocale('en');
// Returns: PlanWithLocale[] - с полями localizedName и localizedDescription
```

**Логика локализации:**
- Если `locale === 'en'` и `nameEn` существует → используется `nameEn`
- Иначе → используется `name` (русский fallback)

#### createPlan(input) - Admin Only

```typescript
const plan = await subscriptionPlanService.createPlan({
  name: 'Премиум',
  nameEn: 'Premium',
  description: 'До 10 конфигов',
  descriptionEn: 'Up to 10 configs',
  maxConfigs: 10,
  durationDays: 30,
  price: 25.99,
  isCustom: false,
  isActive: true,
});
```

**Валидация:**
- `price > 0`
- `1 <= durationDays <= 365`
- `1 <= maxConfigs <= 10`
- Уникальность имени

#### updatePlan(input) - Admin Only

```typescript
await subscriptionPlanService.updatePlan({
  planId: 'plan-id',
  price: 29.99,
  isActive: true,
});
```

#### deletePlan(planId) - Admin Only

**Soft delete** - помечает план как неактивный

```typescript
await subscriptionPlanService.deletePlan(planId);
```

**Проверка:**
- Нельзя удалить план с активными подписками
- Возвращает `ConflictError` если `activeSubscriptions > 0`

#### getPlanStats(planId) - Admin Only

Статистика по плану:

```typescript
const stats = await subscriptionPlanService.getPlanStats(planId);
// Returns:
// {
//   planId: string,
//   planName: string,
//   activeSubscriptions: number,
//   totalRevenue: number,
//   averageLifetimeDays: number
// }
```

### 2. SubscriptionService (`subscription.service.ts`)

**Ответственность:** Управление подписками пользователей

#### createSubscription(input)

Создание новой подписки (обычно после оплаты)

```typescript
const subscription = await subscriptionService.createSubscription({
  userId: 'user-id',
  planId: 'plan-id',
  startDate: new Date(), // optional, default: now
  paymentId: 'payment-id', // optional
});
```

**Бизнес-логика:**

```
┌──────────────────────────────────────────┐
│ 1. Validate plan exists and is active   │
└───────────────┬──────────────────────────┘
                ▼
┌──────────────────────────────────────────┐
│ 2. Check user doesn't have active sub   │
│    → ConflictError if exists             │
└───────────────┬──────────────────────────┘
                ▼
┌──────────────────────────────────────────┐
│ 3. Calculate dates:                      │
│    startDate = input.startDate || now    │
│    endDate = startDate + plan.duration   │
└───────────────┬──────────────────────────┘
                ▼
┌──────────────────────────────────────────┐
│ 4. Create subscription (status=active)   │
└──────────────────────────────────────────┘
```

**Критичный момент:** Пользователь может иметь только **одну** активную подписку. Для смены плана нужно:
1. Отменить текущую подписку
2. Создать новую

Или подождать истечения текущей.

#### getUserActiveSubscription(userId)

```typescript
const activeSub = await subscriptionService.getUserActiveSubscription(userId);
// Returns: SubscriptionWithRelations | null
```

#### getUserSubscriptionSummary(userId)

Полная сводка по подпискам пользователя:

```typescript
const summary = await subscriptionService.getUserSubscriptionSummary(userId);
// Returns:
// {
//   hasActiveSubscription: boolean,
//   activeSubscription?: SubscriptionWithRelations,
//   expiringInDays?: number,          // Сколько дней до истечения
//   totalSubscriptions: number,         // Всего подписок за всё время
//   totalSpent: number                  // Всего потрачено (из payments)
// }
```

**Use case:** Показать на дашборде пользователя

#### checkSubscriptionValidity(subscriptionId)

Проверка валидности подписки (с автоэкспирацией!)

```typescript
const result = await subscriptionService.checkSubscriptionValidity(subscriptionId);
// Returns:
// {
//   isValid: boolean,
//   subscription?: Subscription,
//   reason?: string  // "Subscription expired", "Subscription cancelled", etc.
// }
```

**Автоэкспирация:**
Если `endDate < now` и `status === 'active'`, автоматически меняет статус на `expired`

**Use case:** Перед созданием VPN конфига проверить что подписка валидна

#### cancelSubscription(subscriptionId, userId, reason?)

Отмена подписки пользователем

```typescript
await subscriptionService.cancelSubscription(
  subscriptionId,
  userId,
  'Нашел более дешевый VPN'
);
```

**Проверки:**
- Подписка принадлежит пользователю
- Статус не `cancelled` и не `expired`

**Результат:**
- `status → 'cancelled'`
- `cancelledAt → now`
- Логирование в Winston

#### extendSubscription(input)

Продление подписки (добавление дней)

```typescript
await subscriptionService.extendSubscription({
  subscriptionId: 'sub-id',
  additionalDays: 30,
  paymentId: 'payment-id', // optional
});
```

**Логика:**
```
currentEndDate = subscription.endDate
newEndDate = currentEndDate + additionalDays

if (status === 'expired') {
  status → 'active'  // Реактивируем!
}
```

**Use case:** Пользователь продлил подписку (купил дополнительный месяц)

#### renewSubscription(oldSubscriptionId, userId, paymentId?)

Обновление подписки - создание новой на основе старой

```typescript
const newSub = await subscriptionService.renewSubscription(
  oldSubscriptionId,
  userId,
  paymentId
);
```

**Логика:**
1. Берем старую подписку
2. Создаем новую с тем же планом
3. Старая остается в статусе `expired`

**Отличие от extend:**
- `extend` - добавляет дни к текущей подписке
- `renew` - создает новую подписку

#### expireOldSubscriptions()

**CRON Job** - автоматическое истечение подписок

```typescript
const count = await subscriptionService.expireOldSubscriptions();
// Returns: количество истекших подписок
```

**SQL:**
```sql
UPDATE subscriptions
SET status = 'expired'
WHERE status = 'active'
  AND end_date < NOW()
```

**Рекомендация:** Запускать каждый час через cron или Vercel Cron Jobs

#### getExpiringSubscriptions(daysBeforeExpiry)

Получение подписок, истекающих скоро (для отправки уведомлений)

```typescript
const expiring = await subscriptionService.getExpiringSubscriptions(7);
// Returns: подписки, которые истекают в ближайшие 7 дней
```

**Use case:** Отправка email/Telegram уведомлений "Ваша подписка истекает через 7 дней"

#### getSubscriptionStats() - Admin Only

Глобальная статистика по всем подпискам:

```typescript
const stats = await subscriptionService.getSubscriptionStats();
// Returns:
// {
//   totalActive: number,
//   totalExpired: number,
//   totalCancelled: number,
//   totalPending: number,
//   revenueThisMonth: number,
//   newSubscriptionsThisMonth: number
// }
```

## API Endpoints

### GET /api/subscriptions/plans

**Описание:** Получить все активные тарифные планы

**Auth:** Public (не требует авторизации)

**Query Params:**
- `locale` - `ru` или `en` (default: `ru`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "uuid",
        "name": "Базовый",
        "nameEn": "Basic",
        "localizedName": "Basic",
        "localizedDescription": "One VPN config for one device",
        "maxConfigs": 1,
        "durationDays": 30,
        "price": "5.00",
        "isActive": true,
        "isCustom": false
      }
    ],
    "count": 3
  }
}
```

### GET /api/subscriptions

**Описание:** Получить подписки текущего пользователя

**Auth:** Required

**Query Params:**
- `status` - `active`, `expired`, `cancelled`, `pending` (optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "uuid",
        "userId": "uuid",
        "planId": "uuid",
        "status": "active",
        "startDate": "2024-01-01T00:00:00Z",
        "endDate": "2024-01-31T23:59:59Z",
        "cancelledAt": null,
        "plan": {
          "name": "Базовый",
          "price": "5.00"
        }
      }
    ],
    "count": 1
  }
}
```

### POST /api/subscriptions

**Описание:** Создать новую подписку

**Auth:** Required

**⚠️ ВАЖНО:** Обычно вызывается автоматически после успешного платежа в PAYMENTS модуле

**Request:**
```json
{
  "userId": "uuid",
  "planId": "uuid",
  "startDate": "2024-01-01T00:00:00Z",  // optional
  "paymentId": "uuid"                     // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": { /* Subscription объект */ }
  }
}
```

**Errors:**
- `409 Conflict` - У пользователя уже есть активная подписка
- `400 Bad Request` - План неактивен или кастомный

### GET /api/subscriptions/:subscriptionId

**Описание:** Получить детали подписки

**Auth:** Required (только владелец или admin)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "userId": "uuid",
      "plan": { /* SubscriptionPlan */ },
      "user": { /* User */ },
      "status": "active",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z"
    }
  }
}
```

### POST /api/subscriptions/:subscriptionId/cancel

**Описание:** Отменить подписку

**Auth:** Required (только владелец)

**Request:**
```json
{
  "reason": "Too expensive"  // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "status": "cancelled",
      "cancelledAt": "2024-01-15T12:00:00Z"
    }
  }
}
```

**Errors:**
- `409 Conflict` - Подписка уже отменена или истекла

### POST /api/subscriptions/:subscriptionId/extend

**Описание:** Продлить подписку (добавить дни)

**Auth:** Required (только владелец или admin)

**Request:**
```json
{
  "additionalDays": 30,
  "paymentId": "uuid"  // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "endDate": "2024-02-28T23:59:59Z",  // +30 days
      "status": "active"
    }
  }
}
```

### GET /api/subscriptions/summary

**Описание:** Сводка по подпискам пользователя

**Auth:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "hasActiveSubscription": true,
      "activeSubscription": { /* SubscriptionWithRelations */ },
      "expiringInDays": 15,
      "totalSubscriptions": 5,
      "totalSpent": 120.50
    }
  }
}
```

## Subscription Lifecycle

### Полный жизненный цикл подписки:

```
┌─────────┐
│ pending │  ← Создана, но не оплачена (для будущего use case)
└────┬────┘
     │ Payment успешен
     ▼
┌─────────┐
│ active  │  ← Действующая подписка
└────┬────┘
     │
     ├─ Пользователь отменил → cancelled
     │
     ├─ endDate прошла → expired
     │
     └─ Продлена (extend/renew) → active (новая endDate)

┌───────────┐
│ cancelled │  ← Отменена пользователем (нельзя продлить)
└───────────┘

┌─────────┐
│ expired │  ← Истекла по времени (можно продлить extend)
└─────────┘
```

### Status Transitions:

| From | To | Action | Method |
|------|-----|--------|--------|
| pending | active | Payment completed | createSubscription() |
| active | cancelled | User cancels | cancelSubscription() |
| active | expired | Auto-expiration | expireOldSubscriptions() |
| expired | active | User renews | extendSubscription() |

## Business Rules

### 1. One Active Subscription Rule

**Правило:** Пользователь может иметь только **одну** активную подписку одновременно

**Причина:** Упрощение логики, предотвращение конфликтов

**Решение для апгрейда:**
```typescript
// Апгрейд с Basic на Pro:
// 1. Отменить Basic
await subscriptionService.cancelSubscription(basicSubId, userId);

// 2. Создать Pro
await subscriptionService.createSubscription({
  userId,
  planId: proПланId,
});
```

### 2. Subscription Duration

**Правило:** `endDate = startDate + plan.durationDays`

**Пример:**
- Plan: `durationDays = 30`
- Start: `2024-01-01 00:00:00`
- End: `2024-01-31 23:59:59`

### 3. Extend vs Renew

**Extend** - добавление дней к **текущей** подписке:
- `additionalDays` добавляется к `endDate`
- Может реактивировать `expired` подписку
- Один `subscriptionId` не меняется

**Renew** - создание **новой** подписки:
- Новый `subscriptionId`
- Новый `startDate = now`
- Старая подписка остается в истории

**Когда использовать:**
- `extend` - пользователь продлевает существующую подписку
- `renew` - пользователь заново покупает подписку после истечения

### 4. Custom Plans

**Правило:** Кастомные планы (`isCustom = true`) не показываются в публичном списке

**Use case:** Индивидуальные планы для партнеров или специальные акции

**Создание:**
```typescript
// Admin создает кастомный план
await subscriptionPlanService.createPlan({
  name: 'VIP Partner',
  maxConfigs: 20,
  durationDays: 365,
  price: 500,
  isCustom: true,  // ← Не появится в /api/subscriptions/plans
});

// Admin вручную создает подписку для пользователя
await subscriptionService.createSubscription({
  userId: 'partner-id',
  planId: vipPlanId,
});
```

## Cron Jobs

### Automatic Expiration

**Задача:** Автоматически истекать подписки

**Cron:** Каждый час

```typescript
// cron/expire-subscriptions.ts
import { subscriptionService } from '@/modules/subscriptions';

export async function expireSubscriptions() {
  const count = await subscriptionService.expireOldSubscriptions();
  console.log(`Expired ${count} subscriptions`);
}
```

**Vercel Cron:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/expire-subscriptions",
      "schedule": "0 * * * *"  // Каждый час
    }
  ]
}
```

### Expiration Notifications

**Задача:** Уведомления о скором истечении

**Cron:** Каждый день в 10:00

```typescript
import { subscriptionService } from '@/modules/subscriptions';
import { notificationService } from '@/modules/notifications';

export async function sendExpirationNotifications() {
  // Подписки, истекающие через 7 дней
  const expiring = await subscriptionService.getExpiringSubscriptions(7);

  for (const sub of expiring) {
    await notificationService.send({
      userId: sub.userId,
      type: 'subscription_expiring',
      message: `Your subscription expires in 7 days`,
    });
  }
}
```

## Troubleshooting

### Проблема: "User already has an active subscription"

**Причина:** Попытка создать вторую активную подписку

**Диагностика:**
```sql
SELECT * FROM subscriptions
WHERE user_id = 'xxx' AND status = 'active';
```

**Решение:**
1. Отменить текущую подписку перед созданием новой
2. Или дождаться истечения

### Проблема: Подписка не истекает автоматически

**Причина:** Cron job не запущен

**Решение:**
1. Проверить что cron настроен
2. Вручную запустить:
```typescript
await subscriptionService.expireOldSubscriptions();
```

### Проблема: Cannot delete plan with active subscriptions

**Причина:** План используется активными подписками

**Диагностика:**
```sql
SELECT COUNT(*) FROM subscriptions
WHERE plan_id = 'xxx' AND status = 'active';
```

**Решение:**
1. Дождаться истечения всех подписок
2. Или перенести пользователей на другой план (admin)

## Testing

### Unit Tests

```bash
npm test -- src/modules/subscriptions
```

### Integration Tests

**Create Subscription:**
```bash
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "planId": "basic-plan"
  }'
```

**Cancel Subscription:**
```bash
curl -X POST http://localhost:3000/api/subscriptions/<id>/cancel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Test cancellation"
  }'
```

## Roadmap

- [ ] Proration (возврат средств при отмене)
- [ ] Subscription pause/resume
- [ ] Family plans (shared subscription)
- [ ] Gift subscriptions
- [ ] Trial period support
- [ ] Subscription webhooks для внешних интеграций
