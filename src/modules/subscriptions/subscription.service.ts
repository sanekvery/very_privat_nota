/**
 * Subscription Service
 * Manages user subscriptions
 *
 * Responsibilities:
 * - Create/activate subscriptions
 * - Extend/renew subscriptions
 * - Cancel subscriptions
 * - Check subscription validity
 * - Automatic expiration handling
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/lib/errors';
import { subscriptionPlanService } from './subscription-plan.service';
import type { Subscription, SubscriptionStatus } from '@prisma/client';
import type {
  CreateSubscriptionInput,
  UpdateSubscriptionStatusInput,
  ExtendSubscriptionInput,
  SubscriptionWithRelations,
  UserSubscriptionSummary,
  SubscriptionCheckResult,
  SubscriptionStats,
} from './subscriptions.types';

export class SubscriptionService {
  /**
   * Create new subscription
   * Usually called after successful payment
   */
  async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<Subscription> {
    const { userId, planId, startDate, paymentId } = input;

    // Validate plan exists and is available
    const plan = await subscriptionPlanService.getPlanById(planId);

    if (!plan.isActive) {
      throw new ValidationError('Selected plan is not available');
    }

    // Check if user already has active subscription
    const existingActive = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
    });

    if (existingActive) {
      throw new ConflictError(
        'User already has an active subscription. Cancel or wait for expiration before creating new one.'
      );
    }

    // Calculate dates
    const start = startDate || new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + plan.durationDays);

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        status: 'active',
        startDate: start,
        endDate: end,
      },
    });

    logger.info('Subscription created', {
      subscriptionId: subscription.id,
      userId,
      planId,
      endDate: end,
      paymentId,
    });

    return subscription;
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(
    subscriptionId: string
  ): Promise<SubscriptionWithRelations> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
        user: true,
      },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription', subscriptionId);
    }

    return subscription;
  }

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(
    userId: string,
    status?: SubscriptionStatus
  ): Promise<SubscriptionWithRelations[]> {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return subscriptions;
  }

  /**
   * Get user's active subscription
   */
  async getUserActiveSubscription(
    userId: string
  ): Promise<SubscriptionWithRelations | null> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
      include: {
        plan: true,
      },
    });

    return subscription;
  }

  /**
   * Get user subscription summary
   */
  async getUserSubscriptionSummary(
    userId: string
  ): Promise<UserSubscriptionSummary> {
    const activeSubscription = await this.getUserActiveSubscription(userId);

    // Total subscriptions count
    const totalSubscriptions = await prisma.subscription.count({
      where: { userId },
    });

    // Total spent (from payments)
    const paymentsSum = await prisma.payment.aggregate({
      where: {
        userId,
        status: 'completed',
      },
      _sum: {
        amount: true,
      },
    });

    const totalSpent = Number(paymentsSum._sum.amount || 0);

    // Calculate expiring in days
    let expiringInDays: number | undefined;
    if (activeSubscription) {
      const now = new Date();
      const endDate = new Date(activeSubscription.endDate);
      expiringInDays = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    return {
      hasActiveSubscription: !!activeSubscription,
      activeSubscription: activeSubscription || undefined,
      expiringInDays,
      totalSubscriptions,
      totalSpent,
    };
  }

  /**
   * Check if subscription is valid
   */
  async checkSubscriptionValidity(
    subscriptionId: string
  ): Promise<SubscriptionCheckResult> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return {
        isValid: false,
        reason: 'Subscription not found',
      };
    }

    if (subscription.status === 'cancelled') {
      return {
        isValid: false,
        subscription,
        reason: 'Subscription cancelled',
      };
    }

    if (subscription.status === 'expired') {
      return {
        isValid: false,
        subscription,
        reason: 'Subscription expired',
      };
    }

    // Check if end date passed
    const now = new Date();
    const endDate = new Date(subscription.endDate);

    if (endDate < now) {
      // Auto-expire
      await this.updateSubscriptionStatus({
        subscriptionId,
        status: 'expired',
      });

      return {
        isValid: false,
        subscription,
        reason: 'Subscription expired',
      };
    }

    return {
      isValid: true,
      subscription,
    };
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    input: UpdateSubscriptionStatusInput
  ): Promise<Subscription> {
    const { subscriptionId, status, cancelReason } = input;

    // Verify subscription exists
    const existing = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!existing) {
      throw new NotFoundError('Subscription', subscriptionId);
    }

    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status,
        ...(status === 'cancelled' && {
          cancelledAt: new Date(),
        }),
      },
    });

    logger.info('Subscription status updated', {
      subscriptionId,
      oldStatus: existing.status,
      newStatus: status,
      cancelReason,
    });

    return subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    userId: string,
    reason?: string
  ): Promise<Subscription> {
    // Verify subscription exists and belongs to user
    const subscription = await this.getSubscriptionById(subscriptionId);

    if (subscription.userId !== userId) {
      throw new ValidationError('Subscription does not belong to user');
    }

    if (subscription.status === 'cancelled') {
      throw new ConflictError('Subscription is already cancelled');
    }

    if (subscription.status === 'expired') {
      throw new ConflictError('Cannot cancel expired subscription');
    }

    const updated = await this.updateSubscriptionStatus({
      subscriptionId,
      status: 'cancelled',
      cancelReason: reason,
    });

    logger.info('Subscription cancelled by user', {
      subscriptionId,
      userId,
      reason,
    });

    return updated;
  }

  /**
   * Extend subscription
   * Add additional days to subscription
   */
  async extendSubscription(
    input: ExtendSubscriptionInput
  ): Promise<Subscription> {
    const { subscriptionId, additionalDays, paymentId } = input;

    // Verify subscription exists
    const existing = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!existing) {
      throw new NotFoundError('Subscription', subscriptionId);
    }

    if (existing.status === 'cancelled') {
      throw new ConflictError('Cannot extend cancelled subscription');
    }

    // Calculate new end date
    const currentEndDate = new Date(existing.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);

    // Update subscription
    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        endDate: newEndDate,
        status: 'active', // Reactivate if expired
      },
    });

    logger.info('Subscription extended', {
      subscriptionId,
      additionalDays,
      oldEndDate: currentEndDate,
      newEndDate,
      paymentId,
    });

    return subscription;
  }

  /**
   * Renew subscription
   * Create new subscription based on expired one
   */
  async renewSubscription(
    oldSubscriptionId: string,
    userId: string,
    paymentId?: string
  ): Promise<Subscription> {
    // Get old subscription
    const oldSub = await this.getSubscriptionById(oldSubscriptionId);

    if (oldSub.userId !== userId) {
      throw new ValidationError('Subscription does not belong to user');
    }

    // Create new subscription with same plan
    const newSub = await this.createSubscription({
      userId,
      planId: oldSub.planId,
      paymentId,
    });

    logger.info('Subscription renewed', {
      oldSubscriptionId,
      newSubscriptionId: newSub.id,
      userId,
      paymentId,
    });

    return newSub;
  }

  /**
   * Expire subscriptions automatically
   * Should be called by cron job
   */
  async expireOldSubscriptions(): Promise<number> {
    const now = new Date();

    const result = await prisma.subscription.updateMany({
      where: {
        status: 'active',
        endDate: {
          lt: now,
        },
      },
      data: {
        status: 'expired',
      },
    });

    if (result.count > 0) {
      logger.info('Subscriptions auto-expired', { count: result.count });
    }

    return result.count;
  }

  /**
   * Get expiring subscriptions
   * For sending notifications
   */
  async getExpiringSubscriptions(daysBeforeExpiry: number): Promise<
    SubscriptionWithRelations[]
  > {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysBeforeExpiry);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        endDate: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        plan: true,
        user: true,
      },
    });

    return subscriptions;
  }

  /**
   * Get subscription statistics (admin)
   */
  async getSubscriptionStats(): Promise<SubscriptionStats> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalActive,
      totalExpired,
      totalCancelled,
      totalPending,
      revenueThisMonth,
      newSubscriptionsThisMonth,
    ] = await Promise.all([
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({ where: { status: 'expired' } }),
      prisma.subscription.count({ where: { status: 'cancelled' } }),
      prisma.subscription.count({ where: { status: 'pending' } }),

      // Revenue this month
      prisma.payment
        .aggregate({
          where: {
            status: 'completed',
            createdAt: { gte: monthStart },
          },
          _sum: { amount: true },
        })
        .then((res) => Number(res._sum.amount || 0)),

      // New subscriptions this month
      prisma.subscription.count({
        where: {
          createdAt: { gte: monthStart },
        },
      }),
    ]);

    return {
      totalActive,
      totalExpired,
      totalCancelled,
      totalPending,
      revenueThisMonth,
      newSubscriptionsThisMonth,
    };
  }

  /**
   * Delete subscription (admin only)
   * Hard delete - use with caution!
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    // Check if subscription has VPN configs
    const vpnConfigs = await prisma.vpnConfig.count({
      where: { subscriptionId },
    });

    if (vpnConfigs > 0) {
      throw new ConflictError(
        `Cannot delete subscription with ${vpnConfigs} VPN configs. Delete configs first.`
      );
    }

    await prisma.subscription.delete({
      where: { id: subscriptionId },
    });

    logger.warn('Subscription hard deleted', { subscriptionId });
  }
}

export const subscriptionService = new SubscriptionService();
