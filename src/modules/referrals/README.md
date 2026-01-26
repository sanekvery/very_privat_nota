# REFERRALS Module

Модуль реферальной системы с балансами, начислениями, выводом средств и настройками.

## Ответственность

- Расчет реферальных балансов
- Статистика по рефералам
- История начислений и выводов
- Управление запросами на вывод средств
- Настройка параметров реферальной системы
- Админская статистика

## Архитектура

```
src/modules/referrals/
├── referrals.types.ts           # Типы домена (11+ интерфейсов)
├── referrals.validation.ts      # Zod схемы валидации
├── referral.service.ts          # Сервис реферальной системы
└── README.md
```

## Связь с PAYMENTS модулем

**ВАЖНО:** Логика начисления реферальных комиссий реализована в PAYMENTS модуле:
- `PaymentService.processReferralCommission()` создает `ReferralTransaction` при успешном платеже
- Автоматическое определение первого/повторного платежа
- Разные проценты для первого и повторных платежей
- Настройки берутся из `SystemSettings`

REFERRALS модуль **только отображает** уже начисленные комиссии, не создает их.

## Типы

### ReferralBalance
```typescript
interface ReferralBalance {
  userId: string;
  totalEarned: number;      // Всего заработано
  availableBalance: number; // Доступно для вывода
  pendingBalance: number;   // В обработке (pending withdrawals)
  withdrawnTotal: number;   // Уже выведено
  currency: string;         // 'TON'
}
```

### ReferralStatistics
```typescript
interface ReferralStatistics {
  userId: string;
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;  // С активной подпиской
  totalEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  balance: ReferralBalance;
  topReferrals: TopReferral[];
}
```

### TopReferral
```typescript
interface TopReferral {
  userId: string;
  username?: string;
  totalSpent: number;
  earnedFromUser: number;
  joinedAt: Date;
}
```

### ReferralSettings
```typescript
interface ReferralSettings {
  firstPaymentPercentage: number;   // e.g., 20
  recurringPercentage: number;      // e.g., 10
  minWithdrawalAmount: number;      // e.g., 5 TON
  withdrawalsEnabled: boolean;      // Вкл/выкл вывод средств
}
```

### CreateWithdrawalInput
```typescript
interface CreateWithdrawalInput {
  userId: string;
  amount: number;
  tonAddress: string;  // 48 символов, alphanumeric + _-
}
```

### AdminReferralStatistics
```typescript
interface AdminReferralStatistics {
  totalReferrers: number;
  totalReferrals: number;
  totalEarnings: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  topReferrers: Array<{
    userId: string;
    username?: string;
    referralCount: number;
    totalEarnings: number;
  }>;
  recentTransactions: ReferralTransactionWithRelations[];
}
```

## ReferralService

### Методы

#### getReferralBalance(userId)
```typescript
const balance = await referralService.getReferralBalance('user-uuid');
// Returns: ReferralBalance
```

Вычисляет баланс пользователя:
- `totalEarned` - сумма всех `ReferralTransaction`
- `withdrawnTotal` - сумма `WithdrawalRequest` со status='completed'
- `pendingBalance` - сумма withdrawals со status='pending' или 'processing'
- `availableBalance` = totalEarned - withdrawnTotal - pendingBalance

#### getReferralStatistics(userId)
```typescript
const stats = await referralService.getReferralStatistics('user-uuid');
// Returns: ReferralStatistics
```

Комплексная статистика:
- Общее количество рефералов (где `referredBy = user.referralCode`)
- Активные рефералы (с активной подпиской)
- Заработок за текущий/прошлый месяц
- Топ-10 рефералов по earnings
- Текущий баланс

#### getReferralHistory(query)
```typescript
const history = await referralService.getReferralHistory({
  userId: 'user-uuid',
  limit: 20,
  offset: 0,
  sortBy: 'date',
  order: 'desc',
  type: 'earning', // 'earning' | 'withdrawal' | undefined
});
// Returns: { transactions, withdrawals, total }
```

История начислений и выводов.

#### createWithdrawal(input)
```typescript
const withdrawal = await referralService.createWithdrawal({
  userId: 'user-uuid',
  amount: 10,
  tonAddress: 'EQDabc123...',
});
// Returns: WithdrawalRequest
```

