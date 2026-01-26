/**
 * Notifications API
 * GET /api/notifications - List notifications for current user
 * POST /api/notifications - Create notification (admin only)
 */

import { NextRequest } from 'next/server';
import { notificationService } from '@/modules/notifications/notification.service';
import { createNotificationSchema, listNotificationsSchema } from '@/modules/notifications/notifications.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/notifications
 * List notifications for current user
 *
 * Query params:
 * - type (NotificationType, optional)
 * - isRead (boolean, optional)
 * - limit (number, default 20, max 100)
 * - offset (number, default 0)
 * - order ('asc' | 'desc', default 'desc')
 *
 * Returns:
 * {
 *   notifications: Notification[],
 *   total: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const params = {
      userId: user.id,
      type: searchParams.get('type') as any,
      isRead: searchParams.get('isRead') === 'true' ? true : searchParams.get('isRead') === 'false' ? false : undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : undefined,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : undefined,
      order: searchParams.get('order') as any,
    };

    // Validate
    const validated = listNotificationsSchema.parse(params);

    // Get notifications
    const result = await notificationService.listNotifications(validated);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/notifications
 * Create notification for specific user (admin only)
 *
 * Body:
 * {
 *   userId: string,
 *   type: NotificationType,
 *   title: string,
 *   titleEn?: string,
 *   message: string,
 *   messageEn?: string,
 *   metadata?: Record<string, any>
 * }
 *
 * Returns: Notification
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
    const validated = createNotificationSchema.parse(body);

    // Create notification
    const notification = await notificationService.createNotification(validated);

    return createSuccessResponse(notification);
  } catch (error) {
    return createErrorResponse(error);
  }
}
