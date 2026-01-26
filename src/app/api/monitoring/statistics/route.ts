/**
 * Monitoring Statistics API
 * GET /api/monitoring/statistics - Get comprehensive monitoring statistics (admin only)
 */

import { NextRequest } from 'next/server';
import { monitoringService } from '@/modules/monitoring/monitoring.service';
import { abuseDetectionService } from '@/modules/monitoring/abuse-detection.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/monitoring/statistics
 * Get comprehensive monitoring statistics for admin dashboard
 *
 * Query params:
 * - includeAbuseStats (boolean, default false) - include abuse statistics (slow)
 *
 * Returns:
 * {
 *   systemHealth: SystemHealthSummary,
 *   topServersByLoad: Array<{serverId, serverName, load}>,
 *   topUsersByBandwidth: Array<{userId, username?, bandwidth}>,
 *   recentAlerts: Alert[],
 *   abuseDetections: number,
 *   abuseStats?: {
 *     totalChecked: number,
 *     abusiveUsers: number,
 *     averageScore: number,
 *     byRecommendation: Record<string, number>
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const includeAbuseStats = searchParams.get('includeAbuseStats') === 'true';

    // Get monitoring statistics
    const stats = await monitoringService.getMonitoringStatistics();

    // Optionally include detailed abuse statistics
    let abuseStats;
    if (includeAbuseStats) {
      abuseStats = await abuseDetectionService.getAbuseStatistics({
        period: '24h',
        minScore: 50, // Only count users with score >= 50
      });
    }

    return createSuccessResponse({
      ...stats,
      ...(abuseStats && { abuseStats }),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
