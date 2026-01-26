# PAYMENTS Module

Модуль управления платежами, интеграцией с TON blockchain и промокодами.

## 📋 Содержание

- [Архитектура](#архитектура)
- [Компоненты](#компоненты)
- [Сервисы](#сервисы)
- [API Endpoints](#api-endpoints)
- [Workflow платежей](#workflow-платежей)
- [TON Integration](#ton-integration)
- [Промокоды](#промокоды)
- [Реферальная система](#реферальная-система)
- [Настройка](#настройка)
- [Troubleshooting](#troubleshooting)

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     PAYMENTS MODULE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Payment   │  │  PromoCode   │  │     TON      │       │
│  │   Service   │  │   Service    │  │   Service    │       │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                │                  │               │
│         │                │                  │               │
│         ├────────────────┼──────────────────┤               │
│         │                │                  │               │
│  ┌──────▼────────────────▼──────────────────▼───────┐       │
│  │              Prisma Database                     │       │
│  │  - payments                                      │       │
│  │  - promo_codes                                   │       │
│  │  - promo_activations                             │       │
│  │  - referral_transactions                         │       │
│  └──────────────────────────────────────────────────┘       │
│                                                             │
│  External:                                                  │
│  ┌──────────────────────┐                                   │
│  │   TON Blockchain     │  ← Transaction verification       │
│  └──────────────────────┘                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Компоненты

### 1. PaymentService

Управление платежами и их жизненным циклом.

**Основные методы:**

```typescript
class PaymentService {
  // Create payment
  async createPayment(input: CreatePaymentInput): Promise<Payment>

  // Get payment info
  async getPaymentById(paymentId: string): Promise<PaymentWithRelations>
  async getUserPayments(userId: string, filters?): Promise<UserPaymentHistory>

  // Payment lifecycle
  async updatePaymentStatus(input: UpdatePaymentStatusInput): Promise<Payment>
  async verifyTonPayment(paymentId: string, transactionHash: string): Promise<Payment>
  async handleTonWebhook(payload: TonWebhookPayload): Promise<void>

  // Admin operations
  async refundPayment(request: RefundRequest): Promise<Payment>
  async getPaymentStats(): Promise<PaymentStats>
  async deletePayment(paymentId: string): Promise<void>
}
```

### 2. PromoCodeService

Управление промокодами и их активацией.

**Основные методы:**

```typescript
class PromoCodeService {
  // Create/manage promo codes (admin)
  async createPromoCode(input: CreatePromoCodeInput): Promise<PromoCode>
  async updatePromoCode(promoCodeId: string, updates): Promise<PromoCode>
  async deletePromoCode(promoCodeId: string): Promise<void>

  // Validate and activate
  async validatePromoCode(code: string, userId?: string): Promise<PromoCodeValidation>
  async activatePromoCode(code: string, userId: string): Promise<{ promoCode, subscriptionId }>

  // Statistics
  async getPromoCodeStats(promoCodeId: string): Promise<PromoCodeStats>
  async getUserPromoActivations(userId: string): Promise<PromoActivation[]>
}
```

### 3. TonService

Интеграция с TON blockchain для обработки криптовалютных платежей.

**Основные методы:**

```typescript
class TonService {
  // Amount conversion
  nanoToTon(nanoton: string | number): number
  tonToNano(ton: number): string

  // Wallet operations
  getMerchantAddress(): string
  isValidAddress(address: string): boolean
  generatePaymentLink(amount: number, comment?: string): string

  // Transaction verification
  async verifyTransaction(
    transactionHash: string,
    expectedAmount: number,
    expectedRecipient?: string
  ): Promise<TonPaymentVerification>

  async getTransaction(transactionHash: string): Promise<TonTransaction | null>
  async getRecentTransactions(limit?: number): Promise<TonTransaction[]>
}
```

---

## API Endpoints

### User Endpoints

#### `POST /api/payments`
Создать новый платеж.

**Request:**
```typescript
{
  planId?: string          // UUID плана подписки
  amount: number           // Сумма платежа
  currency?: string        // Валюта (default: TON)
  method: 'ton' | 'promo_code' | 'manual'
  tonWalletAddress?: string
  promoCodeId?: string
  metadata?: Record<string, unknown>
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    payment: Payment,
    paymentLink?: string  // TON payment link (ton://transfer/...)
  }
}
```

#### `GET /api/payments`
Получить историю платежей пользователя.

**Query params:**
- `status` - фильтр по статусу (pending, completed, failed, refunded)
- `limit` - лимит записей (default: 20)
- `offset` - смещение для пагинации

**Response:**
```typescript
{
  userId: string
  totalPaid: number
  totalPayments: number
  lastPaymentDate?: Date
  payments: PaymentWithRelations[]
}
```

#### `GET /api/payments/:paymentId`
Получить детали платежа.

**Response:**
```typescript
{
  success: true,
  data: PaymentWithRelations
}
```

#### `POST /api/payments/:paymentId/verify`
Верифицировать TON платеж по transaction hash.

**Request:**
```typescript
{
  transactionHash: string  // TON transaction hash
}
```

**Response:**
```typescript
{
  success: true,
  data: Payment,           // Updated payment with status 'completed'
  message: "Payment verified successfully"
}
```

---

### Promo Code Endpoints

#### `POST /api/promo/validate`
Проверить валидность промокода.

**Request:**
```typescript
{
  code: string  // Promo code (uppercase)
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    isValid: boolean
    promoCode?: PromoCode
    reason?: string  // If invalid: "Promo code has expired", etc.
  }
}
```

#### `POST /api/promo/activate`
Активировать промокод (создает подписку).

**Request:**
```typescript
{
  code: string
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    promoCode: PromoCode,
    subscriptionId: string
  },
  message: "Promo code activated successfully"
}
```

---

### Admin Endpoints

#### `POST /api/promo` (Admin)
Создать новый промокод.

**Request:**
```typescript
{
  code: string              // Uppercase alphanumeric (4-20 chars)
  planId: string            // UUID
  durationDays: number      // 1-365
  maxUses?: number          // Optional usage limit
  expiresAt?: Date          // Optional expiration date
}
```

#### `GET /api/promo` (Admin)
Получить список всех промокодов.

**Query params:**
- `isActive` - фильтр по активности (true/false)
- `planId` - фильтр по плану

#### `GET /api/admin/payments/stats` (Admin)
Статистика платежей.

**Response:**
```typescript
{
  totalRevenue: number
  totalCompleted: number
  totalPending: number
  totalFailed: number
  revenueThisMonth: number
  revenueToday: number
  averagePaymentAmount: number
  topPaymentMethod: 'ton' | 'promo_code' | 'manual'
}
```

#### `POST /api/admin/payments/:paymentId/refund` (Admin)
Вернуть платеж.

**Request:**
```typescript
{
  reason: string           // Причина возврата
  amount?: number          // Частичный возврат (optional)
}
```

---

### Webhook Endpoint

#### `POST /api/payments/webhook/ton`
TON blockchain webhook (вызывается TON gateway автоматически).

**Request:**
```typescript
{
  transactionHash: string
  from: string             // Sender wallet
  to: string               // Recipient wallet
  amount: string           // Amount in nanoTON
  comment?: string         // Payment comment (может содержать paymentId)
  timestamp: number
}
```

**Логика:**
1. Проверяет, что получатель = наш merchant wallet
2. Конвертирует nanoTON в TON
3. Ищет pending payment по:
   - Comment (если содержит `payment_<uuid>`)
   - Amount (если payment с таким amount и status=pending)
4. Обновляет payment status → completed
5. Автоматически создает subscription через `handlePaymentCompleted`

---

## Workflow платежей

### 1. TON Payment Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. POST /api/payments
     │    { planId, amount, method: 'ton' }
     ▼
┌────────────────┐
│ PaymentService │
└────┬───────────┘
     │ 2. Create payment (status: pending)
     │ 3. Generate TON payment link
     ▼
┌──────────┐
│  User    │ 4. Opens TON wallet via payment link
└────┬─────┘    ton://transfer/{merchant}?amount={nano}&text=payment_{id}
     │
     │ 5. Sends TON transaction
     ▼
┌──────────────┐
│ TON Network  │
└────┬─────────┘
     │ 6. Transaction confirmed
     │ 7. Webhook → POST /api/payments/webhook/ton
     ▼
┌────────────────┐
│ PaymentService │
└────┬───────────┘
     │ 8. Find payment by amount/comment
     │ 9. Update status → completed
     │ 10. Create subscription (via SubscriptionService)
     │ 11. Process referral commission (if applicable)
     ▼
┌──────────┐
│  User    │ Subscription active!
└──────────┘
```

### 2. Manual Verification Flow

Если webhook не работает, пользователь может верифицировать платеж вручную:

```
1. User создает payment → status: pending
2. User отправляет TON через любой wallet
3. User копирует transaction hash
4. POST /api/payments/{paymentId}/verify
   { transactionHash: "..." }
5. TonService верифицирует transaction на blockchain
6. Payment status → completed
7. Subscription создается автоматически
```

### 3. Promo Code Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. POST /api/promo/validate
     │    { code: "SUMMER2024" }
     ▼
┌──────────────────┐
│ PromoCodeService │
└────┬─────────────┘
     │ 2. Validate:
     │    - isActive?
     │    - Not expired?
     │    - Usage limit not reached?
     │    - User hasn't used before?
     ▼
     { isValid: true, promoCode: {...} }

┌──────────┐
│  User    │
└────┬─────┘
     │ 3. POST /api/promo/activate
     │    { code: "SUMMER2024" }
     ▼
┌──────────────────┐
│ PromoCodeService │
└────┬─────────────┘
     │ 4. Transaction:
     │    - Increment usedCount
     │    - Create PromoActivation record
     │ 5. Create Subscription
     ▼
┌──────────┐
│  User    │ Subscription active!
└──────────┘
```

---

## TON Integration

### Environment Variables

```bash
# .env.local

# Merchant wallet address (receives payments)
TON_WALLET_ADDRESS=EQD...  # 48 chars base64

# TON API key (for transaction verification)
TON_API_KEY=your_api_key

# Network (mainnet or testnet)
TON_NETWORK=testnet

# Mock mode for development (no real blockchain calls)
TON_MOCK_MODE=true
```

### TON Address Validation

TON addresses:
- **Length:** 48 characters
- **Format:** Base64 URL-safe (`A-Za-z0-9_-`)
- **Prefix:** `EQ` (bounceable) or `UQ` (non-bounceable)

```typescript
// Example valid addresses
EQD1234567890123456789012345678901234567890123
UQD9876543210987654321098765432109876543210987
```

### TON Amount Conversion

```typescript
// 1 TON = 1,000,000,000 nanoTON (1e9)

// Convert nanoTON to TON
tonService.nanoToTon('5000000000')  // → 5.0 TON

// Convert TON to nanoTON
tonService.tonToNano(5.0)           // → '5000000000'
```

### Payment Link Generation

```typescript
const paymentLink = tonService.generatePaymentLink(
  5.0,                    // amount in TON
  'payment_123-456-789'   // comment (payment ID)
)

// Returns:
// ton://transfer/EQD.../amount=5000000000&text=payment_123-456-789

// User's wallet will open with pre-filled:
// - Recipient: merchant wallet
// - Amount: 5.0 TON
// - Comment: payment_123-456-789
```

### Mock Mode

Для разработки без реального TON API:

```bash
TON_MOCK_MODE=true
```

В mock mode:
- ✅ `verifyTransaction()` всегда возвращает success
- ✅ Все validation проходит
- ✅ Можно тестировать полный payment flow
- ❌ Реальные blockchain calls не выполняются

**Production:** Интегрировать с [@ton/ton](https://github.com/ton-org/ton) или [tonweb](https://github.com/toncenter/tonweb).

---

## Промокоды

### Создание промокода (Admin)

```typescript
POST /api/promo
{
  code: "SUMMER2024",      // Uppercase alphanumeric
  planId: "plan-uuid",     // Plan to grant
  durationDays: 30,        // Subscription duration
  maxUses: 100,            // Optional: usage limit
  expiresAt: "2024-12-31"  // Optional: expiration date
}
```

### Валидация промокода

Промокод считается **валидным**, если:

1. ✅ `isActive = true`
2. ✅ `expiresAt` не наступила (или null)
3. ✅ `usedCount < maxUses` (или maxUses = null)
4. ✅ User не использовал этот промокод ранее

### Активация промокода

При активации промокода:

1. **Increment `usedCount`** (atomic)
2. **Create `PromoActivation`** record
3. **Create `Subscription`** для user
4. **Return** `{ promoCode, subscriptionId }`

**Transaction Safety:**

```typescript
// Atomic increment + activation record
await prisma.$transaction(async (tx) => {
  await tx.promoCode.update({
    where: { id: promoCode.id },
    data: { usedCount: { increment: 1 } }
  })

  await tx.promoActivation.create({
    data: { promoCodeId: promoCode.id, userId }
  })
})

// Then create subscription
await subscriptionService.createSubscription({ userId, planId })
```

---

## Реферальная система

### Автоматическая обработка комиссий

При завершении платежа (`status = completed`):

```typescript
handlePaymentCompleted(payment) {
  1. Create Subscription
  2. Process Referral Commission ← автоматически
}
```

### Логика комиссий

```typescript
processReferralCommission(payment) {
  // 1. Find referrer by user.referredBy code
  const referrer = await prisma.user.findUnique({
    where: { referralCode: user.referredBy }
  })

  // 2. Check if this is first payment
  const isFirstPayment = (previousCompletedPayments === 0)

  // 3. Get commission percentage from SystemSettings
  const settingKey = isFirstPayment
    ? 'referral_first_payment_percentage'    // default: 20%
    : 'referral_recurring_percentage'        // default: 10%

  // 4. Calculate commission
  const percentage = Number(setting.value)
  const commission = payment.amount * (percentage / 100)

  // 5. Create ReferralTransaction
  await prisma.referralTransaction.create({
    referrerId, referredUserId, paymentId,
    amount: commission, percentage, isFirstPayment
  })

  // 6. Update referrer balance
  await prisma.user.update({
    where: { id: referrer.id },
    data: {
      referralBalance: { increment: commission },
      totalEarned: { increment: commission }
    }
  })
}
```

### Настройка процентов комиссии

```sql
-- System Settings для реферальных комиссий

INSERT INTO system_settings (key, value, description) VALUES
  ('referral_first_payment_percentage', '20', 'Процент комиссии за первый платеж'),
  ('referral_recurring_percentage', '10', 'Процент комиссии за повторные платежи');
```

**Пример:**

- User A приглашает User B (referralCode: `ABC123`)
- User B регистрируется с `referredBy = ABC123`
- User B делает первый платеж: **100 TON**
  - Referrer A получает: `100 * 0.20 = 20 TON`
- User B делает второй платеж: **100 TON**
  - Referrer A получает: `100 * 0.10 = 10 TON`

---

## Настройка

### 1. Environment Variables

```bash
# TON Configuration
TON_WALLET_ADDRESS=EQD...
TON_API_KEY=your_ton_api_key
TON_NETWORK=testnet
TON_MOCK_MODE=true  # Development only

# Database (already configured in main .env)
DATABASE_URL=postgresql://...
```

### 2. Database Migration

```bash
npx prisma migrate dev --name add_payments
```

### 3. Seed Data (Optional)

```sql
-- Create test subscription plan
INSERT INTO subscription_plans (id, name, price, duration_days)
VALUES ('plan-1', 'Monthly VPN', 5.0, 30);

-- Create test promo code
INSERT INTO promo_codes (id, code, plan_id, duration_days, is_active, used_count)
VALUES ('promo-1', 'TEST2024', 'plan-1', 30, true, 0);

-- Set referral commission percentages
INSERT INTO system_settings (key, value) VALUES
  ('referral_first_payment_percentage', '20'),
  ('referral_recurring_percentage', '10');
```

### 4. TON Webhook Setup

**Development:** Use ngrok для локального тестирования webhooks:

```bash
ngrok http 3000
# Webhook URL: https://{ngrok-id}.ngrok.io/api/payments/webhook/ton
```

**Production:** Настроить webhook в TON payment gateway:

```
Webhook URL: https://yourdomain.com/api/payments/webhook/ton
Events: transaction.confirmed
```

---

## Troubleshooting

### Payment не создается

**Симптомы:**
```
ValidationError: Payment amount must be positive
```

**Решение:**
- Проверить, что `amount > 0`
- Проверить, что `amount <= 100000` (макс. лимит)
- Для TON платежей: проверить валидность `tonWalletAddress` (48 chars)

---

### TON Transaction Verification Failed

**Симптомы:**
```
ExternalServiceError: TON verification not implemented
```

**Причины:**
1. `TON_MOCK_MODE=false`, но TON API не настроен
2. Неверный `TON_API_KEY`
3. Transaction hash не найден на blockchain

**Решение:**

**Development:**
```bash
TON_MOCK_MODE=true  # Use mock mode
```

**Production:**
```typescript
// Implement real TON API integration in ton.service.ts:

import { TonClient } from '@ton/ton'

const client = new TonClient({
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  apiKey: process.env.TON_API_KEY
})

async verifyTransaction(hash, expectedAmount, recipient) {
  const tx = await client.getTransactions(recipient, { limit: 100 })
  const found = tx.find(t => t.hash === hash)

  if (!found) return { isValid: false, error: 'Transaction not found' }
  if (found.value !== expectedAmount) return { isValid: false, error: 'Amount mismatch' }

  return { isValid: true, amount: found.value, ... }
}
```

---

### Webhook не получен

**Симптомы:**
- Payment создан, TON отправлен, но payment status = pending

**Решение:**

1. **Проверить webhook URL:**
   ```bash
   curl -X POST https://yourdomain.com/api/payments/webhook/ton \
     -H "Content-Type: application/json" \
     -d '{
       "transactionHash": "test123",
       "from": "EQD...",
       "to": "EQD...",
       "amount": "5000000000",
       "timestamp": 1234567890
     }'
   ```

2. **Проверить логи webhook endpoint:**
   ```bash
   docker compose logs -f app | grep "TON webhook"
   ```

3. **Manual verification как fallback:**
   ```typescript
   POST /api/payments/{paymentId}/verify
   { transactionHash: "..." }
   ```

---

### Promo Code Already Used

**Симптомы:**
```
ValidationError: You have already used this promo code
```

**Причина:**
- User уже активировал этот промокод ранее
- Запись в `promo_activations` существует

**Решение:**
- Каждый промокод можно использовать **один раз на пользователя**
- Создать новый промокод для повторного использования
- Или удалить запись из `promo_activations` (admin only):

```sql
DELETE FROM promo_activations
WHERE promo_code_id = 'promo-id' AND user_id = 'user-id';
```

---

### Referral Commission Not Created

**Симптомы:**
- Payment completed, но commission не начислена

**Проверки:**

1. **User has referrer:**
   ```sql
   SELECT referred_by FROM users WHERE id = 'user-id';
   ```

2. **Referrer exists:**
   ```sql
   SELECT * FROM users WHERE referral_code = 'ABC123';
   ```

3. **System settings configured:**
   ```sql
   SELECT * FROM system_settings
   WHERE key IN ('referral_first_payment_percentage', 'referral_recurring_percentage');
   ```

4. **Check logs:**
   ```bash
   docker compose logs -f app | grep "Referral commission"
   ```

---

## Security Considerations

### 1. Webhook Signature Verification

**TODO:** Implement webhook signature verification:

```typescript
// In webhook endpoint
const signature = request.headers.get('X-TON-Signature')
const isValid = verifyWebhookSignature(body, signature, TON_WEBHOOK_SECRET)

if (!isValid) {
  throw new Error('Invalid webhook signature')
}
```

### 2. Payment Amount Limits

```typescript
// Max payment amount: 100,000 TON
const MAX_PAYMENT_AMOUNT = 100000

if (amount > MAX_PAYMENT_AMOUNT) {
  throw new ValidationError('Payment amount exceeds maximum limit')
}
```

### 3. Idempotency для Webhooks

```typescript
// Prevent duplicate webhook processing
const existingPayment = await prisma.payment.findFirst({
  where: { tonTransactionHash: transactionHash }
})

if (existingPayment?.status === 'completed') {
  logger.warn('Duplicate webhook ignored', { transactionHash })
  return // Already processed
}
```

### 4. Admin Endpoints Protection

Все admin endpoints требуют:
- ✅ Authentication (`requireAuth`)
- ✅ Role check (`user.role === 'admin'`)

```typescript
if (user.role !== 'admin') {
  throw new ForbiddenError('Admin access required')
}
```

---

## Testing

### Unit Tests

```typescript
// payment.service.test.ts
describe('PaymentService', () => {
  it('should create payment with valid data', async () => {
    const payment = await paymentService.createPayment({
      userId: 'user-1',
      planId: 'plan-1',
      amount: 5.0,
      method: 'ton'
    })

    expect(payment.status).toBe('pending')
    expect(payment.amount).toBe(5.0)
  })

  it('should process referral commission on payment completion', async () => {
    // Setup referrer and referred user
    // Complete payment
    // Check referralBalance incremented
  })
})
```

### Integration Tests

```typescript
// Test full TON payment flow
describe('TON Payment Flow', () => {
  it('should complete payment via webhook', async () => {
    // 1. Create payment
    const payment = await createPayment({ ... })

    // 2. Simulate webhook
    await fetch('/api/payments/webhook/ton', {
      method: 'POST',
      body: JSON.stringify({
        transactionHash: 'test-tx',
        amount: '5000000000',  // 5 TON
        to: merchantAddress,
        ...
      })
    })

    // 3. Check payment status updated
    const updated = await getPayment(payment.id)
    expect(updated.status).toBe('completed')

    // 4. Check subscription created
    const subscription = await getActiveSubscription(userId)
    expect(subscription).toBeDefined()
  })
})
```

---

## Roadmap

- [ ] Real TON API integration (replace mock mode)
- [ ] Webhook signature verification
- [ ] Automated refund transactions (send TON back)
- [ ] Payment retry mechanism для failed payments
- [ ] Multi-currency support (USDT, etc.)
- [ ] Recurring subscription payments
- [ ] Payment dispute resolution workflow

---

## Related Documentation

- [SUBSCRIPTIONS Module](../subscriptions/README.md)
- [AUTH Module](../auth/README.md)
- [API Examples](../../../API_EXAMPLES.md)
- [TON Documentation](https://ton.org/docs)
