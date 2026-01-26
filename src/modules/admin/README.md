# Admin Module

Модуль администрирования для Telegram VPN Mini App с audit log, системными настройками и dashboard статистикой.

## 📋 Содержание

- [Обзор](#обзор)
- [API Endpoints](#api-endpoints)
- [Типы данных](#типы-данных)
- [Сервис](#сервис)
- [Примеры использования](#примеры-использования)

## Обзор

Модуль предоставляет комплексную систему администрирования с поддержкой:

- **Audit Log** - Логирование всех действий администраторов
- **System Settings** - Централизованное управление настройками системы
- **Dashboard Statistics** - Комплексная статистика по всем модулям
- **IP и User-Agent tracking** - Отслеживание откуда совершены действия

## API Endpoints

### Audit Log

#### GET /api/admin/audit-log

Получить историю действий администраторов.

**Authentication:** Required (admin only)

**Query Parameters:**
- `page` (number, optional) - Номер страницы (default: 1)
- `limit` (number, optional) - Записей на странице (default: 20, max: 100)
- `adminId` (string, optional) - Фильтр по админу
- `entityType` (string, optional) - Фильтр по типу сущности
- `entityId` (string, optional) - Фильтр по ID сущности
- `action` (string, optional) - Фильтр по действию
- `startDate` (date, optional) - С даты
- `endDate` (date, optional) - По дату
- `sortBy` (string, optional) - Сортировка: `createdAt` (default)
- `order` (string, optional) - Порядок: `asc` | `desc` (default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "adminId": "admin-uuid",
        "action": "user_banned",
        "entityType": "user",
        "entityId": "user-uuid",
        "changes": {
          "isBanned": { "from": false, "to": true },
          "banReason": "Abuse detected"
        },
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2025-01-26T15:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 523,
      "totalPages": 27
    }
  }
}
```

#### POST /api/admin/audit-log

Создать запись в audit log (обычно вызывается автоматически).

**Authentication:** Required (admin only)

**Body:**
```json
{
  "action": "promo_created",
  "entityType": "promo_code",
  "entityId": "promo-uuid",
  "changes": {
    "code": "SUMMER2025",
    "planId": "plan-uuid",
    "durationDays": 30
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "adminId": "admin-uuid",
    "action": "promo_created",
    "entityType": "promo_code",
    "entityId": "promo-uuid",
    "changes": { ... },
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2025-01-26T15:00:00.000Z"
  }
}
```

### System Settings

#### GET /api/admin/settings

Получить список всех системных настроек.

**Authentication:** Required (admin only)

**Query Parameters:**
- `page` (number, optional) - Номер страницы (default: 1)
- `limit` (number, optional) - Записей на странице (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "settings": [
      {
        "id": "uuid",
        "key": "referral_first_payment_percent",
        "value": 20,
        "description": "Процент от первого платежа реферала",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-26T12:00:00.000Z"
      },
      {
        "id": "uuid",
        "key": "referral_recurring_payment_percent",
        "value": 10,
        "description": "Процент от повторных платежей реферала",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-26T12:00:00.000Z"
      },
      {
        "id": "uuid",
        "key": "withdrawal_enabled",
        "value": false,
        "description": "Включить вывод средств",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-26T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

#### POST /api/admin/settings

Создать или обновить системную настройку.

**Authentication:** Required (admin only)

**Body:**
```json
{
  "key": "referral_first_payment_percent",
  "value": 25,
  "description": "Процент от первого платежа реферала"
}
```

**Validation:**
- `key` - Lowercase letters, numbers, underscores only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "referral_first_payment_percent",
    "value": 25,
    "description": "Процент от первого платежа реферала",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-26T15:30:00.000Z"
  }
}
```

#### GET /api/admin/settings/:key

Получить конкретную настройку по ключу.

**Authentication:** Required (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "withdrawal_enabled",
    "value": false,
    "description": "Включить вывод средств",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-26T12:00:00.000Z"
  }
}
```

#### PUT /api/admin/settings/:key

Обновить системную настройку.

**Authentication:** Required (admin only)

**Body:**
```json
{
  "value": true,
  "description": "Включить вывод средств (обновлено)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "withdrawal_enabled",
    "value": true,
    "description": "Включить вывод средств (обновлено)",
    "updatedAt": "2025-01-26T16:00:00.000Z"
  }
}
```

#### DELETE /api/admin/settings/:key

Удалить системную настройку.

**Authentication:** Required (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Setting deleted successfully"
  }
}
```

### Dashboard

#### GET /api/admin/dashboard

Получить комплексную статистику dashboard.

**Authentication:** Required (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 5234,
      "active": 3456,
      "banned": 12,
      "newToday": 45,
      "newThisWeek": 234,
      "newThisMonth": 876
    },
    "subscriptions": {
      "total": 4123,
      "active": 3456,
      "expired": 543,
      "cancelled": 124
    },
    "payments": {
      "total": 6789,
      "completed": 6234,
      "pending": 45,
      "failed": 510,
      "totalRevenue": 3125000,
      "revenueToday": 45000,
      "revenueThisMonth": 567000
    },
    "servers": {
      "total": 15,
      "active": 12,
      "offline": 1,
      "maintenance": 2,
      "overloaded": 0,
      "totalUsers": 3456
    },
    "support": {
      "totalTickets": 523,
      "openTickets": 23,
      "inProgressTickets": 45,
      "closedTickets": 455
    },
    "promoCodes": {
      "total": 150,
      "active": 89,
      "totalActivations": 1234
    },
    "referrals": {
      "totalEarnings": 125000,
      "totalWithdrawals": 45000,
      "pendingWithdrawals": 12000
    }
  }
}
```

## Типы данных

### AdminAuditLog

```typescript
interface AdminAuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}
```

### SystemSettings

```typescript
interface SystemSettings {
  id: string;
  key: string;
  value: any; // JSON
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### DashboardStatistics

```typescript
interface DashboardStatistics {
  users: {
    total: number;
    active: number;
    banned: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  subscriptions: {
    total: number;
    active: number;
    expired: number;
    cancelled: number;
  };
  payments: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    totalRevenue: number;
    revenueToday: number;
    revenueThisMonth: number;
  };
  servers: {
    total: number;
    active: number;
    offline: number;
    maintenance: number;
    overloaded: number;
    totalUsers: number;
  };
  support: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    closedTickets: number;
  };
  promoCodes: {
    total: number;
    active: number;
    totalActivations: number;
  };
  referrals: {
    totalEarnings: number;
    totalWithdrawals: number;
    pendingWithdrawals: number;
  };
}
```

### Audit Actions (Enum)

```typescript
enum AuditAction {
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_BANNED = 'user_banned',
  USER_UNBANNED = 'user_unbanned',
  PLAN_CREATED = 'plan_created',
  PLAN_UPDATED = 'plan_updated',
  SERVER_CREATED = 'server_created',
  PROMO_CREATED = 'promo_created',
  NEWS_PUBLISHED = 'news_published',
  SETTINGS_UPDATED = 'settings_updated',
  WITHDRAWAL_APPROVED = 'withdrawal_approved',
  // ... и другие
}
```

## Сервис

### AdminService

Основной сервис для админских операций.

```typescript
import { adminService } from '@/modules/admin';

// Создать audit log запись
const log = await adminService.createAuditLog({
  adminId: 'admin-uuid',
  action: 'user_banned',
  entityType: 'user',
  entityId: 'user-uuid',
  changes: {
    isBanned: { from: false, to: true },
    banReason: 'Spam detected'
  },
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});

// Получить audit logs
const logs = await adminService.listAuditLogs({
  page: 1,
  limit: 20,
  adminId: 'specific-admin-uuid',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31')
});

// Upsert system setting
const setting = await adminService.upsertSystemSetting({
  key: 'referral_first_payment_percent',
  value: 25,
  description: 'Процент от первого платежа'
});

// Получить настройку
const withdrawalEnabled = await adminService.getSystemSetting('withdrawal_enabled');

// Обновить настройку
await adminService.updateSystemSetting('withdrawal_enabled', {
  value: true
});

// Получить dashboard статистику
const stats = await adminService.getDashboardStatistics();
console.log(`Total users: ${stats.users.total}`);
console.log(`Revenue this month: ${stats.payments.revenueThisMonth} TON`);
```

## Примеры использования

### Пример 1: Автоматическое логирование действий админа

```typescript
import { adminService } from '@/modules/admin';
import { AuditAction, EntityType } from '@/modules/admin';

async function banUser(
  adminId: string,
  userId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
) {
  // Забанить пользователя
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: true,
      banReason: reason
    }
  });

  // Залогировать действие
  await adminService.createAuditLog({
    adminId,
    action: AuditAction.USER_BANNED,
    entityType: EntityType.USER,
    entityId: userId,
    changes: {
      isBanned: { from: false, to: true },
      banReason: reason
    },
    ipAddress,
    userAgent
  });

  console.log(`User ${userId} banned by admin ${adminId}`);
  return user;
}
```

### Пример 2: Middleware для автоматического audit log

```typescript
import { adminService } from '@/modules/admin';
import { NextRequest } from 'next/server';

// Middleware для логирования всех админских действий
export async function withAuditLog(
  handler: Function,
  action: string,
  entityType: string
) {
  return async (request: NextRequest, ...args: any[]) => {
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Выполнить действие
    const result = await handler(request, ...args);

    // Залогировать
    const ipAddress = request.headers.get('x-forwarded-for') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    await adminService.createAuditLog({
      adminId: user.id,
      action,
      entityType,
      entityId: result.id,
      ipAddress,
      userAgent
    });

    return result;
  };
}
```

### Пример 3: Dashboard для админ панели

```typescript
import { adminService } from '@/modules/admin';

async function renderAdminDashboard() {
  const stats = await adminService.getDashboardStatistics();

  return `
    <div class="dashboard">
      <section class="users">
        <h2>Пользователи</h2>
        <div class="stat">Всего: ${stats.users.total}</div>
        <div class="stat">Активных: ${stats.users.active}</div>
        <div class="stat">Новых сегодня: ${stats.users.newToday}</div>
        <div class="stat">Новых за месяц: ${stats.users.newThisMonth}</div>
      </section>

