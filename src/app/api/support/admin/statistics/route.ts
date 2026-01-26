/**
 * Admin Support Statistics API
 * GET /api/support/admin/statistics - Get comprehensive support statistics (admin only)
 */

import { NextRequest } from 'next/server';
import { supportService } from '@/modules/support/support.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/support/admin/statistics
 * Get admin support statistics
 *
 * Returns:
 * {
 *   total: number,
 *   open: number,
 *   inProgress: number,
 *   waitingUser: number,
 *   closed: number,
 *   byPriority: { low, medium, high, urgent },
 *   avgResolutionTime: number,
 *   unassignedCount: number,
 *   recentTickets: SupportTicket[],
 *   topAssignees: Array<{ userId, username, ticketCount, resolvedCount }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Get admin statistics
    const stats = await supportService.getAdminStatistics();

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error);
  }
}
