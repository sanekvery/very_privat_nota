/**
 * Admin News Statistics API
 * GET /api/news/admin/statistics - Get news statistics (admin only)
 */

import { NextRequest } from 'next/server';
import { newsService } from '@/modules/news/news.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/news/admin/statistics
 * Get news statistics (admin only)
 *
 * Returns:
 * {
 *   total: number,
 *   published: number,
 *   draft: number,
 *   recentPublished: News[]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Get statistics
    const stats = await newsService.getNewsStatistics();

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error);
  }
}
