/**
 * Broadcast Notifications API
 * POST /api/notifications/broadcast - Send notification to multiple users (admin only)
 */

import { NextRequest } from 'next/server';
import { notificationService } from '@/modules/notifications/notification.service';
import { createBroadcastNotificationSchema } from '@/modules/notifications/notifications.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * POST /api/notifications/broadcast
 * Send notification to multiple users based on filter (admin only)
 *
 * Body:
 * {
 *   type: NotificationType,
 *   title: string,
 *   titleEn?: string,
 *   message: string,
 *   messageEn?: string,
 *   metadata?: Record<string, any>,
 *   userFilter?: {
 *     hasActiveSubscription?: boolean,
 *     isAdmin?: boolean
 *   }
 * }
 *
 * Returns:
 * {
 *   created: number,
 *   notifications: Notification[]
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
    const validated = createBroadcastNotificationSchema.parse(body);

    // Create broadcast notification
    const result = await notificationService.createBroadcastNotification(validated);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
