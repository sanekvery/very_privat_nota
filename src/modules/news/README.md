# News Module

Модуль управления новостями и анонсами для Telegram VPN Mini App с поддержкой Markdown, изображений и мультиязычности.

## 📋 Содержание

- [Обзор](#обзор)
- [API Endpoints](#api-endpoints)
- [Типы данных](#типы-данных)
- [Сервис](#сервис)
- [Примеры использования](#примеры-использования)

## Обзор

Модуль предоставляет комплексную систему управления новостями с поддержкой:

- Markdown форматирования контента
- Мультиязычности (RU/EN)
- Изображений для новостей
- Статусов публикации (draft/published)
- Пагинации и фильтрации
- Админского управления

## API Endpoints

### Public Endpoints

#### GET /api/news

Получить список опубликованных новостей.

**Query Parameters:**
- `page` (number, optional) - Номер страницы (default: 1)
- `limit` (number, optional) - Записей на странице (default: 20, max: 100)
- `sortBy` (string, optional) - Сортировка: `publishedAt` | `createdAt` (default: publishedAt)
- `order` (string, optional) - Порядок: `asc` | `desc` (default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "news": [
      {
        "id": "uuid",
        "title": "Новые серверы добавлены",
        "titleEn": "New servers added",
        "content": "# Новые серверы\n\nДобавлены серверы в **Сингапуре** и **Токио**...",
        "contentEn": "# New Servers\n\nAdded servers in **Singapore** and **Tokyo**...",
        "imageUrl": "https://example.com/image.jpg",
        "isPublished": true,
        "publishedAt": "2025-01-26T10:00:00.000Z",
        "createdAt": "2025-01-25T15:00:00.000Z",
        "updatedAt": "2025-01-26T10:00:00.000Z",
        "createdBy": "admin-uuid"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

#### GET /api/news/:newsId

Получить конкретную новость по ID.

**Authentication:** Optional (admins see unpublished, public see only published)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Важное обновление",
    "titleEn": "Important update",
    "content": "## Что нового\n\n- Улучшена стабильность\n- Добавлена поддержка IPv6",
    "contentEn": "## What's New\n\n- Improved stability\n- Added IPv6 support",
    "imageUrl": "https://example.com/update.jpg",
    "isPublished": true,
    "publishedAt": "2025-01-26T12:00:00.000Z",
    "createdAt": "2025-01-26T11:00:00.000Z",
    "updatedAt": "2025-01-26T12:00:00.000Z",
    "createdBy": "admin-uuid"
  }
}
```

### Admin Endpoints

#### POST /api/news

Создать новость (только админы).

**Authentication:** Required (admin only)

**Body:**
```json
{
  "title": "Новая функция",
  "titleEn": "New feature",
  "content": "# Автоматическое продление\n\nТеперь доступно автоматическое продление подписки",
  "contentEn": "# Auto-renewal\n\nAuto-renewal is now available",
  "imageUrl": "https://example.com/feature.jpg",
  "isPublished": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Новая функция",
    "titleEn": "New feature",
    "content": "# Автоматическое продление\n\nТеперь доступно автоматическое продление подписки",
    "contentEn": "# Auto-renewal\n\nAuto-renewal is now available",
    "imageUrl": "https://example.com/feature.jpg",
    "isPublished": false,
    "publishedAt": null,
    "createdAt": "2025-01-26T13:00:00.000Z",
    "updatedAt": "2025-01-26T13:00:00.000Z",
    "createdBy": "admin-uuid"
  }
}
```

#### PATCH /api/news/:newsId

Обновить новость (только админы).

**Authentication:** Required (admin only)

**Body:**
```json
{
  "title": "Обновленный заголовок",
  "content": "Обновленный контент",
  "imageUrl": "https://example.com/new-image.jpg",
  "isPublished": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Обновленный заголовок",
    "content": "Обновленный контент",
    "isPublished": true,
    "publishedAt": "2025-01-26T14:00:00.000Z",
    "updatedAt": "2025-01-26T14:00:00.000Z"
  }
}
```

#### DELETE /api/news/:newsId

Удалить новость (только админы).

**Authentication:** Required (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "News deleted successfully"
  }
}
```

#### POST /api/news/:newsId/publish

Опубликовать новость (только админы).

**Authentication:** Required (admin only)

**Body (optional):**
```json
{
  "publishedAt": "2025-01-27T10:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isPublished": true,
    "publishedAt": "2025-01-27T10:00:00.000Z",
    "updatedAt": "2025-01-26T14:30:00.000Z"
  }
}
```

#### POST /api/news/:newsId/unpublish

Снять новость с публикации (только админы).

**Authentication:** Required (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isPublished": false,
    "publishedAt": null,
    "updatedAt": "2025-01-26T15:00:00.000Z"
  }
}
```

#### GET /api/news/admin/list

Получить список всех новостей с фильтрами (только админы).

**Authentication:** Required (admin only)

**Query Parameters:**
- `page` (number, optional) - Номер страницы (default: 1)
- `limit` (number, optional) - Записей на странице (default: 20, max: 100)
- `isPublished` (boolean, optional) - Фильтр по статусу публикации
- `createdBy` (string, optional) - Фильтр по автору (user ID)
- `sortBy` (string, optional) - Сортировка: `publishedAt` | `createdAt` | `updatedAt` (default: updatedAt)
- `order` (string, optional) - Порядок: `asc` | `desc` (default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "news": [
      {
        "id": "uuid",
        "title": "Draft новость",
        "isPublished": false,
        "publishedAt": null,
        "createdAt": "2025-01-26T13:00:00.000Z",
        "updatedAt": "2025-01-26T13:30:00.000Z"
      },
      {
        "id": "uuid",
        "title": "Опубликованная новость",
        "isPublished": true,
        "publishedAt": "2025-01-25T10:00:00.000Z",
        "createdAt": "2025-01-25T09:00:00.000Z",
        "updatedAt": "2025-01-25T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
}
```

#### GET /api/news/admin/statistics

Получить статистику новостей (только админы).

**Authentication:** Required (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 25,
    "published": 18,
    "draft": 7,
    "recentPublished": [
      {
        "id": "uuid",
        "title": "Последняя новость",
        "publishedAt": "2025-01-26T12:00:00.000Z"
      }
    ]
  }
}
```

## Типы данных

### News

```typescript
interface News {
  id: string;
  title: string;
  titleEn: string | null;
  content: string; // Markdown
  contentEn: string | null; // Markdown
  imageUrl: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### CreateNewsInput

```typescript
interface CreateNewsInput {
  title: string;
  titleEn?: string;
  content: string; // Markdown
  contentEn?: string; // Markdown
  imageUrl?: string;
  isPublished?: boolean;
  publishedAt?: Date;
  createdBy: string;
}
```

### UpdateNewsInput

```typescript
interface UpdateNewsInput {
  title?: string;
  titleEn?: string;
  content?: string;
  contentEn?: string;
  imageUrl?: string;
  isPublished?: boolean;
  publishedAt?: Date;
}
```

### PaginatedNewsResponse

```typescript
interface PaginatedNewsResponse {
  news: News[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### NewsStatistics

```typescript
interface NewsStatistics {
  total: number;
  published: number;
  draft: number;
  recentPublished: News[];
}
```

## Сервис

### NewsService

Основной сервис для работы с новостями.

```typescript
import { newsService } from '@/modules/news';

// Создать новость
const news = await newsService.createNews({
  title: 'Важное обновление',
  titleEn: 'Important update',
  content: '# Что нового\n\nУлучшена стабильность',
  contentEn: '# What\'s New\n\nImproved stability',
  imageUrl: 'https://example.com/update.jpg',
  isPublished: false,
  createdBy: 'admin-uuid'
});

// Обновить новость
const updated = await newsService.updateNews('news-uuid', {
  title: 'Обновленный заголовок',
  isPublished: true
});

// Опубликовать новость
const published = await newsService.publishNews('news-uuid');

// Снять с публикации
const unpublished = await newsService.unpublishNews('news-uuid');

// Удалить новость
await newsService.deleteNews('news-uuid');

// Получить новость (public видят только published)
const news = await newsService.getNews('news-uuid', false);

// Получить новость (admin видит все)
const news = await newsService.getNews('news-uuid', true);

// Список опубликованных новостей
const result = await newsService.listNews({
  page: 1,
  limit: 20,
  sortBy: 'publishedAt',
  order: 'desc'
});

// Список всех новостей с фильтрами (admin)
const result = await newsService.listNewsAdmin({
  page: 1,
  limit: 20,
  isPublished: false,
  sortBy: 'updatedAt',
  order: 'desc'
});

// Статистика
const stats = await newsService.getNewsStatistics();
```

## Примеры использования

### Пример 1: Создание и публикация новости

```typescript
import { newsService } from '@/modules/news';

async function createAndPublishNews() {
  // Создать как draft
  const news = await newsService.createNews({
    title: 'Новые серверы в Азии',
    titleEn: 'New servers in Asia',
    content: `
# Расширение географии

Мы рады сообщить о добавлении новых серверов в Азиатско-Тихоокеанском регионе:

- **Сингапур** - низкая задержка для пользователей из Юго-Восточной Азии
- **Токио** - быстрый доступ для пользователей из Японии и Кореи

## Как подключиться

1. Откройте список серверов в приложении
2. Выберите новый сервер
3. Нажмите "Подключиться"
    `,
    contentEn: `
# Geographic Expansion

We're excited to announce new servers in the Asia-Pacific region:

- **Singapore** - low latency for Southeast Asian users
- **Tokyo** - fast access for users from Japan and Korea

## How to Connect

1. Open server list in the app
2. Select a new server
3. Click "Connect"
    `,
    imageUrl: 'https://example.com/asia-servers.jpg',
    isPublished: false,
    createdBy: 'admin-uuid'
  });

  console.log('News created as draft:', news.id);

  // Опубликовать сразу или запланировать на будущее
  const published = await newsService.publishNews(
    news.id,
    new Date('2025-01-27T10:00:00Z') // Запланировать на завтра
  );

  console.log('News scheduled for publication:', published.publishedAt);
}
```

### Пример 2: Получение новостей для отображения в Mini App

```typescript
import { newsService } from '@/modules/news';

async function getNewsForMiniApp() {
  const result = await newsService.listNews({
    page: 1,
    limit: 10,
    sortBy: 'publishedAt',
    order: 'desc'
  });

  // Отображение в UI
  result.news.forEach(news => {
    console.log(`
      Title: ${news.title}
      Published: ${news.publishedAt}
      Image: ${news.imageUrl || 'No image'}
    `);

    // Рендер Markdown контента
    const html = renderMarkdown(news.content);
  });

  console.log(`
    Showing ${result.news.length} of ${result.pagination.total} news
    Page ${result.pagination.page} of ${result.pagination.totalPages}
  `);
}
```

### Пример 3: Админка - управление новостями

```typescript
import { newsService } from '@/modules/news';

async function adminNewsManagement() {
  // Получить статистику
  const stats = await newsService.getNewsStatistics();
  console.log(`
    Total: ${stats.total}
    Published: ${stats.published}
    Drafts: ${stats.draft}
  `);

  // Получить все drafts для редактирования
  const drafts = await newsService.listNewsAdmin({
    isPublished: false,
    sortBy: 'updatedAt',
    order: 'desc',
    limit: 50
  });

  console.log(`Found ${drafts.news.length} draft news`);

  // Обновить draft
  if (drafts.news.length > 0) {
    const firstDraft = drafts.news[0];
    await newsService.updateNews(firstDraft.id, {
      title: 'Updated title',
      content: 'Updated content with more info'
    });
  }

  // Получить все новости конкретного автора
  const authorNews = await newsService.listNewsAdmin({
    createdBy: 'specific-admin-uuid',
    sortBy: 'createdAt',
    order: 'desc'
  });

  console.log(`Author has ${authorNews.news.length} news articles`);
}
```

### Пример 4: Автоматическая публикация при создании

```typescript
import { newsService } from '@/modules/news';

async function createAndPublishImmediately() {
  // Создать уже опубликованную новость
  const news = await newsService.createNews({
    title: 'Экстренное обновление',
    titleEn: 'Emergency update',
    content: 'Проблема решена. Все системы работают нормально.',
    contentEn: 'Issue resolved. All systems operational.',
    isPublished: true, // Опубликовать сразу
    // publishedAt будет установлен автоматически на текущее время
    createdBy: 'admin-uuid'
  });

  console.log('News published immediately:', news.publishedAt);
}
```

### Пример 5: Интеграция с уведомлениями

```typescript
import { newsService } from '@/modules/news';
import { notificationService } from '@/modules/notifications';

async function publishNewsAndNotify(newsId: string) {
  // Опубликовать новость
  const news = await newsService.publishNews(newsId);

  // Отправить уведомление всем пользователям
  await notificationService.createBroadcastNotification({
    type: 'news',
    title: news.title,
    titleEn: news.titleEn || undefined,
    message: 'Опубликована новая новость. Нажмите для просмотра.',
    messageEn: 'New article published. Tap to view.',
    metadata: {
      newsId: news.id,
    },
    userFilter: {
      hasActiveSubscription: true, // Только активные пользователи
    }
  });

  console.log('News published and notifications sent');
}
```

### Пример 6: Мультиязычное отображение

```typescript
import { newsService } from '@/modules/news';

async function displayNewsInUserLanguage(newsId: string, userLang: string) {
  const news = await newsService.getNews(newsId, false);

  // Выбрать контент на языке пользователя
  const title = userLang === 'en' && news.titleEn
    ? news.titleEn
    : news.title;

  const content = userLang === 'en' && news.contentEn
    ? news.contentEn
    : news.content;

  console.log(`
    === ${title} ===
    ${content}

    Published: ${news.publishedAt}
  `);

  return { title, content };
}
```

## Markdown Support

Модуль поддерживает **полный Markdown** в полях `content` и `contentEn`:

- **Заголовки** - `# H1`, `## H2`, `### H3`, etc.
- **Жирный текст** - `**bold**`
- **Курсив** - `*italic*`
- **Списки** - нумерованные и маркированные
- **Ссылки** - `[text](url)`
- **Изображения** - `![alt](url)`
- **Код** - inline `` `code` `` и блоки ` ```code``` `
- **Цитаты** - `> quote`
- **Таблицы** - GitHub-flavored tables

## Логирование

Все операции логируются через Winston:

```typescript
// Успешные операции - info level
logger.info('News created', {
  newsId: news.id,
  createdBy: input.createdBy,
  isPublished: news.isPublished
});

// Ошибки - error level
logger.error('Failed to create news', {
  error: error.message,
  input
});
```

## Ошибки

Модуль использует стандартные ошибки из `@/lib/errors`:

- **NotFoundError** - Новость не найдена
- **ForbiddenError** - Нет доступа (не админ)
- **ValidationError** - Невалидные данные (через Zod)

## Зависимости

- **Prisma Client** - База данных
- **Winston** - Логирование
- **Zod** - Валидация схем
- **Auth Middleware** - Аутентификация

## Связанные модули

- **Notifications** - Отправка уведомлений при публикации новостей
- **Admin** - Админ панель для управления новостями

## Database Schema

```prisma
model News {
  id          String    @id @default(uuid())
  title       String
  titleEn     String?   @map("title_en")
  content     String    // Markdown
  contentEn   String?   @map("content_en")
  imageUrl    String?   @map("image_url")
  isPublished Boolean   @default(false) @map("is_published")
  publishedAt DateTime? @map("published_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  createdBy   String    @map("created_by")

  @@map("news")
  @@index([isPublished, publishedAt])
}
```

## Производительность

- **Индексы** на `isPublished` и `publishedAt` для быстрых запросов
- **Пагинация** для списков новостей
- **Лимит** на количество записей (max 100 per page)

## Безопасность

- ✅ Аутентификация на admin endpoints
- ✅ Проверка роли админа
- ✅ Валидация всех входных данных через Zod
- ✅ Sanitization в Markdown (рекомендуется использовать безопасный парсер на клиенте)
- ✅ URL валидация для изображений

---

**Статус модуля**: ✅ Production Ready

**Версия**: 1.0.0

**Последнее обновление**: 2025-01-26
