/**
 * Bandwidth Usage API
 * GET /api/monitoring/bandwidth - Get bandwidth usage statistics
 */

import { NextRequest } from 'next/server';
import { monitoringService } from '@/modules/monitoring/monitoring.service';
import { bandwidthUsageSchema } from '@/modules/monitoring/monitoring.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/monitoring/bandwidth
 * Get bandwidth usage for user or server
 *
 * Query params:
 * - userId (UUID, optional) - specific user (admin only)
 * - serverId (UUID, optional) - specific server
 * - period ('1h' | '24h' | '7d' | '30d', default '24h')
 *
 * Returns:
 * {
 *   userId?: string,
 *   serverId?: string,
 *   bytesIn: number,
 *   bytesOut: number,
 *   totalBytes: number,
 *   period: string
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const params = {
      userId: searchParams.get('userId') || undefined,
      serverId: searchParams.get('serverId') || undefined,
      period: (searchParams.get('period') || '24h') as '1h' | '24h' | '7d' | '30d',
    };

    // Validate
    const validated = bandwidthUsageSchema.parse(params);

    // If userId specified and not self, require admin
    if (validated.userId && validated.userId !== user.id && !user.isAdmin) {
      throw new ForbiddenError('Admin access required to view other users bandwidth');
    }

    // If no userId specified, use current user
    const queryUserId = validated.userId || user.id;

    // Get bandwidth usage
    const usage = await monitoringService.getBandwidthUsage({
      userId: queryUserId,
      serverId: validated.serverId,
      period: validated.period,
    });

    return createSuccessResponse(usage);
  } catch (error) {
    return createErrorResponse(error);
  }
}
