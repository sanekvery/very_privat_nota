# SUPPORT Module

Модуль системы поддержки с тикетами, ответами и статистикой.

## Ответственность

- Создание и управление тикетами поддержки
- Ответы на тикеты (от пользователей и персонала)
- Обновление статуса и приоритета тикетов
- Назначение тикетов на сотрудников
- Статистика по тикетам

## Архитектура

```
src/modules/support/
├── support.types.ts           # Типы домена (10+ интерфейсов)
├── support.validation.ts      # Zod схемы валидации
├── support.service.ts         # Сервис поддержки
└── README.md
```

## Типы

### TicketStatus
```typescript
type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'closed';
```

**Состояния:**
- `open` - Новый тикет, ожидает ответа персонала
- `in_progress` - Персонал ответил, работа ведется
- `waiting_user` - Ожидается ответ от пользователя
- `closed` - Тикет закрыт

### TicketPriority
```typescript
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
```

### SupportTicketWithRelations
```typescript
interface SupportTicketWithRelations extends SupportTicket {
  user?: UserPartial;
  replies?: TicketReplyWithRelations[];
  assignedToUser?: UserPartial;
}
```

Полная информация о тикете с пользователем, ответами и назначенным сотрудником.

### CreateTicketInput
```typescript
interface CreateTicketInput {
  userId: string;
  subject: string;        // 3-200 символов
  message: string;        // 10-5000 символов (первое сообщение)
  priority?: TicketPriority; // default 'medium'
}
```

### TicketStatistics
```typescript
interface TicketStatistics {
  total: number;
  open: number;
  inProgress: number;
  waitingUser: number;
  closed: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  avgResolutionTime: number; // milliseconds
  unassignedCount: number;   // только для admin stats
}
```

## SupportService

### Методы

#### createTicket(input)
```typescript
const ticket = await supportService.createTicket({
  userId: 'user-uuid',
  subject: 'Cannot connect to VPN',
  message: 'I am getting error when trying to connect...',
  priority: 'high',
});
// Returns: SupportTicketWithRelations
```

Создает новый тикет:
1. Создает запись `SupportTicket` со статусом `open`
2. Автоматически создает первый `TicketReply` с сообщением пользователя
3. Выполняется в транзакции

#### getTicket(ticketId, userId?, isAdmin)
```typescript
const ticket = await supportService.getTicket(
  'ticket-uuid',
  'user-uuid',  // optional, для проверки доступа
  false         // isAdmin
);
// Returns: SupportTicketWithRelations
```

Получает тикет с всеми ответами:
- Пользователь может видеть только свои тикеты
- Админ может видеть все тикеты
- Ответы отсортированы по дате создания (ASC)

#### listTickets(query)
```typescript
const result = await supportService.listTickets({
  userId: 'user-uuid', // optional, undefined для admin (все тикеты)
  status: 'open',
  priority: 'high',
  assignedTo: undefined, // или '' для unassigned
  limit: 20,
  offset: 0,
  sortBy: 'createdAt',
  order: 'desc',
});
// Returns: { tickets, total }
```

Список тикетов с фильтрацией:
- Включает только последний ответ для каждого тикета
- Поддерживает сортировку по `createdAt`, `updatedAt`, `priority`

#### updateTicket(input)
```typescript
const ticket = await supportService.updateTicket({
  ticketId: 'ticket-uuid',
  status: 'in_progress',
  priority: 'urgent',
  assignedTo: 'admin-user-uuid',
});
```

Обновляет тикет (admin only):
- При status='closed' автоматически устанавливает `closedAt`
- Обновляет `updatedAt` timestamp

#### closeTicket(ticketId)
```typescript
const ticket = await supportService.closeTicket('ticket-uuid');
```

Упрощенный метод для закрытия тикета.

#### createReply(input)
```typescript
const reply = await supportService.createReply({
  ticketId: 'ticket-uuid',
  userId: 'user-uuid',
  message: 'Thank you for the help!',
  isStaff: false,
});
// Returns: TicketReplyWithRelations
```

Создает ответ на тикет:

**Автоматическое изменение статуса:**
- Если персонал (isStaff=true) отвечает на `open` тикет → status меняется на `in_progress`
- Если пользователь отвечает на `in_progress` тикет → status меняется на `waiting_user`

**Валидация:**
- Нельзя отвечать на закрытый тикет (status='closed')
- Обновляет `updatedAt` тикета

#### getTicketStatistics(userId)
```typescript
const stats = await supportService.getTicketStatistics('user-uuid');
// Returns: TicketStatistics
```

Статистика по тикетам пользователя:
- Количество по статусам
- Количество по приоритетам
- Средн время резолюции закрытых тикетов

