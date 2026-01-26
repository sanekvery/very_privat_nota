/**
 * POST /api/subscriptions/:subscriptionId/extend
 * Extend subscription (add days)
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
  extendSubscriptionSchema,
  type ExtendSubscriptionInput,
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

    const body = await parseRequestBody<ExtendSubscriptionInput>(request);
    const validated = extendSubscriptionSchema.parse({
      ...body,
      subscriptionId,
    });

    // Verify ownership
    const existing = await subscriptionService.getSubscriptionById(
      subscriptionId
    );
    if (!user.isAdmin && existing.userId !== user.id) {
      throw new ValidationError('Subscription does not belong to user');
    }

    const subscription = await subscriptionService.extendSubscription(
      validated
    );

    return createSuccessResponse({ subscription });
  })
);
