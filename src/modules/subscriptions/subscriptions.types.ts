/**
 * Subscriptions Module Types
 * Domain types for subscription plans and user subscriptions
 */

import type { SubscriptionPlan, Subscription, User } from '@prisma/client';

// Subscription status from Prisma enum
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

// Subscription plan with localization
export interface PlanWithLocale extends SubscriptionPlan {
  localizedName: string;
  localizedDescription: string;
}

// Subscription with relations
export interface SubscriptionWithRelations extends Subscription {
  plan: SubscriptionPlan;
  user?: User;
}

// Create subscription input
export interface CreateSubscriptionInput {
  userId: string;
  planId: string;
  startDate?: Date; // Default: now
  paymentId?: string; // Reference to payment if applicable
}

// Update subscription status
export interface UpdateSubscriptionStatusInput {
  subscriptionId: string;
  status: SubscriptionStatus;
  cancelReason?: string;
}

// Extend subscription (renew)
export interface ExtendSubscriptionInput {
  subscriptionId: string;
  additionalDays: number;
  paymentId?: string;
}

// Subscription stats
export interface SubscriptionStats {
  totalActive: number;
  totalExpired: number;
  totalCancelled: number;
  totalPending: number;
  revenueThisMonth: number;
  newSubscriptionsThisMonth: number;
}

// Plan stats
export interface PlanStats {
  planId: string;
  planName: string;
  activeSubscriptions: number;
  totalRevenue: number;
  averageLifetimeDays: number;
}

// User subscription summary
export interface UserSubscriptionSummary {
  hasActiveSubscription: boolean;
  activeSubscription?: SubscriptionWithRelations;
  expiringInDays?: number;
  totalSubscriptions: number;
  totalSpent: number;
}

// Subscription check result
export interface SubscriptionCheckResult {
  isValid: boolean;
  subscription?: Subscription;
  reason?: string; // Why invalid (expired, cancelled, not found)
}

// Create plan input (admin)
export interface CreatePlanInput {
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  maxConfigs: number;
  durationDays: number;
  price: number;
  isCustom?: boolean;
  isActive?: boolean;
}

// Update plan input (admin)
export interface UpdatePlanInput {
  planId: string;
  name?: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  maxConfigs?: number;
  durationDays?: number;
  price?: number;
  isActive?: boolean;
}
