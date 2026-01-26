/**
 * Server Health Trend API
 * GET /api/monitoring/servers/:serverId/health-trend - Get server health trend
 */

import { NextRequest } from 'next/server';
import { monitoringService } from '@/modules/monitoring/monitoring.service';
import { uuidSchema } from '@/lib/validation';
import { timeIntervalSchema } from '@/modules/monitoring/monitoring.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/monitoring/servers/:serverId/health-trend
 * Get health trend for a specific server
 *
 * Query params:
 * - period ('1h' | '24h' | '7d' | '30d', default '24h')
 *
 * Returns:
 * {
 *   serverId: string,
 *   period: string,
 *   checks: ServerHealthCheck[],
 *   uptimePercentage: number,
 *   avgResponseTime: number,
 *   failureCount: number,
 *   successCount: number
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    // Require authentication
    await requireAuth(request);

    // Validate serverId
    const serverId = uuidSchema.parse(params.serverId);

    // Parse period
    const searchParams = request.nextUrl.searchParams;
    const period = timeIntervalSchema.parse(
      searchParams.get('period') || '24h'
    );

    // Get health trend
    const trend = await monitoringService.getServerHealthTrend(serverId, period);

    return createSuccessResponse(trend);
  } catch (error) {
    return createErrorResponse(error);
  }
}
