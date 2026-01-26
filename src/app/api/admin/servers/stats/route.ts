/**
 * Server Statistics API (Admin)
 * GET /api/admin/servers/stats - Get server statistics
 */

import { NextRequest } from 'next/server';
import { serverService } from '@/modules/servers/server.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/admin/servers/stats
 * Get comprehensive server statistics (admin only)
 *
 * Returns:
 * {
 *   totalServers: number
 *   activeServers: number
 *   maintenanceServers: number
 *   offlineServers: number
 *   totalCapacity: number
 *   usedCapacity: number
 *   averageLoad: number (percentage)
 *   serversByCountry: Array<{countryCode: string, count: number}>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Get server statistics
    const stats = await serverService.getServerStatistics();

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error);
  }
}
