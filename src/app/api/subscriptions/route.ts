/**
 * GET    /api/subscriptions - Get user's subscriptions
 * POST   /api/subscriptions - Create new subscription
 */

import { NextRequest } from 'next/server';
import {
  apiHandler,
  createSuccessResponse,
  parseRequestBody,
  validateMethod,
} from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { subscriptionService } from '@/modules/subscriptions/subscription.service';
import {
  createSubscriptionSchema,
  type CreateSubscriptionInput,
} from '@/modules/subscriptions/subscriptions.validation';
import type { AuthUser } from '@/types';

export const GET = apiHandler(
  withAuth(async (request: NextRequest, user: AuthUser) => {
    validateMethod(request, ['GET']);

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as
      | 'active'
      | 'expired'
      | 'cancelled'
      | 'pending'
      | null;

    const subscriptions = await subscriptionService.getUserSubscriptions(
      user.id,
      status || undefined
    );

    return createSuccessResponse({
      subscriptions,
      count: subscriptions.length,
    });
  })
);

export const POST = apiHandler(
  withAuth(async (request: NextRequest, user: AuthUser) => {
    validateMethod(request, ['POST']);

    const body = await parseRequestBody<CreateSubscriptionInput>(request);
    const validated = createSubscriptionSchema.parse(body);

    // Ensure userId matches authenticated user (security)
    if (validated.userId !== user.id) {
      throw new Error('Cannot create subscription for another user');
    }

    const subscription = await subscriptionService.createSubscription(
      validated
    );

    return createSuccessResponse({ subscription });
  })
);
