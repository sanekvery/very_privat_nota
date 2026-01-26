/**
 * Notification Statistics API
 * GET /api/notifications/statistics - Get notification statistics for current user
 */

import { NextRequest } from 'next/server';
import { notificationService } from '@/modules/notifications/notification.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/notifications/statistics
 * Get notification statistics for current user
 *
 * Returns:
 * {
 *   total: number,
 *   unread: number,
 *   read: number,
 *   byType: Record<NotificationType, number>,
 *   recentUnread: Notification[]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Get statistics
    const stats = await notificationService.getNotificationStatistics(user.id);

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error);
  }
}
