/**
 * Servers API Routes
 * GET /api/servers - List all servers
 * POST /api/servers - Create new server (admin)
 */

import { NextRequest } from 'next/server';
import { serverService } from '@/modules/servers/server.service';
import {
  createServerSchema,
  listServersSchema,
} from '@/modules/servers/servers.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/servers
 * List all servers with optional filters
 *
 * Query params:
 * - status (active, maintenance, offline)
 * - countryCode (ISO 3166-1 alpha-2)
 * - isActive (boolean)
 * - limit (number, default 50)
 * - offset (number, default 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth(request);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const params = {
      status: searchParams.get('status') || undefined,
      countryCode: searchParams.get('countryCode') || undefined,
      isActive:
        searchParams.get('isActive') === 'true'
          ? true
          : searchParams.get('isActive') === 'false'
          ? false
          : undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : undefined,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : undefined,
    };

    // Validate
    const validated = listServersSchema.parse(params);

    // Get servers
    const servers = await serverService.getAllServers(validated);

    return createSuccessResponse(servers);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/servers
 * Create new server (admin only)
 *
 * Request body:
 * {
 *   name: string
 *   host: string
 *   port?: number (default 51820)
 *   publicKey: string
 *   endpoint: string
 *   location: string
 *   countryCode: string (ISO 3166-1 alpha-2)
 *   ipPoolStart: string (IPv4)
 *   ipPoolEnd: string (IPv4)
 *   maxUsers?: number (default 1000)
 *   agentApiUrl: string
 *   agentApiToken: string
 *   allowedIps?: string (default "0.0.0.0/0")
 *   dns?: string (default "1.1.1.1, 1.0.0.1")
 *   mtu?: number (default 1420)
 *   persistentKeepalive?: number (default 25)
 *   isActive?: boolean (default true)
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
    const validated = createServerSchema.parse(body);

    // Create server
    const server = await serverService.createServer(validated);

    return createSuccessResponse(server, 201);
  } catch (error) {
    return createErrorResponse(error);
  }
}
