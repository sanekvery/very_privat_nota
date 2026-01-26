/**
 * Promo Code Service
 * Manages promotional codes for free/discounted subscriptions
 *
 * Responsibilities:
 * - Create/update/delete promo codes
 * - Validate promo codes
 * - Activate promo codes (create subscription)
 * - Track usage statistics
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/lib/errors';
import { subscriptionPlanService } from '@/modules/subscriptions/subscription-plan.service';
import type { PromoCode } from '@prisma/client';
import type {
  CreatePromoCodeInput,
  PromoCodeValidation,
  PromoCodeWithRelations,
} from './payments.types';

export class PromoCodeService {
  /**
   * Create new promo code (admin)
   */
  async createPromoCode(input: CreatePromoCodeInput): Promise<PromoCode> {
    const { code, planId, durationDays, maxUses, expiresAt, createdBy } = input;

    // Validate plan exists
    await subscriptionPlanService.getPlanById(planId);

    // Check if code already exists
    const existing = await prisma.promoCode.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictError(`Promo code "${code}" already exists`);
    }

    // Validate duration
    if (durationDays <= 0 || durationDays > 365) {
      throw new ValidationError('Duration must be between 1 and 365 days');
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        planId,
        durationDays,
        maxUses,
        expiresAt,
        createdBy,
        isActive: true,
        usedCount: 0,
      },
    });

    logger.info('Promo code created', {
      code: promoCode.code,
      planId,
      maxUses,
      createdBy,
    });

    return promoCode;
  }

  /**
   * Get promo code by code
   */
  async getPromoCodeByCode(code: string): Promise<PromoCodeWithRelations> {
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        activations: {
          orderBy: {
            activatedAt: 'desc',
          },
          take: 10, // Last 10 activations
        },
      },
    });

    if (!promoCode) {
      throw new NotFoundError('Promo code', code);
    }

    return promoCode;
  }

  /**
   * Get promo code by ID
   */
  async getPromoCodeById(promoCodeId: string): Promise<PromoCode> {
    const promoCode = await prisma.promoCode.findUnique({
      where: { id: promoCodeId },
    });

    if (!promoCode) {
      throw new NotFoundError('Promo code', promoCodeId);
    }

    return promoCode;
  }

  /**
   * Get all promo codes (admin)
   */
  async getAllPromoCodes(filters?: {
    isActive?: boolean;
    planId?: string;
  }): Promise<PromoCodeWithRelations[]> {
    const promoCodes = await prisma.promoCode.findMany({
      where: {
        ...(filters?.isActive !== undefined && {
          isActive: filters.isActive,
        }),
        ...(filters?.planId && { planId: filters.planId }),
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        activations: {
          select: {
            id: true,
            userId: true,
            activatedAt: true,
          },
          orderBy: {
            activatedAt: 'desc',
          },
          take: 5,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return promoCodes;
  }

  /**
   * Validate promo code
   * Check if code can be used
   */
  async validatePromoCode(
    code: string,
    userId?: string
  ): Promise<PromoCodeValidation> {
    let promoCode: PromoCode;

    try {
      promoCode = await this.getPromoCodeByCode(code);
    } catch (error) {
      return {
        isValid: false,
        reason: 'Promo code not found',
      };
    }

    // Check if active
    if (!promoCode.isActive) {
      return {
        isValid: false,
        promoCode,
        reason: 'Promo code is inactive',
      };
    }

    // Check expiration
    if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
      return {
        isValid: false,
        promoCode,
        reason: 'Promo code has expired',
      };
    }

    // Check max uses
    if (
      promoCode.maxUses &&
      promoCode.usedCount >= promoCode.maxUses
    ) {
      return {
        isValid: false,
        promoCode,
        reason: 'Promo code usage limit reached',
      };
    }

    // Check if user already used this promo code
    if (userId) {
      const previousActivation = await prisma.promoActivation.findFirst({
        where: {
          promoCodeId: promoCode.id,
          userId,
        },
      });

      if (previousActivation) {
        return {
          isValid: false,
          promoCode,
          reason: 'You have already used this promo code',
        };
      }
    }

    return {
      isValid: true,
      promoCode,
    };
  }

  /**
   * Activate promo code
   * Creates subscription for user
   */
  async activatePromoCode(
    code: string,
    userId: string
  ): Promise<{ promoCode: PromoCode; subscriptionId: string }> {
    // Validate promo code
    const validation = await this.validatePromoCode(code, userId);

    if (!validation.isValid || !validation.promoCode) {
      throw new ValidationError(
        validation.reason || 'Invalid promo code'
      );
    }

    const promoCode = validation.promoCode;

    // Transaction: increment usage + create activation record
    await prisma.$transaction(async (tx) => {
      // Increment used count
      await tx.promoCode.update({
        where: { id: promoCode.id },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      });

      // Create activation record
      await tx.promoActivation.create({
        data: {
          promoCodeId: promoCode.id,
          userId,
        },
      });
    });

    // Create subscription
    const { subscriptionService } = await import(
      '@/modules/subscriptions/subscription.service'
    );

    // Calculate dates
    const startDate = new Date();
    const subscription = await subscriptionService.createSubscription({
      userId,
      planId: promoCode.planId,
      startDate,
    });

    logger.info('Promo code activated', {
      code: promoCode.code,
      userId,
      subscriptionId: subscription.id,
    });

    return {
      promoCode,
      subscriptionId: subscription.id,
    };
  }

  /**
   * Update promo code (admin)
   */
  async updatePromoCode(
    promoCodeId: string,
    updates: {
      maxUses?: number;
      isActive?: boolean;
      expiresAt?: Date;
    }
  ): Promise<PromoCode> {
    // Verify exists
    await this.getPromoCodeById(promoCodeId);

    const promoCode = await prisma.promoCode.update({
      where: { id: promoCodeId },
      data: updates,
    });

    logger.info('Promo code updated', {
      promoCodeId,
      updates: Object.keys(updates),
    });

    return promoCode;
  }

  /**
   * Delete promo code (admin)
   * Soft delete - mark as inactive
   */
  async deletePromoCode(promoCodeId: string): Promise<void> {
    // Verify exists
    await this.getPromoCodeById(promoCodeId);

    await prisma.promoCode.update({
      where: { id: promoCodeId },
      data: { isActive: false },
    });

    logger.info('Promo code deleted (soft)', { promoCodeId });
  }

  /**
   * Get promo code statistics (admin)
   */
  async getPromoCodeStats(promoCodeId: string) {
    const promoCode = await this.getPromoCodeById(promoCodeId);

    const activations = await prisma.promoActivation.count({
      where: { promoCodeId },
    });

    const remainingUses = promoCode.maxUses
      ? promoCode.maxUses - promoCode.usedCount
      : null;

    const isExpired = promoCode.expiresAt
      ? new Date(promoCode.expiresAt) < new Date()
      : false;

    return {
      code: promoCode.code,
      totalActivations: activations,
      usedCount: promoCode.usedCount,
      maxUses: promoCode.maxUses,
      remainingUses,
      isActive: promoCode.isActive,
      isExpired,
      expiresAt: promoCode.expiresAt,
    };
  }

  /**
   * Get user's activated promo codes
   */
  async getUserPromoActivations(userId: string) {
    const activations = await prisma.promoActivation.findMany({
      where: { userId },
      include: {
        promoCode: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: {
        activatedAt: 'desc',
      },
    });

    return activations;
  }
}

export const promoCodeService = new PromoCodeService();
