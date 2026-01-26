/**
 * Support Statistics API
 * GET /api/support/statistics - Get ticket statistics for current user
 */

import { NextRequest } from 'next/server';
import { supportService } from '@/modules/support/support.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/support/statistics
 * Get ticket statistics for current user
 *
 * Returns:
 * {
 *   total: number,
 *   open: number,
 *   inProgress: number,
 *   waitingUser: number,
 *   closed: number,
 *   byPriority: {
 *     low: number,
 *     medium: number,
 *     high: number,
 *     urgent: number
 *   },
 *   avgResolutionTime: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Get statistics
    const stats = await supportService.getTicketStatistics(user.id);

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error);
  }
}
