/**
 * News Details API
 * GET /api/news/:newsId - Get news by ID
 * PATCH /api/news/:newsId - Update news (admin only)
 * DELETE /api/news/:newsId - Delete news (admin only)
 */

import { NextRequest } from 'next/server';
import { newsService } from '@/modules/news/news.service';
import { getNewsByIdSchema, updateNewsSchema, deleteNewsSchema } from '@/modules/news/news.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/news/:newsId
 * Get news by ID
 * Public can only see published news
 * Admins can see all
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { newsId: string } }
) {
  try {
    // Validate
    const validated = getNewsByIdSchema.parse({
      newsId: params.newsId,
    });

    // Check if user is admin (optional authentication)
    let isAdmin = false;
    try {
      const user = await requireAuth(request);
      isAdmin = user.isAdmin;
    } catch {
      // Not authenticated or not admin - will only see published news
      isAdmin = false;
    }

    // Get news
    const news = await newsService.getNews(validated.newsId, isAdmin);

    return createSuccessResponse(news);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PATCH /api/news/:newsId
 * Update news (admin only)
 *
 * Body:
 * {
 *   title?: string,
 *   titleEn?: string,
 *   content?: string,
 *   contentEn?: string,
 *   imageUrl?: string,
 *   isPublished?: boolean,
 *   publishedAt?: Date
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { newsId: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse body
    const body = await request.json();

    // Validate
    const validated = updateNewsSchema.parse({
      newsId: params.newsId,
      ...body,
    });

    // Update news
    const { newsId, ...updateData } = validated;
    const news = await newsService.updateNews(newsId, updateData);

    return createSuccessResponse(news);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/news/:newsId
 * Delete news (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { newsId: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Validate
    const validated = deleteNewsSchema.parse({
      newsId: params.newsId,
    });

    // Delete news
    await newsService.deleteNews(validated.newsId);

    return createSuccessResponse({ message: 'News deleted successfully' });
  } catch (error) {
    return createErrorResponse(error);
  }
}
