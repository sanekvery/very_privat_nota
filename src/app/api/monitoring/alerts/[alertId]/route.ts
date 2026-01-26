/**
 * Alert Resolution API
 * PATCH /api/monitoring/alerts/:alertId - Resolve alert (admin only)
 */

import { NextRequest } from 'next/server';
import { monitoringService } from '@/modules/monitoring/monitoring.service';
import { resolveAlertSchema } from '@/modules/monitoring/monitoring.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * PATCH /api/monitoring/alerts/:alertId
 * Resolve an alert
 *
 * Returns resolved Alert
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Validate
    const validated = resolveAlertSchema.parse({
      alertId: params.alertId,
    });

    // Resolve alert
    const alert = await monitoringService.resolveAlert(validated.alertId);

    return createSuccessResponse(alert);
  } catch (error) {
    return createErrorResponse(error);
  }
}
