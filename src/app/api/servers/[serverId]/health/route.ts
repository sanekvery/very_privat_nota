/**
 * Server Health Check API
 * POST /api/servers/:serverId/health - Perform health check
 */

import { NextRequest } from 'next/server';
import { serverService } from '@/modules/servers/server.service';
import { healthCheckSchema } from '@/modules/servers/servers.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * POST /api/servers/:serverId/health
 * Perform health check on server (admin only)
 *
 * Returns:
 * {
 *   serverId: string
 *   isHealthy: boolean
 *   responseTime?: number (ms)
 *   lastChecked: Date
 *   error?: string
 *   details?: {
 *     agentReachable: boolean
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Validate
    const validated = healthCheckSchema.parse({
      serverId: params.serverId,
    });

    // Perform health check
    const result = await serverService.performHealthCheck(validated.serverId);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
