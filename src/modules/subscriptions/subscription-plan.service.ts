/**
 * Subscription Plan Service
 * Manages subscription plans (tariffs)
 *
 * Responsibilities:
 * - CRUD operations for subscription plans
 * - Plan localization
 * - Plan statistics
 * - Plan validation
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/errors';
import type { SubscriptionPlan } from '@prisma/client';
import type {
  CreatePlanInput,
  UpdatePlanInput,
  PlanWithLocale,
  PlanStats,
} from './subscriptions.types';

export class SubscriptionPlanService {
  /**
   * Get all active plans
   */
  async getActivePlans(): Promise<SubscriptionPlan[]> {
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        isCustom: false, // Exclude custom plans from public listing
      },
      orderBy: {
        price: 'asc',
      },
    });

    logger.debug('Active plans retrieved', { count: plans.length });
    return plans;
  }

  /**
   * Get all plans (admin)
   */
  async getAllPlans(filters?: {
    isActive?: boolean;
    isCustom?: boolean;
  }): Promise<SubscriptionPlan[]> {
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.isCustom !== undefined && { isCustom: filters.isCustom }),
      },
      orderBy: [{ isCustom: 'asc' }, { price: 'asc' }],
    });

    logger.debug('All plans retrieved', {
      count: plans.length,
      filters,
    });

    return plans;
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan> {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundError('Subscription Plan', planId);
    }

    return plan;
  }

  /**
   * Get plan with localization
   */
  async getPlanWithLocale(
    planId: string,
    locale: 'ru' | 'en' = 'ru'
  ): Promise<PlanWithLocale> {
    const plan = await this.getPlanById(planId);

    return {
      ...plan,
      localizedName: locale === 'en' && plan.nameEn ? plan.nameEn : plan.name,
      localizedDescription:
        locale === 'en' && plan.descriptionEn
          ? plan.descriptionEn
          : plan.description || '',
    };
  }

  /**
   * Get all plans with localization
   */
  async getActivePlansWithLocale(
    locale: 'ru' | 'en' = 'ru'
  ): Promise<PlanWithLocale[]> {
    const plans = await this.getActivePlans();

    return plans.map((plan) => ({
      ...plan,
      localizedName: locale === 'en' && plan.nameEn ? plan.nameEn : plan.name,
      localizedDescription:
        locale === 'en' && plan.descriptionEn
          ? plan.descriptionEn
          : plan.description || '',
    }));
  }

  /**
   * Create new plan (admin)
   */
  async createPlan(input: CreatePlanInput): Promise<SubscriptionPlan> {
    // Validate price
    if (input.price <= 0) {
      throw new ValidationError('Price must be positive');
    }

    // Validate duration
    if (input.durationDays <= 0 || input.durationDays > 365) {
      throw new ValidationError('Duration must be between 1 and 365 days');
    }

    // Validate max configs
    if (input.maxConfigs <= 0 || input.maxConfigs > 10) {
      throw new ValidationError('Max configs must be between 1 and 10');
    }

    // Check for duplicate name
    const existing = await prisma.subscriptionPlan.findFirst({
      where: {
        name: input.name,
      },
    });

    if (existing) {
      throw new ConflictError(
        `Plan with name "${input.name}" already exists`
      );
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: input.name,
        nameEn: input.nameEn,
        description: input.description,
        descriptionEn: input.descriptionEn,
        maxConfigs: input.maxConfigs,
        durationDays: input.durationDays,
        price: input.price,
        isCustom: input.isCustom ?? false,
        isActive: input.isActive ?? true,
      },
    });

    logger.info('Subscription plan created', {
      planId: plan.id,
      name: plan.name,
      price: plan.price.toString(),
    });

    return plan;
  }

  /**
   * Update plan (admin)
   */
  async updatePlan(input: UpdatePlanInput): Promise<SubscriptionPlan> {
    const { planId, ...updates } = input;

    // Verify plan exists
    await this.getPlanById(planId);

    // Validate updates
    if (updates.price !== undefined && updates.price <= 0) {
      throw new ValidationError('Price must be positive');
    }

    if (
      updates.durationDays !== undefined &&
      (updates.durationDays <= 0 || updates.durationDays > 365)
    ) {
      throw new ValidationError('Duration must be between 1 and 365 days');
    }

    if (
      updates.maxConfigs !== undefined &&
      (updates.maxConfigs <= 0 || updates.maxConfigs > 10)
    ) {
      throw new ValidationError('Max configs must be between 1 and 10');
    }

    const plan = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: updates,
    });

    logger.info('Subscription plan updated', {
      planId: plan.id,
      updates: Object.keys(updates),
    });

    return plan;
  }

  /**
   * Delete plan (admin)
   * Soft delete - mark as inactive
   */
  async deletePlan(planId: string): Promise<void> {
    // Verify plan exists
    await this.getPlanById(planId);

    // Check if plan has active subscriptions
    const activeSubscriptions = await prisma.subscription.count({
      where: {
        planId,
        status: 'active',
      },
    });

    if (activeSubscriptions > 0) {
      throw new ConflictError(
        `Cannot delete plan with ${activeSubscriptions} active subscriptions`
      );
    }

    // Soft delete - mark as inactive
    await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { isActive: false },
    });

    logger.info('Subscription plan deleted (soft)', { planId });
  }

  /**
   * Get plan statistics (admin)
   */
  async getPlanStats(planId: string): Promise<PlanStats> {
    const plan = await this.getPlanById(planId);

    const [activeSubscriptions, totalSubscriptions, payments] =
      await Promise.all([
        // Active subscriptions count
        prisma.subscription.count({
          where: { planId, status: 'active' },
        }),

        // Total subscriptions ever created
        prisma.subscription.findMany({
          where: { planId },
          select: {
            createdAt: true,
            endDate: true,
            startDate: true,
          },
        }),

        // Total revenue from this plan
        prisma.payment.aggregate({
          where: {
            planId,
            status: 'completed',
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

    // Calculate average lifetime
    const completedSubscriptions = totalSubscriptions.filter(
      (sub) => new Date(sub.endDate) < new Date()
    );

    const averageLifetimeDays =
      completedSubscriptions.length > 0
        ? completedSubscriptions.reduce((sum, sub) => {
            const lifetime = Math.floor(
              (new Date(sub.endDate).getTime() -
                new Date(sub.startDate).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return sum + lifetime;
          }, 0) / completedSubscriptions.length
        : 0;

    return {
      planId: plan.id,
      planName: plan.name,
      activeSubscriptions,
      totalRevenue: Number(payments._sum.amount || 0),
      averageLifetimeDays: Math.round(averageLifetimeDays),
    };
  }

  /**
   * Get all plan statistics (admin)
   */
  async getAllPlanStats(): Promise<PlanStats[]> {
    const plans = await this.getAllPlans();

    const stats = await Promise.all(
      plans.map((plan) => this.getPlanStats(plan.id))
    );

    return stats;
  }

  /**
   * Validate plan is available for purchase
   */
  async validatePlanAvailable(planId: string): Promise<void> {
    const plan = await this.getPlanById(planId);

    if (!plan.isActive) {
      throw new ValidationError('This plan is no longer available');
    }

    if (plan.isCustom) {
      throw new ValidationError('Custom plans cannot be purchased directly');
    }
  }
}

export const subscriptionPlanService = new SubscriptionPlanService();
