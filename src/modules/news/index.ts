/**
 * News Module
 * Exports all news-related functionality
 */

// Service
export { newsService } from './news.service';

// Types
export type {
  News,
  CreateNewsInput,
  UpdateNewsInput,
  NewsListQuery,
  NewsAdminListQuery,
  PaginatedNewsResponse,
  NewsStatistics,
} from './news.types';

// Validation Schemas
export {
  createNewsSchema,
  updateNewsSchema,
  getNewsByIdSchema,
  deleteNewsSchema,
  listNewsSchema,
  listNewsAdminSchema,
  publishNewsSchema,
  unpublishNewsSchema,
} from './news.validation';