Создает запрос на вывод средств:
1. Проверяет, включен ли вывод (settings.withdrawalsEnabled)
2. Проверяет минимальную сумму
3. Проверяет доступный баланс
4. Создает withdrawal request со status='pending'

#### getWithdrawal(withdrawalId)
```typescript
const withdrawal = await referralService.getWithdrawal('withdrawal-uuid');
// Returns: WithdrawalRequestWithRelations
```

Получает детали withdrawal request с данными пользователя.

#### updateWithdrawalStatus(withdrawalId, status, metadata)
```typescript
const withdrawal = await referralService.updateWithdrawalStatus(
  'withdrawal-uuid',
  'completed',
  {
    transactionHash: 'abc123...',
  }
);
```

Обновляет статус withdrawal (admin only):
- `pending` → `processing` → `completed`
- `pending` → `rejected` (с указанием причины)
- При status='completed' устанавливает `processedAt` и сохраняет transactionHash

#### listWithdrawals(params)
```typescript
const result = await referralService.listWithdrawals({
  status: 'pending',
  userId: 'user-uuid',  // optional
  limit: 20,
  offset: 0,
});
// Returns: { withdrawals, total }
```

Список withdrawal requests с фильтрацией.

#### getReferralSettings()
```typescript
const settings = await referralService.getReferralSettings();
// Returns: ReferralSettings
```

Получает настройки из `SystemSettings`:
- `referral_first_payment_percentage` (default: 20)
- `referral_recurring_percentage` (default: 10)
- `referral_min_withdrawal_amount` (default: 5)
- `referral_withdrawals_enabled` (default: false)

#### updateReferralSettings(updates)
```typescript
const settings = await referralService.updateReferralSettings({
  firstPaymentPercentage: 25,
  withdrawalsEnabled: true,
});
```

Обновляет настройки реферальной системы (admin only).

#### getEarningsSummary(userId, period)
```typescript
const summary = await referralService.getEarningsSummary(
  'user-uuid',
  'month'  // 'day' | 'week' | 'month' | 'year'
);
// Returns: ReferralEarningsSummary
```

Сводка по earnings за период.

#### getAdminStatistics()
```typescript
const stats = await referralService.getAdminStatistics();
// Returns: AdminReferralStatistics
```

Админская статистика:
- Общее количество реферреров и рефералов
- Всего заработано и выведено
- Pending withdrawals сумма
- Топ-10 реферреров
- 20 последних транзакций

## API Endpoints

### Пользовательские endpoints

#### GET /api/referrals/balance
Получить реферальный баланс текущего пользователя.

**Response:**
```json
{
  "userId": "user-uuid",
  "totalEarned": 150.5,
  "availableBalance": 145.5,
  "pendingBalance": 5,
  "withdrawnTotal": 0,
  "currency": "TON"
}
```

#### GET /api/referrals/statistics
Получить статистику по рефералам.