#### getAdminStatistics()
```typescript
const stats = await supportService.getAdminStatistics();
// Returns: AdminTicketStatistics
```

Админская статистика:
- Все метрики из TicketStatistics
- Количество неназначенных тикетов
- 10 последних тикетов
- Топ-10 сотрудников по количеству тикетов

## API Endpoints

### Пользовательские endpoints

#### GET /api/support/tickets
Список тикетов текущего пользователя (или всех тикетов для admin).

**Query params:**
- `status` ('open' | 'in_progress' | 'waiting_user' | 'closed', optional)
- `priority` ('low' | 'medium' | 'high' | 'urgent', optional)
- `limit` (number, default 20, max 100)
- `offset` (number, default 0)
- `sortBy` ('createdAt' | 'updatedAt' | 'priority', default 'createdAt')
- `order` ('asc' | 'desc', default 'desc')

**Response:**
```json
{
  "tickets": [
    {
      "id": "ticket-uuid",
      "userId": "user-uuid",
      "subject": "Cannot connect to VPN",
      "status": "open",
      "priority": "high",
      "assignedTo": null,
      "createdAt": "2024-01-20T10:00:00Z",
      "updatedAt": "2024-01-20T10:00:00Z",
      "closedAt": null,
      "user": {
        "id": "user-uuid",
        "username": "user123"
      },
      "replies": [
        {
          "id": "reply-uuid",
          "message": "I am getting error...",
          "isStaff": false,
          "createdAt": "2024-01-20T10:00:00Z"
        }
      ]
    }
  ],
  "total": 5
}
```

#### POST /api/support/tickets
Создать новый тикет.

**Body:**
```json
{
  "subject": "Cannot connect to VPN",
  "message": "I am getting error when trying to connect...",
  "priority": "high"
}
```

**Response:** SupportTicket

#### GET /api/support/tickets/:ticketId
Получить детали тикета со всеми ответами.

**Access control:**
- Пользователь видит только свои тикеты
- Админ видит все тикеты

**Response:**
```json
{
  "id": "ticket-uuid",
  "userId": "user-uuid",
  "subject": "Cannot connect to VPN",
  "status": "in_progress",
  "priority": "high",
  "assignedTo": "admin-uuid",
  "createdAt": "2024-01-20T10:00:00Z",
  "updatedAt": "2024-01-20T14:30:00Z",
  "user": { ... },
  "replies": [
    {
      "id": "reply1",
      "message": "I am getting error...",
      "isStaff": false,
      "createdAt": "2024-01-20T10:00:00Z",
      "user": { ... }
    },
    {
      "id": "reply2",
      "message": "Please try restarting...",
      "isStaff": true,
      "createdAt": "2024-01-20T14:30:00Z",
      "user": { ... }
    }
  ]
}
```

#### POST /api/support/tickets/:ticketId/reply
Ответить на тикет.

**Body:**
```json
{
  "message": "Thank you, it works now!"
}
```

**Behavior:**
- Для обычных пользователей: `isStaff = false`
- Для админов: `isStaff = true` (автоматически)
- Автоматически меняет статус тикета (см. createReply)

**Response:** TicketReply

#### POST /api/support/tickets/:ticketId/close
Закрыть тикет.

**Access control:**
- Пользователь может закрыть свой тикет
- Админ может закрыть любой тикет

**Response:** SupportTicket

#### GET /api/support/statistics
Статистика по тикетам текущего пользователя.

**Response:**
```json
{
  "total": 15,
  "open": 2,
  "inProgress": 3,
  "waitingUser": 1,
  "closed": 9,
  "byPriority": {
    "low": 3,
    "medium": 8,
    "high": 3,
    "urgent": 1
  },
  "avgResolutionTime": 3600000,
  "unassignedCount": 0
}
```

### Админские endpoints

#### PATCH /api/support/tickets/:ticketId
Обновить тикет (admin only).

**Body:**
```json
{
  "status": "in_progress",
  "priority": "urgent",
  "assignedTo": "admin-user-uuid"
}
```

Все поля опциональны.

**Response:** SupportTicket

#### GET /api/support/admin/statistics
Админская статистика (admin only).

**Response:**
```json
{
  "total": 150,
  "open": 15,
  "inProgress": 30,
  "waitingUser": 10,
  "closed": 95,
  "byPriority": { ... },
  "avgResolutionTime": 7200000,
  "unassignedCount": 8,
  "recentTickets": [
    { ... }
  ],
  "topAssignees": [
    {
      "userId": "admin1-uuid",
      "username": "support_admin",
      "ticketCount": 45,
      "resolvedCount": 40
    }
  ]
}
```

