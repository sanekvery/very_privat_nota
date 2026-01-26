/**
 * Admin News List API
 * GET /api/news/admin/list - Get list of all news with filters (admin only)
 */

import { NextRequest } from 'next/server';
import { newsService } from '@/modules/news/news.service';
import { listNewsAdminSchema } from '@/modules/news/news.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/news/admin/list
 * Get list of all news with filters (admin only)
 *
 * Query Parameters:
 * - page (number, optional) - Page number (default: 1)
 * - limit (number, optional) - Items per page (default: 20, max: 100)
 * - isPublished (boolean, optional) - Filter by publication status
 * - createdBy (string, optional) - Filter by creator user ID
 * - sortBy (string, optional) - Sort by field: publishedAt | createdAt | updatedAt (default: updatedAt)
 * - order (string, optional) - Sort order: asc | desc (default: desc)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      isPublished: searchParams.get('isPublished'),
      createdBy: searchParams.get('createdBy'),
      sortBy: searchParams.get('sortBy'),
      order: searchParams.get('order'),
    };

    // Validate
    const validated = listNewsAdminSchema.parse(query);

    // Get news with filters
    const result = await newsService.listNewsAdmin(validated);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
