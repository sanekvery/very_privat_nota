/**
 * System Health API
 * GET /api/monitoring/health - Get system health summary
 */

import { NextRequest } from 'next/server';
import { monitoringService } from '@/modules/monitoring/monitoring.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/monitoring/health
 * Get overall system health status
 *
 * Returns:
 * {
 *   status: 'healthy' | 'degraded' | 'critical' | 'offline',
 *   totalServers: number,
 *   healthyServers: number,
 *   degradedServers: number,
 *   criticalServers: number,
 *   offlineServers: number,
 *   totalUsers: number,
 *   activeUsers: number,
 *   totalBandwidth: number,
 *   avgServerLoad: number,
 *   alerts: Alert[]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth(request);

    // Get system health
    const health = await monitoringService.getSystemHealth();

    return createSuccessResponse(health);
  } catch (error) {
    return createErrorResponse(error);
  }
}
