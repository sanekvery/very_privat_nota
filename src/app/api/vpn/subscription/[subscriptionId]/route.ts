/**
 * GET /api/vpn/subscription/:subscriptionId
 * Get all VPN configs for subscription
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

    // Extract subscriptionId from URL path
    const subscriptionId = request.url.split('/').pop() || '';
    if (!subscriptionId) {
      throw new ValidationError('Subscription ID is required');
    }

    const configs = await vpnService.getSubscriptionConfigs(
      subscriptionId,
      user.id
    );

    return createSuccessResponse({ configs, count: configs.length });
  })
);
