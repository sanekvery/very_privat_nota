/**
 * News Module Types
 * Domain types for news/announcements
 */

import type { News } from '@prisma/client';

// News with all fields
export type { News };

// Create news input
export interface CreateNewsInput {
  title: string;
  titleEn?: string;
  content: string; // Markdown
  contentEn?: string; // Markdown
  imageUrl?: string;
  isPublished?: boolean;
  publishedAt?: Date;
  createdBy: string;
}

// Update news input
export interface UpdateNewsInput {
  title?: string;
  titleEn?: string;
  content?: string;
  contentEn?: string;
  imageUrl?: string | null;
  isPublished?: boolean;
  publishedAt?: Date | null;
}

// News list query (for users)
export interface NewsListQuery {
  page?: number;
  limit?: number;
  sortBy?: 'publishedAt' | 'createdAt';
  order?: 'asc' | 'desc';
}

// News admin list query
export interface NewsAdminListQuery {
  page?: number;
  limit?: number;
  isPublished?: boolean;
  createdBy?: string;
  sortBy?: 'publishedAt' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

// Paginated news response
export interface PaginatedNewsResponse {
  news: News[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// News statistics
export interface NewsStatistics {
  total: number;
  published: number;
  draft: number;
  recentPublished: News[];
}
