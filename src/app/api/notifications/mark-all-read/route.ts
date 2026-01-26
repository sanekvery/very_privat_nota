/**
 * Mark All Notifications As Read API
 * POST /api/notifications/mark-all-read - Mark all notifications as read for current user
 */

import { NextRequest } from 'next/server';
import { notificationService } from '@/modules/notifications/notification.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for current user
 *
 * Returns:
 * {
 *   updated: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Mark all as read
    const result = await notificationService.markAllAsRead(user.id);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
