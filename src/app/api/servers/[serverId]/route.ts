/**
 * Server Details API
 * GET /api/servers/:serverId - Get server details
 * PATCH /api/servers/:serverId - Update server (admin)
 * DELETE /api/servers/:serverId - Delete server (admin)
 */

import { NextRequest } from 'next/server';
import { serverService } from '@/modules/servers/server.service';
import {
  getServerSchema,
  updateServerSchema,
} from '@/modules/servers/servers.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/servers/:serverId
 * Get server details with statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    // Require authentication
    await requireAuth(request);

    // Validate
    const validated = getServerSchema.parse({
      serverId: params.serverId,
    });

    // Get server with stats
    const server = await serverService.getServerWithStats(validated.serverId);

    return createSuccessResponse(server);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PATCH /api/servers/:serverId
 * Update server (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse body
    const body = await request.json();

    // Validate
    const validated = updateServerSchema.parse({
      serverId: params.serverId,
      ...body,
    });

    // Update server
    const server = await serverService.updateServer(validated);

    return createSuccessResponse(server);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/servers/:serverId
 * Delete server (admin only)
 * Soft delete - marks as inactive
 */
export async function DELETE(
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
    const validated = getServerSchema.parse({
      serverId: params.serverId,
    });

    // Delete server
    await serverService.deleteServer(validated.serverId);

    return createSuccessResponse({ message: 'Server deleted successfully' });
  } catch (error) {
    return createErrorResponse(error);
  }
}
