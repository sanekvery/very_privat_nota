/**
 * Unpublish News API
 * POST /api/news/:newsId/unpublish - Unpublish news (admin only)
 */

import { NextRequest } from 'next/server';
import { newsService } from '@/modules/news/news.service';
import { unpublishNewsSchema } from '@/modules/news/news.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * POST /api/news/:newsId/unpublish
 * Unpublish news (admin only)
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

    // Validate
    const validated = unpublishNewsSchema.parse({
      newsId: params.newsId,
    });

    // Unpublish news
    const news = await newsService.unpublishNews(validated.newsId);

    return createSuccessResponse(news);
  } catch (error) {
    return createErrorResponse(error);
  }
}