**Response:**
```json
{
  "userId": "user-uuid",
  "referralCode": "ABCD1234",
  "totalReferrals": 25,
  "activeReferrals": 18,
  "totalEarnings": 150.5,
  "thisMonthEarnings": 45.2,
  "lastMonthEarnings": 38.6,
  "balance": { ... },
  "topReferrals": [
    {
      "userId": "ref-uuid",
      "username": "user123",
      "totalSpent": 100,
      "earnedFromUser": 20,
      "joinedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### GET /api/referrals/history
Получить историю начислений и выводов.

**Query params:**
- `limit` (number, default 20, max 100)
- `offset` (number, default 0)
- `sortBy` ('date' | 'amount', default 'date')
- `order` ('asc' | 'desc', default 'desc')
- `type` ('earning' | 'withdrawal', optional)

**Response:**
```json
{
  "transactions": [
    {
      "id": "txn-uuid",
      "referrerId": "user-uuid",
      "referredUserId": "ref-uuid",
      "paymentId": "payment-uuid",
      "amount": 10,
      "percentage": 20,
      "isFirstPayment": true,
      "createdAt": "2024-01-20T10:00:00Z",
      "referredUser": {
        "id": "ref-uuid",
        "username": "user123"
      }
    }
  ],
  "withdrawals": [
    {
      "id": "withdrawal-uuid",
      "userId": "user-uuid",
      "amount": 50,
      "tonAddress": "EQDabc123...",
      "status": "completed",
      "requestedAt": "2024-01-18T10:00:00Z",
      "processedAt": "2024-01-19T14:30:00Z",
      "transactionHash": "abc123..."
    }
  ],
  "total": 15
}
```

#### GET /api/referrals/withdrawals
Получить список withdrawal requests текущего пользователя.

**Query params:**
- `limit` (number, default 20, max 100)
- `offset` (number, default 0)

**Response:**
```json
{
  "withdrawals": [...],
  "total": 5
}
```

#### POST /api/referrals/withdrawals
Создать запрос на вывод средств.

**Body:**
```json
{
  "amount": 50,
  "tonAddress": "EQDabc123..."
}
```

**Валидация:**
- `amount` > 0
- `amount` >= `minWithdrawalAmount` (из settings)
- `amount` <= `availableBalance`
- `tonAddress` - 48 символов, формат: `[a-zA-Z0-9_-]+`
- `withdrawalsEnabled` = true (из settings)

**Response:** WithdrawalRequest

#### GET /api/referrals/withdrawals/:withdrawalId
Получить детали withdrawal request.

**Access:** Пользователь может видеть только свои withdrawals, админ - все.

### Админские endpoints

#### GET /api/referrals/settings
Получить настройки реферальной системы.

**Response:**
```json
{
  "firstPaymentPercentage": 20,
  "recurringPercentage": 10,
  "minWithdrawalAmount": 5,
  "withdrawalsEnabled": false
}
```

#### PATCH /api/referrals/settings
Обновить настройки (admin only).

**Body:**
```json
{
  "firstPaymentPercentage": 25,
  "recurringPercentage": 12,
  "minWithdrawalAmount": 10,
  "withdrawalsEnabled": true
}
```

Все поля опциональны.

#### PATCH /api/referrals/withdrawals/:withdrawalId
Обновить статус withdrawal request (admin only).

**Body:**
```json
{
  "status": "completed",
  "transactionHash": "abc123..."
}
```

**Или для rejection:**
```json
{
  "status": "rejected",
  "rejectionReason": "Invalid TON address"
}
```

#### GET /api/referrals/admin/withdrawals
Список всех withdrawal requests (admin only).

**Query params:**
- `status` ('pending' | 'processing' | 'completed' | 'rejected', optional)
- `userId` (UUID, optional)
- `limit` (number, default 20, max 100)
- `offset` (number, default 0)

**Response:**
```json
{
  "withdrawals": [...],
  "total": 150
}
```

#### GET /api/referrals/admin/statistics
Админская статистика (admin only).

**Response:**
```json
{
  "totalReferrers": 250,
  "totalReferrals": 1500,
  "totalEarnings": 15000,
  "totalWithdrawals": 5000,
  "pendingWithdrawals": 500,
  "topReferrers": [
    {
      "userId": "user-uuid",
      "username": "top_referrer",
      "referralCount": 85,
      "totalEarnings": 850
    }
  ],
  "recentTransactions": [...]
}
```

## Интеграции

### С модулем AUTH
- Использует `User.referralCode` для связывания реферера и реферала
- Использует `User.referredBy` для определения реферала

### С модулем PAYMENTS
- **ВАЖНО:** PAYMENTS модуль создает `ReferralTransaction` при успешном платеже
- `PaymentService.processReferralCommission()` вызывается автоматически
- REFERRALS модуль только читает транзакции, не создает их

### С Prisma
- `ReferralTransaction` - начисления комиссий
- `WithdrawalRequest` - запросы на вывод средств
- `SystemSettings` - настройки реферальной системы

## Примеры использования

### Получить баланс и статистику
```typescript
import { referralService } from '@/modules/referrals/referral.service';

// Баланс
const balance = await referralService.getReferralBalance('user-uuid');
console.log(`Available: ${balance.availableBalance} TON`);

// Полная статистика
const stats = await referralService.getReferralStatistics('user-uuid');
console.log(`Referrals: ${stats.totalReferrals} (${stats.activeReferrals} active)`);
console.log(`This month: ${stats.thisMonthEarnings} TON`);
```

### Создать withdrawal request
```typescript
try {
  const withdrawal = await referralService.createWithdrawal({
    userId: 'user-uuid',
    amount: 50,
    tonAddress: 'EQDabc123...',
  });

  console.log(`Withdrawal request created: ${withdrawal.id}`);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.message); // e.g., "Insufficient balance"
  }
}
```

### Обработать withdrawal (админ)
```typescript
// Одобрить и выполнить
const withdrawal = await referralService.updateWithdrawalStatus(
  'withdrawal-uuid',
  'processing'
);

