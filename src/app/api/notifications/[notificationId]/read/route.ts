/**
 * Mark Notification As Read API
 * POST /api/notifications/:notificationId/read - Mark notification as read
 */

import { NextRequest } from 'next/server';
import { notificationService } from '@/modules/notifications/notification.service';
import { markAsReadSchema } from '@/modules/notifications/notifications.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * POST /api/notifications/:notificationId/read
 * Mark notification as read
 *
 * Returns: Notification
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Validate
    const validated = markAsReadSchema.parse({
      notificationId: params.notificationId,
    });

    // Mark as read (will check access)
    const notification = await notificationService.markAsRead(
      validated.notificationId,
      user.id
    );

    return createSuccessResponse(notification);
  } catch (error) {
    return createErrorResponse(error);
  }
}
