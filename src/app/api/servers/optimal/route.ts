/**
 * Optimal Server Selection API
 * GET /api/servers/optimal - Get optimal server for new user
 */

import { NextRequest } from 'next/server';
import { serverService } from '@/modules/servers/server.service';
import { serverSelectionSchema } from '@/modules/servers/servers.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/servers/optimal
 * Get optimal server based on load balancing
 *
 * Query params:
 * - preferredCountry (ISO 3166-1 alpha-2, optional)
 * - maxCapacity (0-100, default 90)
 * - requireActive (boolean, default true)
 *
 * Returns:
 * {
 *   server: VpnServer
 *   score: number (higher is better)
 *   reason: string (human-readable)
 *   metrics: ServerLoadMetrics
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth(request);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const params = {
      preferredCountry: searchParams.get('preferredCountry') || undefined,
      maxCapacity: searchParams.get('maxCapacity')
        ? parseInt(searchParams.get('maxCapacity')!)
        : undefined,
      requireActive:
        searchParams.get('requireActive') === 'false' ? false : undefined,
    };

    // Validate
    const validated = serverSelectionSchema.parse(params);

    // Get optimal server
    const result = await serverService.getOptimalServer(validated);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
