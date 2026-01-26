/**
 * POST /api/subscriptions/:subscriptionId/cancel
 * Cancel subscription
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
  cancelSubscriptionSchema,
  type CancelSubscriptionInput,
} from '@/modules/subscriptions/subscriptions.validation';
import { ValidationError } from '@/lib/errors';
import type { AuthUser } from '@/types';

export const POST = apiHandler(
  withAuth(async (request: NextRequest, user: AuthUser) => {
    validateMethod(request, ['POST']);

    // Extract subscriptionId from URL
    const parts = request.url.split('/');
    const subscriptionId = parts[parts.length - 2] || '';
    if (!subscriptionId) {
      throw new ValidationError('Subscription ID is required');
    }

    const body = await parseRequestBody<CancelSubscriptionInput>(request);
    const validated = cancelSubscriptionSchema.parse({
      ...body,
      subscriptionId,
    });

    const subscription = await subscriptionService.cancelSubscription(
      validated.subscriptionId,
      user.id,
      validated.reason
    );

    return createSuccessResponse({ subscription });
  })
);
