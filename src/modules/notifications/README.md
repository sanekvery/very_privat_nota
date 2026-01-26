# Notifications Module

Модуль уведомлений для Telegram VPN Mini App с поддержкой множественных типов уведомлений, broadcast-рассылок и статистики.

## 📋 Содержание

- [Обзор](#обзор)
- [Типы уведомлений](#типы-уведомлений)
- [API Endpoints](#api-endpoints)
- [Типы данных](#типы-данных)
- [Сервис](#сервис)
- [Примеры использования](#примеры-использования)
- [Helper Methods](#helper-methods)

## Обзор

Модуль предоставляет комплексную систему уведомлений с поддержкой:

- 6 типов уведомлений (подписка, платежи, поддержка, новости, система)
- Мультиязычность (RU/EN)
- Broadcast-рассылки с фильтрацией пользователей
- Автоматические уведомления через helper methods
- Статистика для пользователей и администраторов
- Отметка прочитанных/непрочитанных

## Типы уведомлений

```typescript
type NotificationType =
  | 'subscription_expiring'  // Подписка истекает
  | 'subscription_expired'   // Подписка истекла
  | 'payment_received'       // Платеж получен
  | 'support_reply'          // Ответ в тикете поддержки
  | 'news'                   // Новость
  | 'system';                // Системное уведомление
```

## API Endpoints

### User Endpoints

#### GET /api/notifications

Получить список уведомлений текущего пользователя.

**Query Parameters:**
- `page` (number, optional) - Номер страницы (default: 1)
- `limit` (number, optional) - Записей на странице (default: 20, max: 100)
- `type` (NotificationType, optional) - Фильтр по типу
- `isRead` (boolean, optional) - Фильтр по прочитанным

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "userId": "uuid",
        "type": "subscription_expiring",
        "title": "Подписка истекает",
        "titleEn": "Subscription expiring",
        "message": "Ваша подписка истекает через 3 дня",
        "messageEn": "Your subscription expires in 3 days",
        "metadata": {
          "subscriptionId": "uuid",
          "daysLeft": 3
        },
        "isRead": false,
        "createdAt": "2025-01-26T10:00:00.000Z",
        "user": {
          "id": "uuid",
          "telegramId": "123456789",
          "username": "user123",
          "firstName": "John",
          "lastName": "Doe"
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

#### POST /api/notifications

Создать уведомление (обычно не используется напрямую, используйте helper methods).

**Body:**
```json
{
  "userId": "uuid",
  "type": "system",
  "title": "Системное уведомление",
  "titleEn": "System notification",
  "message": "Запланированное обслуживание",
  "messageEn": "Scheduled maintenance",
  "metadata": {
    "maintenanceDate": "2025-01-27T02:00:00.000Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "type": "system",
    "title": "Системное уведомление",
    "message": "Запланированное обслуживание",
    "isRead": false,
    "createdAt": "2025-01-26T10:00:00.000Z"
  }
}
```

#### GET /api/notifications/:notificationId

Получить конкретное уведомление.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "type": "payment_received",
    "title": "Платеж получен",
    "message": "Получен платеж на сумму 500 TON",
    "metadata": {
      "paymentId": "uuid",
      "amount": 500
    },
    "isRead": true,
    "createdAt": "2025-01-26T09:00:00.000Z"
  }
}
```

#### DELETE /api/notifications/:notificationId

Удалить уведомление.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Notification deleted successfully"
  }
}
```

#### POST /api/notifications/:notificationId/read

Отметить уведомление как прочитанное.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isRead": true,
    "createdAt": "2025-01-26T10:00:00.000Z"
  }
}
```

#### POST /api/notifications/mark-all-read

Отметить все уведомления пользователя как прочитанные.

**Response:**
```json
{
  "success": true,
  "data": {
    "updated": 12
  }
}
```

#### GET /api/notifications/statistics

Получить статистику уведомлений текущего пользователя.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "unread": 12,
    "read": 33,
    "byType": {
      "subscription_expiring": 5,
      "subscription_expired": 3,
      "payment_received": 20,
      "support_reply": 8,
      "news": 7,
      "system": 2
    },
    "recentUnread": [
      {
        "id": "uuid",
        "type": "support_reply",
        "title": "Ответ на тикет",
        "message": "Получен ответ по вашему обращению",
        "createdAt": "2025-01-26T10:00:00.000Z"
      }
    ]
  }
}
```

### Admin Endpoints

#### POST /api/notifications/broadcast

Отправить broadcast-уведомление множеству пользователей (только для админов).

**Body:**
```json
{
  "type": "news",
  "title": "Новая функция",
  "titleEn": "New feature",
  "message": "Добавлена возможность автоматического продления подписки",
  "messageEn": "Auto-renewal feature has been added",
  "metadata": {
    "featureId": "auto-renewal"
  },
  "userFilter": {
    "hasActiveSubscription": true,
    "isAdmin": false
  }
}
```

**User Filter Options:**
- `hasActiveSubscription` (boolean, optional) - Только пользователи с активной подпиской
- `isAdmin` (boolean, optional) - Фильтр по роли админа

**Response:**
```json
{
  "success": true,
  "data": {
    "created": 150,
    "notifications": [
      {
        "id": "uuid",
        "userId": "uuid",
        "type": "news",
        "title": "Новая функция",
        "message": "Добавлена возможность автоматического продления подписки",
        "isRead": false,
        "createdAt": "2025-01-26T10:00:00.000Z"
      }
    ]
  }
}
```

#### GET /api/notifications/admin/statistics

Получить статистику по всем уведомлениям в системе (только для админов).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalNotifications": 1523,
    "totalUnread": 342,
    "totalRead": 1181,
    "byType": {
      "subscription_expiring": 145,
      "subscription_expired": 89,
      "payment_received": 678,
      "support_reply": 234,
      "news": 289,
      "system": 88
    },
    "recentNotifications": [
      {
        "id": "uuid",
        "userId": "uuid",
        "type": "payment_received",
        "title": "Платеж получен",
        "isRead": false,
        "createdAt": "2025-01-26T10:00:00.000Z"
      }
    ],
    "userStatistics": [
      {
        "userId": "uuid",
        "username": "user123",
        "totalNotifications": 45,
        "unreadNotifications": 12
      }
    ]
  }
}
```

## Типы данных

### NotificationWithRelations

```typescript
interface NotificationWithRelations {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  titleEn: string | null;
  message: string;
  messageEn: string | null;
  metadata: Record<string, any> | null;
  isRead: boolean;
  createdAt: Date;
  user: {
    id: string;
    telegramId: bigint | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}
```

### CreateNotificationInput

```typescript
interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  metadata?: Record<string, any>;
}
```

### CreateBroadcastNotificationInput

```typescript
interface CreateBroadcastNotificationInput {
  type: NotificationType;
  title: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  metadata?: Record<string, any>;
  userFilter?: {
    hasActiveSubscription?: boolean;
    isAdmin?: boolean;
  };
}
```

### NotificationStatistics

```typescript
interface NotificationStatistics {
  total: number;
  unread: number;
  read: number;
  byType: Record<NotificationType, number>;
  recentUnread: NotificationWithRelations[];
}
```

### AdminNotificationStatistics

```typescript
interface AdminNotificationStatistics {
  totalNotifications: number;
  totalUnread: number;
  totalRead: number;
  byType: Record<NotificationType, number>;
  recentNotifications: NotificationWithRelations[];
  userStatistics: UserStatistics[];
}
```

## Сервис

### NotificationService

Основной сервис для работы с уведомлениями.

```typescript
import { notificationService } from '@/modules/notifications';

// Создать уведомление
const notification = await notificationService.createNotification({
  userId: 'user-uuid',
  type: 'system',
  title: 'Системное уведомление',
  titleEn: 'System notification',
  message: 'Ваша подписка обновлена',
  messageEn: 'Your subscription has been updated',
  metadata: { subscriptionId: 'sub-uuid' }
});

// Broadcast-рассылка
const result = await notificationService.createBroadcastNotification({
  type: 'news',
  title: 'Новая функция',
  titleEn: 'New feature',
  message: 'Добавлена поддержка новых серверов',
  messageEn: 'New servers support added',
  userFilter: {
    hasActiveSubscription: true
  }
});

// Получить уведомление
const notification = await notificationService.getNotification(
  'notification-uuid',
  'user-uuid'
);

// Список уведомлений
const result = await notificationService.listNotifications('user-uuid', {
  page: 1,
  limit: 20,
  type: 'payment_received',
  isRead: false
});

// Отметить как прочитанное
const updated = await notificationService.markAsRead(
  'notification-uuid',
  'user-uuid'
);

// Отметить все как прочитанные
const result = await notificationService.markAllAsRead('user-uuid');

// Удалить уведомление
await notificationService.deleteNotification(
  'notification-uuid',
  'user-uuid'
);

// Статистика пользователя
const stats = await notificationService.getNotificationStatistics('user-uuid');

// Статистика админа
const adminStats = await notificationService.getAdminStatistics();
```

## Helper Methods

Сервис предоставляет удобные helper-методы для автоматической отправки типовых уведомлений:

### notifySubscriptionExpiring

Уведомление об истечении подписки.

```typescript
const notification = await notificationService.notifySubscriptionExpiring(
  'user-uuid',
  'subscription-uuid',
  3 // days left
);
```

Создаёт уведомление:
- **Тип**: `subscription_expiring`
- **Заголовок**: "Подписка истекает" / "Subscription expiring"
- **Сообщение**: "Ваша подписка истекает через N дней" / "Your subscription expires in N days"
- **Metadata**: `{ subscriptionId, daysLeft }`

### notifySubscriptionExpired

Уведомление об истечении подписки.

```typescript
const notification = await notificationService.notifySubscriptionExpired(
  'user-uuid',
  'subscription-uuid'
);
```

Создаёт уведомление:
- **Тип**: `subscription_expired`
- **Заголовок**: "Подписка истекла" / "Subscription expired"
- **Сообщение**: "Ваша подписка истекла. Продлите для продолжения использования" / "Your subscription has expired"
- **Metadata**: `{ subscriptionId }`

### notifyPaymentReceived

Уведомление о получении платежа.

```typescript
const notification = await notificationService.notifyPaymentReceived(
  'user-uuid',
  'payment-uuid',
  500 // amount in TON
);
```

Создаёт уведомление:
- **Тип**: `payment_received`
- **Заголовок**: "Платеж получен" / "Payment received"
- **Сообщение**: "Получен платеж на сумму N TON" / "Payment of N TON received"
- **Metadata**: `{ paymentId, amount }`

### notifySupportReply

Уведомление об ответе в тикете поддержки.

```typescript
const notification = await notificationService.notifySupportReply(
  'user-uuid',
  'ticket-uuid',
  'Проблема с подключением' // ticket subject
);
```

Создаёт уведомление:
- **Тип**: `support_reply`
- **Заголовок**: "Ответ на тикет" / "Support reply"
- **Сообщение**: "Получен ответ по вашему обращению: {subject}" / "Reply received for: {subject}"
- **Metadata**: `{ ticketId, ticketSubject }`

## Примеры использования

### Пример 1: Автоматическое уведомление при истечении подписки

```typescript
import { notificationService } from '@/modules/notifications';

// В задаче проверки истекающих подписок
async function checkExpiringSubscriptions() {
  const expiringSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'active',
      endDate: {
        gte: new Date(),
        lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      }
    }
  });

  for (const subscription of expiringSubscriptions) {
    const daysLeft = Math.ceil(
      (subscription.endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    await notificationService.notifySubscriptionExpiring(
      subscription.userId,
      subscription.id,
      daysLeft
    );
  }
}
```

### Пример 2: Broadcast-рассылка для активных пользователей

```typescript
import { notificationService } from '@/modules/notifications';

async function announceNewFeature() {
  const result = await notificationService.createBroadcastNotification({
    type: 'news',
    title: 'Новые серверы в Азии',
    titleEn: 'New servers in Asia',
    message: 'Добавлены новые серверы в Сингапуре и Токио для улучшения скорости',
    messageEn: 'New servers added in Singapore and Tokyo for better speed',
    metadata: {
      servers: ['singapore-1', 'tokyo-1']
    },
    userFilter: {
      hasActiveSubscription: true,
      isAdmin: false
    }
  });

  console.log(`Broadcast sent to ${result.created} users`);
}
```

### Пример 3: Уведомление при создании платежа

```typescript
import { notificationService } from '@/modules/notifications';

async function handlePaymentReceived(payment: Payment) {
  // Отправить уведомление пользователю
  await notificationService.notifyPaymentReceived(
    payment.userId,
    payment.id,
    Number(payment.amount)
  );

  // Если есть реферер - уведомить о начислении комиссии
  if (payment.user.referredBy) {
    await notificationService.createNotification({
      userId: payment.user.referredBy,
      type: 'payment_received',
      title: 'Реферальная комиссия',
      titleEn: 'Referral commission',
      message: `Получена комиссия ${calculateCommission(payment.amount)} TON`,
      messageEn: `Commission received: ${calculateCommission(payment.amount)} TON`,
      metadata: {
        paymentId: payment.id,
        referredUserId: payment.userId
      }
    });
  }
}
```

### Пример 4: Отметка прочитанных при открытии

```typescript
import { notificationService } from '@/modules/notifications';

async function handleNotificationClick(notificationId: string, userId: string) {
  // Отметить как прочитанное
  const notification = await notificationService.markAsRead(
    notificationId,
    userId
  );

  // Выполнить действие на основе типа
  switch (notification.type) {
    case 'support_reply':
      // Перейти к тикету
      const ticketId = notification.metadata?.ticketId;
      router.push(`/support/tickets/${ticketId}`);
      break;

    case 'subscription_expiring':
      // Перейти к продлению подписки
      router.push('/subscriptions');
      break;

    case 'payment_received':
      // Показать детали платежа
      const paymentId = notification.metadata?.paymentId;
      router.push(`/payments/${paymentId}`);
      break;
  }
}
```

### Пример 5: Получение статистики для badge

```typescript
import { notificationService } from '@/modules/notifications';

async function getUnreadCount(userId: string): Promise<number> {
  const stats = await notificationService.getNotificationStatistics(userId);
  return stats.unread;
}

// Использование в UI
function NotificationBell({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getUnreadCount(userId).then(setUnreadCount);
  }, [userId]);

  return (
    <div className="relative">
      <BellIcon />
      {unreadCount > 0 && (
        <span className="badge">{unreadCount}</span>
      )}
    </div>
  );
}
```

## Логирование

Все операции логируются через Winston:

```typescript
// Успешные операции - info level
logger.info('Notification created', {
  notificationId: notification.id,
  userId: notification.userId,
  type: notification.type
});

