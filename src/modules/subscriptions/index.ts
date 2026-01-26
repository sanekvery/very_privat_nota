/**
 * Subscriptions Module
 * Exports for subscription management
 */

// Services
export { subscriptionService } from './subscription.service';
export { subscriptionPlanService } from './subscription-plan.service';

// Types
export type {
  SubscriptionStatus,
  PlanWithLocale,
  SubscriptionWithRelations,
  CreateSubscriptionInput,
  UpdateSubscriptionStatusInput,
  ExtendSubscriptionInput,
  SubscriptionStats,
  PlanStats,
  UserSubscriptionSummary,
  SubscriptionCheckResult,
  CreatePlanInput,
  UpdatePlanInput,
} from './subscriptions.types';

// Validation
export {
  subscriptionStatusSchema,
  createSubscriptionSchema,
  updateSubscriptionStatusSchema,
  extendSubscriptionSchema,
  cancelSubscriptionSchema,
  getSubscriptionSchema,
  getUserSubscriptionsSchema,
  createPlanSchema,
  updatePlanSchema,
  getPlanSchema,
  listPlansSchema,
} from './subscriptions.validation';
