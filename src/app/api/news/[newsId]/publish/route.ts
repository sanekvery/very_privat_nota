/**
 * Publish News API
 * POST /api/news/:newsId/publish - Publish news (admin only)
 */

import { NextRequest } from 'next/server';
import { newsService } from '@/modules/news/news.service';
import { publishNewsSchema } from '@/modules/news/news.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * POST /api/news/:newsId/publish
 * Publish news (admin only)
 *
 * Body (optional):
 * {
 *   publishedAt?: Date
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { newsId: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse body (optional)
    let body = {};
    try {
      body = await request.json();
    } catch {
      // No body is ok
    }

    // Validate
    const validated = publishNewsSchema.parse({
      newsId: params.newsId,
      ...body,
    });

    // Publish news
    const news = await newsService.publishNews(
      validated.newsId,
      validated.publishedAt
    );

    return createSuccessResponse(news);
  } catch (error) {
    return createErrorResponse(error);
  }
}
