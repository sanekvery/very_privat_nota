/**
 * GET /api/subscriptions/summary
 * Get user's subscription summary
 */

import { NextRequest } from 'next/server';
import {
  apiHandler,
  createSuccessResponse,
  validateMethod,
} from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { subscriptionService } from '@/modules/subscriptions/subscription.service';
import type { AuthUser } from '@/types';

export const GET = apiHandler(
  withAuth(async (request: NextRequest, user: AuthUser) => {
    validateMethod(request, ['GET']);

    const summary = await subscriptionService.getUserSubscriptionSummary(
      user.id
    );

    return createSuccessResponse({ summary });
  })
);
