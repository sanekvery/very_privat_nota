/**
 * Admin Notification Statistics API
 * GET /api/notifications/admin/statistics - Get notification statistics for all users (admin only)
 */

import { NextRequest } from 'next/server';
import { notificationService } from '@/modules/notifications/notification.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/notifications/admin/statistics
 * Get notification statistics for all users (admin only)
 *
 * Returns:
 * {
 *   totalNotifications: number,
 *   totalUnread: number,
 *   totalRead: number,
 *   byType: Record<NotificationType, number>,
 *   recentNotifications: Notification[],
 *   userStatistics: Array<{
 *     userId: string,
 *     username: string | null,
 *     totalNotifications: number,
 *     unreadNotifications: number
 *   }>
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
    const stats = await notificationService.getAdminStatistics();

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error);
  }
}