## Автоматическое изменение статусов

### Создание тикета
```
User creates ticket
   ↓
status = 'open'
```

### Первый ответ персонала
```
User ticket (status='open')
   ↓
Staff replies (isStaff=true)
   ↓
status = 'in_progress'
```

### Ответ пользователя
```
Ticket (status='in_progress')
   ↓
User replies (isStaff=false)
   ↓
status = 'waiting_user'
```

### Закрытие
```
Ticket (any status)
   ↓
Close ticket
   ↓
status = 'closed'
closedAt = now()
```

## Примеры использования

### Пользователь создает тикет
```typescript
import { supportService } from '@/modules/support/support.service';

// Создать тикет
const ticket = await supportService.createTicket({
  userId: 'user-uuid',
  subject: 'VPN connection issues',
  message: 'I cannot connect to any server. Getting timeout error.',
  priority: 'high',
});

console.log(`Ticket created: ${ticket.id}`);
// Ticket created: ticket-uuid
```

### Админ назначает тикет на себя
```typescript
// Получить список неназначенных тикетов
const { tickets } = await supportService.listTickets({
  assignedTo: '', // empty string = unassigned
  status: 'open',
  sortBy: 'priority',
  order: 'desc',
});

// Назначить на себя
const ticket = await supportService.updateTicket({
  ticketId: tickets[0].id,
  assignedTo: 'admin-uuid',
  status: 'in_progress',
});
```

### Админ отвечает на тикет
```typescript
const reply = await supportService.createReply({
  ticketId: 'ticket-uuid',
  userId: 'admin-uuid',
  message: 'Please try connecting to server US-NY-01 and let me know if the issue persists.',
  isStaff: true,
});

// Статус тикета автоматически изменится на 'in_progress' (если был 'open')
```

### Пользователь закрывает тикет
```typescript
const ticket = await supportService.closeTicket('ticket-uuid');

console.log(ticket.status);   // 'closed'
console.log(ticket.closedAt);  // 2024-01-20T15:00:00Z
```

### Админская dashboard
```typescript
const stats = await supportService.getAdminStatistics();

console.log(`Open tickets: ${stats.open}`);
console.log(`Unassigned: ${stats.unassignedCount}`);
console.log(`Avg resolution: ${Math.round(stats.avgResolutionTime / 3600000)}h`);

// Топ сотрудников
stats.topAssignees.forEach((assignee, i) => {
  console.log(`${i + 1}. ${assignee.username}: ${assignee.ticketCount} tickets, ${assignee.resolvedCount} resolved`);
});
```

## Интеграции

### С модулем AUTH
- Использует `User` для связывания тикетов с пользователями
- `isAdmin` флаг определяет доступ к админским функциям
- `assignedTo` связывает тикет с admin user

### С Prisma
- `SupportTicket` - основная таблица тикетов
- `TicketReply` - ответы на тикеты
- Cascade delete: при удалении пользователя удаляются его тикеты и ответы

## Валидация

### Subject
```typescript
z.string().min(3).max(200)
```

Короткое описание проблемы.

### Message
```typescript
z.string().min(10).max(5000)
```

Детальное описание проблемы или ответ.

### Priority
```typescript
z.enum(['low', 'medium', 'high', 'urgent'])
```

Default: `'medium'`

## Performance Considerations

### Оптимизация запросов
- `listTickets()` включает только последний ответ (не все ответы)
- `getTicket()` загружает все ответы только при просмотре деталей
- Использует Prisma `include` вместо отдельных запросов

### Индексы (из Prisma schema)
```prisma
@@index([userId, status])
@@index([status, priority])
@@index([ticketId, createdAt]) // для replies
```

### Рекомендации
- Использовать pagination для списков тикетов
- Кешировать admin statistics в Redis (обновлять раз в 5 минут)
- Индексировать assignedTo для быстрого поиска неназначенных тикетов

## Возможные улучшения

1. **Email уведомления**: Отправлять email при создании тикета и ответах
2. **Attachments**: Поддержка прикрепления файлов (скриншоты, логи)
3. **Templates**: Шаблоны ответов для частых вопросов
4. **SLA tracking**: Отслеживание времени первого ответа и резолюции
5. **Categories/Tags**: Категоризация тикетов (VPN, Billing, Technical, etc.)
6. **Canned responses**: Готовые ответы для персонала
7. **Search**: Полнотекстовый поиск по тикетам
8. **Webhooks**: Интеграция с внешними системами (Slack, Discord)
9. **Satisfaction rating**: Оценка качества поддержки пользователем
10. **Auto-close**: Автоматическое закрытие неактивных тикетов через N дней
