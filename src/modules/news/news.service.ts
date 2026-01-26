/**
 * News Service
 * Business logic for news/announcements management
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { NotFoundError } from '@/lib/errors';
import type {
  News,
  CreateNewsInput,
  UpdateNewsInput,
  NewsListQuery,
  NewsAdminListQuery,
  PaginatedNewsResponse,
  NewsStatistics,
} from './news.types';

class NewsService {
  /**
   * Create news (admin only)
   */
  async createNews(input: CreateNewsInput): Promise<News> {
    try {
      const news = await prisma.news.create({
        data: {
          title: input.title,
          titleEn: input.titleEn,
          content: input.content,
          contentEn: input.contentEn,
          imageUrl: input.imageUrl,
          isPublished: input.isPublished || false,
          publishedAt: input.isPublished ? (input.publishedAt || new Date()) : null,
          createdBy: input.createdBy,
        },
      });

      logger.info('News created', {
        newsId: news.id,
        createdBy: input.createdBy,
        isPublished: news.isPublished,
      });

      return news;
    } catch (error) {
      logger.error('Failed to create news', {
        error: error instanceof Error ? error.message : 'Unknown error',
        input,
      });
      throw error;
    }
  }

  /**
   * Update news (admin only)
   */
  async updateNews(newsId: string, input: UpdateNewsInput): Promise<News> {
    try {
      // Check if news exists
      const existing = await prisma.news.findUnique({
        where: { id: newsId },
      });

      if (!existing) {
        throw new NotFoundError('News not found');
      }

      // Prepare update data
      const updateData: any = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.titleEn !== undefined) updateData.titleEn = input.titleEn;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.contentEn !== undefined) updateData.contentEn = input.contentEn;
      if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;

      // Handle publication status
      if (input.isPublished !== undefined) {
        updateData.isPublished = input.isPublished;

        // If publishing and no publishedAt provided, use current date
        if (input.isPublished && !existing.isPublished) {
          updateData.publishedAt = input.publishedAt || new Date();
        }

        // If unpublishing, clear publishedAt
        if (!input.isPublished) {
          updateData.publishedAt = null;
        }
      }

      // If publishedAt explicitly provided
      if (input.publishedAt !== undefined) {
        updateData.publishedAt = input.publishedAt;
      }

      const news = await prisma.news.update({
        where: { id: newsId },
        data: updateData,
      });

      logger.info('News updated', {
        newsId,
        changes: Object.keys(updateData),
      });

      return news;
    } catch (error) {
      logger.error('Failed to update news', {
        error: error instanceof Error ? error.message : 'Unknown error',
        newsId,
      });
      throw error;
    }
  }

  /**
   * Delete news (admin only)
   */
  async deleteNews(newsId: string): Promise<void> {
    try {
      const news = await prisma.news.findUnique({
        where: { id: newsId },
      });

      if (!news) {
        throw new NotFoundError('News not found');
      }

      await prisma.news.delete({
        where: { id: newsId },
      });

      logger.info('News deleted', { newsId });
    } catch (error) {
      logger.error('Failed to delete news', {
        error: error instanceof Error ? error.message : 'Unknown error',
        newsId,
      });
      throw error;
    }
  }

  /**
   * Publish news (admin only)
   */
  async publishNews(newsId: string, publishedAt?: Date): Promise<News> {
    try {
      const news = await prisma.news.update({
        where: { id: newsId },
        data: {
          isPublished: true,
          publishedAt: publishedAt || new Date(),
        },
      });

      logger.info('News published', {
        newsId,
        publishedAt: news.publishedAt,
      });

      return news;
    } catch (error) {
      logger.error('Failed to publish news', {
        error: error instanceof Error ? error.message : 'Unknown error',
        newsId,
      });
      throw error;
    }
  }

  /**
   * Unpublish news (admin only)
   */
  async unpublishNews(newsId: string): Promise<News> {
    try {
      const news = await prisma.news.update({
        where: { id: newsId },
        data: {
          isPublished: false,
          publishedAt: null,
        },
      });

      logger.info('News unpublished', { newsId });

      return news;
    } catch (error) {
      logger.error('Failed to unpublish news', {
        error: error instanceof Error ? error.message : 'Unknown error',
        newsId,
      });
      throw error;
    }
  }

  /**
   * Get news by ID
   * Users can only see published news
   * Admins can see all
   */
  async getNews(newsId: string, isAdmin: boolean = false): Promise<News> {
    try {
      const where: any = { id: newsId };

      // Non-admins can only see published news
      if (!isAdmin) {
        where.isPublished = true;
      }

      const news = await prisma.news.findFirst({
        where,
      });

      if (!news) {
        throw new NotFoundError('News not found');
      }

      return news;
    } catch (error) {
      logger.error('Failed to get news', {
        error: error instanceof Error ? error.message : 'Unknown error',
        newsId,
        isAdmin,
      });
      throw error;
    }
  }

  /**
   * List news (public - only published)
   */
  async listNews(query: NewsListQuery): Promise<PaginatedNewsResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'publishedAt',
        order = 'desc',
      } = query;

      const skip = (page - 1) * limit;

      // Only published news
      const where = {
        isPublished: true,
      };

      const [news, total] = await Promise.all([
        prisma.news.findMany({
          where,
          orderBy: { [sortBy]: order },
          skip,
          take: limit,
        }),
        prisma.news.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.info('News listed (public)', {
        page,
        limit,
        total,
        count: news.length,
      });

      return {
        news,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Failed to list news', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
      });
      throw error;
    }
  }

  /**
   * List news (admin - with filters)
   */
  async listNewsAdmin(query: NewsAdminListQuery): Promise<PaginatedNewsResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        isPublished,
        createdBy,
        sortBy = 'updatedAt',
        order = 'desc',
      } = query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (isPublished !== undefined) {
        where.isPublished = isPublished;
      }
      if (createdBy) {
        where.createdBy = createdBy;
      }

      const [news, total] = await Promise.all([
        prisma.news.findMany({
          where,
          orderBy: { [sortBy]: order },
          skip,
          take: limit,
        }),
        prisma.news.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.info('News listed (admin)', {
        page,
        limit,
        total,
        count: news.length,
        filters: { isPublished, createdBy },
      });

      return {
        news,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Failed to list news (admin)', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
      });
      throw error;
    }
  }

  /**
   * Get news statistics (admin only)
   */
  async getNewsStatistics(): Promise<NewsStatistics> {
    try {
      const [total, published, draft, recentPublished] = await Promise.all([
        prisma.news.count(),
        prisma.news.count({ where: { isPublished: true } }),
        prisma.news.count({ where: { isPublished: false } }),
        prisma.news.findMany({
          where: { isPublished: true },
          orderBy: { publishedAt: 'desc' },
          take: 5,
        }),
      ]);

      logger.info('News statistics retrieved', {
        total,
        published,
        draft,
      });

      return {
        total,
        published,
        draft,
        recentPublished,
      };
    } catch (error) {
      logger.error('Failed to get news statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const newsService = new NewsService();
