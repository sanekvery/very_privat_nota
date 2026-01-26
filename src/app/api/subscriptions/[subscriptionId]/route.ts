/**
 * GET    /api/subscriptions/:subscriptionId - Get subscription details
 * PATCH  /api/subscriptions/:subscriptionId - Update subscription
 * DELETE /api/subscriptions/:subscriptionId - Delete subscription (admin)
 */

import { NextRequest } from 'next/server';
import {
  apiHandler,
  createSuccessResponse,
  parseRequestBody,
  validateMethod,
} from '@/lib/api-response';
import { withAuth, requireAdmin } from '@/lib/auth-middleware';
import { subscriptionService } from '@/modules/subscriptions/subscription.service';
import {
  updateSubscriptionStatusSchema,
  type UpdateSubscriptionStatusInput,
} from '@/modules/subscriptions/subscriptions.validation';
import { ValidationError } from '@/lib/errors';
import type { AuthUser } from '@/types';

export const GET = apiHandler(
  withAuth(async (request: NextRequest, user: AuthUser) => {
    validateMethod(request, ['GET']);

    // Extract subscriptionId from URL
    const subscriptionId = request.url.split('/').pop() || '';
    if (!subscriptionId) {
      throw new ValidationError('Subscription ID is required');
    }

    const subscription = await subscriptionService.getSubscriptionById(
      subscriptionId
    );

    // Verify ownership (unless admin)
    if (!user.isAdmin && subscription.userId !== user.id) {
      throw new ValidationError('Subscription does not belong to user');
    }

    return createSuccessResponse({ subscription });
  })
);

export const PATCH = apiHandler(
  withAuth(async (request: NextRequest, user: AuthUser) => {
    validateMethod(request, ['PATCH']);

    const subscriptionId = request.url.split('/').pop()?.split('?')[0] || '';
    if (!subscriptionId) {
      throw new ValidationError('Subscription ID is required');
    }

    const body = await parseRequestBody<UpdateSubscriptionStatusInput>(request);
    const validated = updateSubscriptionStatusSchema.parse({
      ...body,
      subscriptionId,
    });

    // Verify ownership (only owner or admin can update)
    const subscription = await subscriptionService.getSubscriptionById(
      subscriptionId
    );

    if (!user.isAdmin && subscription.userId !== user.id) {
      throw new ValidationError('Subscription does not belong to user');
    }

    const updated = await subscriptionService.updateSubscriptionStatus(
      validated
    );

    return createSuccessResponse({ subscription: updated });
  })
);

export const DELETE = apiHandler(async (request: NextRequest) => {
  validateMethod(request, ['DELETE']);

  // Only admin can delete
  await requireAdmin(request);

  const subscriptionId = request.url.split('/').pop()?.split('?')[0] || '';
  if (!subscriptionId) {
    throw new ValidationError('Subscription ID is required');
  }

  await subscriptionService.deleteSubscription(subscriptionId);

  return createSuccessResponse({ success: true });
});
