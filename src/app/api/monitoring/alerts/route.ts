/**
 * Alerts API
 * GET /api/monitoring/alerts - Get recent alerts
 * POST /api/monitoring/alerts - Create alert (admin only)
 */

import { NextRequest } from 'next/server';
import { monitoringService } from '@/modules/monitoring/monitoring.service';
import { createAlertSchema } from '@/modules/monitoring/monitoring.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/monitoring/alerts
 * Get recent alerts
 *
 * Query params:
 * - limit (number, default 20, max 100)
 *
 * Returns: Alert[]
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Only admins can view alerts
    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse limit
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20'),
      100
    );

    // Get alerts
    const alerts = await monitoringService.getRecentAlerts(limit);

    return createSuccessResponse(alerts);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/monitoring/alerts
 * Create new alert (admin only)
 *
 * Body:
 * {
 *   type: string,
 *   severity: 'info' | 'warning' | 'error' | 'critical',
 *   message: string,
 *   serverId?: string,
 *   userId?: string,
 *   metadata?: Record<string, unknown>
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
    const validated = createAlertSchema.parse(body);

    // Create alert
    const alert = await monitoringService.createAlert(validated);

    return createSuccessResponse(alert);
  } catch (error) {
    return createErrorResponse(error);
  }
}
