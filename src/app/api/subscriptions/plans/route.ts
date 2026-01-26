/**
 * GET /api/subscriptions/plans
 * Get all active subscription plans
 */

import { NextRequest } from 'next/server';
import {
  apiHandler,
  createSuccessResponse,
  validateMethod,
} from '@/lib/api-response';
import { subscriptionPlanService } from '@/modules/subscriptions/subscription-plan.service';

export const GET = apiHandler(async (request: NextRequest) => {
  validateMethod(request, ['GET']);

  // Get locale from query params or header
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get('locale') || 'ru') as 'ru' | 'en';

  const plans = await subscriptionPlanService.getActivePlansWithLocale(locale);

  return createSuccessResponse({ plans, count: plans.length });
});