// После успешной транзакции в TON
await referralService.updateWithdrawalStatus(
  'withdrawal-uuid',
  'completed',
  {
    transactionHash: 'abc123...',
  }
);

// Или отклонить
await referralService.updateWithdrawalStatus(
  'withdrawal-uuid',
  'rejected',
  {
    rejectionReason: 'Invalid TON address format',
  }
);
```

### Настроить параметры (админ)
```typescript
// Увеличить процент для первого платежа
await referralService.updateReferralSettings({
  firstPaymentPercentage: 25,
});

// Включить вывод средств
await referralService.updateReferralSettings({
  withdrawalsEnabled: true,
  minWithdrawalAmount: 10,
});
```

### Админская статистика
```typescript
const stats = await referralService.getAdminStatistics();

console.log(`Total referrers: ${stats.totalReferrers}`);
console.log(`Total earnings: ${stats.totalEarnings} TON`);
console.log(`Pending withdrawals: ${stats.pendingWithdrawals} TON`);

// Топ реферреров
stats.topReferrers.forEach((ref, i) => {
  console.log(`${i + 1}. ${ref.username}: ${ref.referralCount} refs, ${ref.totalEarnings} TON`);
});
```

## Логика начисления комиссий

**ВАЖНО:** Начисление происходит в PAYMENTS модуле!

Когда реферал совершает платеж:

1. `PaymentService.completePayment()` вызывается при успешном платеже
2. Проверяется, есть ли у пользователя реферер (`user.referredBy`)
3. Если да, вызывается `processReferralCommission()`
4. Определяется, это первый платеж или повторный:
   - Подсчитывается количество предыдущих completed платежей
   - Если 0 → первый платеж → используется `referral_first_payment_percentage`
   - Если >0 → повторный → используется `referral_recurring_percentage`
5. Вычисляется сумма комиссии: `amount * (percentage / 100)`
6. Создается `ReferralTransaction`:
   ```typescript
   {
     referrerId: referrer.id,
     referredUserId: payment.userId,
     paymentId: payment.id,
     amount: commissionAmount,
     percentage: percentage,
     isFirstPayment: isFirstPayment,
   }
   ```

**REFERRALS модуль НЕ создает транзакции**, только отображает их.

## Состояния Withdrawal Request

```
pending → processing → completed
   ↓
rejected
```

- **pending**: Создан пользователем, ожидает обработки
- **processing**: Админ начал обработку, транзакция в процессе
- **completed**: Транзакция выполнена, средства отправлены
- **rejected**: Отклонен админом (с указанием причины)

## Валидация

### TON Address
```typescript
z.string()
  .min(48)
  .max(48)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid TON address format')
```

Стандартный формат TON адреса (48 символов base64url).

### Referral Code
```typescript
z.string()
  .min(6)
  .max(20)
  .regex(/^[A-Z0-9]+$/, 'Must contain only uppercase letters and numbers')
```

## Performance Considerations

### Медленные операции
- `getAdminStatistics()` - выполняет множественные запросы для каждого реферрера
- `getReferralStatistics()` - агрегирует данные по всем рефералам пользователя

### Рекомендации
- Кешировать admin statistics в Redis (обновлять раз в 5-10 минут)
- Использовать pagination для списков
- Индексы на:
  - `ReferralTransaction.referrerId`
  - `ReferralTransaction.referredUserId`
  - `WithdrawalRequest.userId`
  - `WithdrawalRequest.status`

## Возможные улучшения

1. **Автоматическая обработка withdrawals**: Интеграция с TON API для автоматических выплат
2. **Уровни реферальной программы**: Многоуровневая система (MLM)
3. **Бонусы за достижения**: Дополнительные проценты при определенном количестве рефералов
4. **Реферальные конкурсы**: Временные акции с повышенными процентами
5. **Кеширование статистики**: Redis cache для частых запросов
6. **Уведомления**: Автоматические уведомления при начислениях и изменении статуса withdrawal
7. **История изменений withdrawal**: Audit log для отслеживания изменений статуса
8. **Лимиты на withdrawals**: Максимальная сумма вывода в день/неделю/месяц
