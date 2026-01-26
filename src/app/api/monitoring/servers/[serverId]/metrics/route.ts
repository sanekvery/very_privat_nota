/**
 * Server Metrics API
 * GET /api/monitoring/servers/:serverId/metrics - Get server metrics
 */

import { NextRequest } from 'next/server';
import { monitoringService } from '@/modules/monitoring/monitoring.service';
import { getServerMetricsSchema } from '@/modules/monitoring/monitoring.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/monitoring/servers/:serverId/metrics
 * Get metrics for a specific server
 *
 * Query params:
 * - period ('1h' | '24h' | '7d' | '30d', default '24h')
 * - limit (number, default 100, max 1000)
 *
 * Returns: ServerMetric[]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    // Require authentication
    await requireAuth(request);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      serverId: params.serverId,
      period: (searchParams.get('period') || '24h') as '1h' | '24h' | '7d' | '30d',
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : undefined,
    };

    // Validate
    const validated = getServerMetricsSchema.parse(queryParams);

    // Get metrics
    const metrics = await monitoringService.getServerMetrics(
      validated.serverId,
      validated.period,
      validated.limit
    );

    return createSuccessResponse(metrics);
  } catch (error) {
    return createErrorResponse(error);
  }
}
