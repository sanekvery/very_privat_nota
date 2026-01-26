/**
 * Notification Details API
 * GET /api/notifications/:notificationId - Get notification details
 * DELETE /api/notifications/:notificationId - Delete notification
 */

import { NextRequest } from 'next/server';
import { notificationService } from '@/modules/notifications/notification.service';
import { getNotificationSchema, deleteNotificationSchema } from '@/modules/notifications/notifications.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/notifications/:notificationId
 * Get notification details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Validate
    const validated = getNotificationSchema.parse({
      notificationId: params.notificationId,
    });

    // Get notification (will check access)
    const notification = await notificationService.getNotification(
      validated.notificationId,
      user.id
    );

    return createSuccessResponse(notification);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/notifications/:notificationId
 * Delete notification (user can delete their own notifications)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Validate
    const validated = deleteNotificationSchema.parse({
      notificationId: params.notificationId,
    });

    // Delete notification (will check access)
    await notificationService.deleteNotification(
      validated.notificationId,
      user.id
    );

    return createSuccessResponse({ message: 'Notification deleted successfully' });
  } catch (error) {
    return createErrorResponse(error);
  }
}