      <section class="revenue">
        <h2>Доходы</h2>
        <div class="stat">Всего: ${stats.payments.totalRevenue} TON</div>
        <div class="stat">Сегодня: ${stats.payments.revenueToday} TON</div>
        <div class="stat">За месяц: ${stats.payments.revenueThisMonth} TON</div>
      </section>

      <section class="servers">
        <h2>Серверы</h2>
        <div class="stat">Активных: ${stats.servers.active}/${stats.servers.total}</div>
        <div class="stat">Пользователей онлайн: ${stats.servers.totalUsers}</div>
        <div class="stat">Офлайн: ${stats.servers.offline}</div>
      </section>

      <section class="support">
        <h2>Поддержка</h2>
        <div class="stat">Открытых тикетов: ${stats.support.openTickets}</div>
        <div class="stat">В работе: ${stats.support.inProgressTickets}</div>
        <div class="stat alert">Закрытых: ${stats.support.closedTickets}</div>
      </section>
    </div>
  `;
}
```

### Пример 4: Управление системными настройками

```typescript
import { adminService } from '@/modules/admin';

// Инициализация дефолтных настроек при первом запуске
async function initializeDefaultSettings() {
  const defaults = [
    {
      key: 'referral_first_payment_percent',
      value: 20,
      description: 'Процент от первого платежа реферала'
    },
    {
      key: 'referral_recurring_payment_percent',
      value: 10,
      description: 'Процент от повторных платежей реферала'
    },
    {
      key: 'withdrawal_enabled',
      value: false,
      description: 'Включить вывод средств'
    },
    {
      key: 'withdrawal_min_amount',
      value: 100,
      description: 'Минимальная сумма вывода в TON'
    },
    {
      key: 'maintenance_mode',
      value: false,
      description: 'Режим обслуживания'
    }
  ];

  for (const setting of defaults) {
    await adminService.upsertSystemSetting(setting);
  }

  console.log('Default settings initialized');
}

// Получение настройки с кэшированием
let cachedSettings: Map<string, any> = new Map();

async function getSetting(key: string, useCache: boolean = true): Promise<any> {
  if (useCache && cachedSettings.has(key)) {
    return cachedSettings.get(key);
  }

  const setting = await adminService.getSystemSetting(key);
  cachedSettings.set(key, setting.value);

  return setting.value;
}

// Использование в коде
const isWithdrawalEnabled = await getSetting('withdrawal_enabled');
if (isWithdrawalEnabled) {
  // Показать кнопку вывода средств
}
```

### Пример 5: Поиск действий конкретного админа

```typescript
import { adminService } from '@/modules/admin';

async function getAdminActivityReport(adminId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await adminService.listAuditLogs({
    adminId,
    startDate,
    limit: 1000
  });

  // Группировка по действиям
  const actionCounts: Record<string, number> = {};
  logs.logs.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });

  console.log(`Admin ${adminId} activity for last ${days} days:`);
  Object.entries(actionCounts).forEach(([action, count]) => {
    console.log(`  ${action}: ${count} times`);
  });

  return {
    adminId,
    period: days,
    totalActions: logs.logs.length,
    actionBreakdown: actionCounts
  };
}
```

### Пример 6: Feature flag система через settings

```typescript
import { adminService } from '@/modules/admin';

class FeatureFlags {
  private cache: Map<string, boolean> = new Map();

  async isEnabled(feature: string): Promise<boolean> {
    if (this.cache.has(feature)) {
      return this.cache.get(feature)!;
    }

    try {
      const setting = await adminService.getSystemSetting(`feature_${feature}`);
      const enabled = Boolean(setting.value);
      this.cache.set(feature, enabled);
      return enabled;
    } catch {
      // Feature flag не существует - по умолчанию выключен
      return false;
    }
  }

  async enable(feature: string) {
    await adminService.upsertSystemSetting({
      key: `feature_${feature}`,
      value: true,
      description: `Feature flag for ${feature}`
    });
    this.cache.set(feature, true);
  }

  async disable(feature: string) {
    await adminService.upsertSystemSetting({
      key: `feature_${feature}`,
      value: false,
      description: `Feature flag for ${feature}`
    });
    this.cache.set(feature, false);
  }

  clearCache() {
    this.cache.clear();
  }
}

// Использование
const features = new FeatureFlags();

if (await features.isEnabled('auto_renewal')) {
  // Показать функционал автоматического продления
}

if (await features.isEnabled('referral_withdrawals')) {
  // Показать кнопку вывода средств
}
```

## Логирование

Все операции логируются через Winston:

```typescript
// Успешные операции - info level
logger.info('Audit log created', {
  auditLogId: auditLog.id,
  adminId: input.adminId,
  action: input.action
});

// Ошибки - error level
logger.error('Failed to get dashboard statistics', {
  error: error.message
});
```

## Ошибки

Модуль использует стандартные ошибки из `@/lib/errors`:

- **NotFoundError** - Настройка не найдена
- **ForbiddenError** - Нет доступа (не админ)
- **ValidationError** - Невалидные данные (через Zod)

## Зависимости

- **Prisma Client** - База данных
- **Winston** - Логирование
- **Zod** - Валидация схем
- **Auth Middleware** - Аутентификация

## Связанные модули

Админ модуль интегрируется со ВСЕМИ модулями системы для:
- Логирования действий
- Сбора статистики
- Централизованного управления

## Database Schema

```prisma
model AdminAuditLog {
  id         String   @id @default(uuid())
  adminId    String   @map("admin_id")
  action     String
  entityType String   @map("entity_type")
  entityId   String?  @map("entity_id")
  changes    Json?
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("admin_audit_log")
  @@index([adminId, createdAt])
  @@index([entityType, entityId])
}

model SystemSettings {
  id          String   @id @default(uuid())
  key         String   @unique
  value       Json
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("system_settings")
}
```

## Производительность

- **Индексы** на `adminId + createdAt` и `entityType + entityId` для быстрых запросов audit log
- **Unique index** на `key` для системных настроек
- **Пагинация** для всех списков
- **Агрегация** оптимизирована с параллельными запросами

## Безопасность

- ✅ Только для админов (все endpoints)
- ✅ IP и User-Agent tracking
- ✅ Валидация всех входных данных через Zod
- ✅ Audit log для всех критичных действий
- ✅ Иммутабельный audit log (нет UPDATE/DELETE)

---

**Статус модуля**: ✅ Production Ready

**Версия**: 1.0.0

**Последнее обновление**: 2025-01-26