// Ошибки - error level
logger.error('Failed to create notification', {
  error: error.message,
  userId,
  type
});
```

## Ошибки

Модуль использует стандартные ошибки из `@/lib/errors`:

- **NotFoundError** - Уведомление не найдено
- **ForbiddenError** - Нет доступа к уведомлению / не админ
- **ValidationError** - Невалидные данные (через Zod)

## Зависимости

- **Prisma Client** - База данных
- **Winston** - Логирование
- **Zod** - Валидация схем
- **Auth Middleware** - Аутентификация

## Связанные модули

- **Support** - Использует helper method `notifySupportReply`
- **Subscriptions** - Использует helper methods для уведомлений об истечении
- **Payments** - Использует helper method `notifyPaymentReceived`
- **News** - Может использовать broadcast для отправки новостей

## Database Schema

```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String
  type      String   // NotificationType enum
  title     String
  titleEn   String?
  message   String   @db.Text
  messageEn String?  @db.Text
  metadata  Json?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([type])
  @@index([isRead])
  @@index([createdAt])
}
```

## Производительность

- **Индексы** на `userId`, `type`, `isRead`, `createdAt` для быстрых запросов
- **Пагинация** для списков уведомлений
- **Лимит** на количество записей (max 100 per page)
- **Cascade delete** при удалении пользователя

## Безопасность

- ✅ Аутентификация на всех endpoints
- ✅ Проверка владельца уведомления
- ✅ Admin-only endpoints защищены
- ✅ Валидация всех входных данных через Zod
- ✅ Sanitization в metadata (JSON)

---

**Статус модуля**: ✅ Production Ready

**Версия**: 1.0.0

**Последнее обновление**: 2025-01-26
