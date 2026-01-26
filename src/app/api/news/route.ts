/**
 * News API
 * GET /api/news - Get list of published news
 * POST /api/news - Create news (admin only)
 */

import { NextRequest } from 'next/server';
import { newsService } from '@/modules/news/news.service';
import { createNewsSchema, listNewsSchema } from '@/modules/news/news.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/news
 * Get list of published news (public)
 *
 * Query Parameters:
 * - page (number, optional) - Page number (default: 1)
 * - limit (number, optional) - Items per page (default: 20, max: 100)
 * - sortBy (string, optional) - Sort by field: publishedAt | createdAt (default: publishedAt)
 * - order (string, optional) - Sort order: asc | desc (default: desc)
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy'),
      order: searchParams.get('order'),
    };

    // Validate
    const validated = listNewsSchema.parse(query);

    // Get published news
    const result = await newsService.listNews(validated);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/news
 * Create news (admin only)
 *
 * Body:
 * {
 *   title: string,
 *   titleEn?: string,
 *   content: string,
 *   contentEn?: string,
 *   imageUrl?: string,
 *   isPublished?: boolean,
 *   publishedAt?: Date
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse body
    const body = await request.json();

    // Validate
    const validated = createNewsSchema.parse({
      ...body,
      createdBy: user.id,
    });

    // Create news
    const news = await newsService.createNews(validated);

    return createSuccessResponse(news);
  } catch (error) {
    return createErrorResponse(error);
  }
}
