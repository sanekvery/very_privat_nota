/**
 * GET    /api/vpn/:configId - Get VPN config
 * DELETE /api/vpn/:configId - Delete VPN config
 */

import { NextRequest } from 'next/server';
import {
  apiHandler,
  createSuccessResponse,
  validateMethod,
} from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { vpnService } from '@/modules/vpn/vpn.service';
import type { AuthUser } from '@/types';
import { ValidationError } from '@/lib/errors';

export const GET = apiHandler(
  withAuth(async (request: NextRequest, user: AuthUser) => {
    validateMethod(request, ['GET']);

    // Extract configId from URL path
    const configId = request.url.split('/').pop() || '';
    if (!configId) {
      throw new ValidationError('Config ID is required');
    }

    const config = await vpnService.getConfig(configId, user.id);

    return createSuccessResponse({ config });
  })
);

export const DELETE = apiHandler(
  withAuth(async (request: NextRequest) => {
    validateMethod(request, ['DELETE']);

    // Extract configId from URL path
    const configId = request.url.split('/').pop()?.split('?')[0] || '';
    if (!configId) {
      throw new ValidationError('Config ID is required');
    }

    // Extract subscriptionId from query
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      throw new ValidationError('subscriptionId query parameter is required');
    }

    await vpnService.deleteConfig(subscriptionId, configId);

    return createSuccessResponse({ success: true });
  })
);
