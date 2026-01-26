/**
 * Promo Service
 * Business logic for promo codes management
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type {
  PromoCodeWithRelations,
  PromoActivationWithRelations,
  CreatePromoCodeInput,
  UpdatePromoCodeInput,
  ActivatePromoCodeInput,
  PromoCodeListQuery,
  PaginatedPromoCodesResponse,
  PromoCodeStatistics,
  PromoCodeValidationResult,
} from './promo.types';

class PromoService {
  /**
   * Create promo code (admin only)
   */
  async createPromoCode(input: CreatePromoCodeInput): Promise<PromoCodeWithRelations> {
    try {
      // Check if code already exists
      const existing = await prisma.promoCode.findUnique({
        where: { code: input.code },
      });

      if (existing) {
        throw new ValidationError('Promo code already exists');
      }

      // Check if plan exists
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: input.planId },
      });

      if (!plan) {
        throw new NotFoundError('Subscription plan not found');
      }

      // Create promo code
      const promoCode = await prisma.promoCode.create({
        data: {
          code: input.code,
          planId: input.planId,
          durationDays: input.durationDays,
          maxUses: input.maxUses,
          expiresAt: input.expiresAt,
          createdBy: input.createdBy,
          isActive: true,
        },
        include: {
          plan: true,
        },
      });

      logger.info('Promo code created', {
        promoCodeId: promoCode.id,
        code: promoCode.code,
        planId: promoCode.planId,
        createdBy: input.createdBy,
      });

      return promoCode;
    } catch (error) {
      logger.error('Failed to create promo code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        input,
      });
      throw error;
    }
  }

  /**
   * Update promo code (admin only)
   */
  async updatePromoCode(
    promoCodeId: string,
    input: UpdatePromoCodeInput
  ): Promise<PromoCodeWithRelations> {
    try {
      // Check if promo code exists
      const existing = await prisma.promoCode.findUnique({
        where: { id: promoCodeId },
      });

      if (!existing) {
        throw new NotFoundError('Promo code not found');
      }

      // If updating code, check uniqueness
      if (input.code && input.code !== existing.code) {
        const duplicate = await prisma.promoCode.findUnique({
          where: { code: input.code },
        });

        if (duplicate) {
          throw new ValidationError('Promo code already exists');
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (input.code !== undefined) updateData.code = input.code;
      if (input.durationDays !== undefined) updateData.durationDays = input.durationDays;
      if (input.maxUses !== undefined) updateData.maxUses = input.maxUses;
      if (input.expiresAt !== undefined) updateData.expiresAt = input.expiresAt;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      // Update promo code
      const promoCode = await prisma.promoCode.update({
        where: { id: promoCodeId },
        data: updateData,
        include: {
          plan: true,
        },
      });

      logger.info('Promo code updated', {
        promoCodeId,
        changes: Object.keys(updateData),
      });

      return promoCode;
    } catch (error) {
      logger.error('Failed to update promo code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        promoCodeId,
      });
      throw error;
    }
  }

  /**
   * Delete promo code (admin only)
   */
  async deletePromoCode(promoCodeId: string): Promise<void> {
    try {
      const promoCode = await prisma.promoCode.findUnique({
        where: { id: promoCodeId },
      });

      if (!promoCode) {
        throw new NotFoundError('Promo code not found');
      }

      await prisma.promoCode.delete({
        where: { id: promoCodeId },
      });

      logger.info('Promo code deleted', { promoCodeId });
    } catch (error) {
      logger.error('Failed to delete promo code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        promoCodeId,
      });
      throw error;
    }
  }

  /**
   * Get promo code by ID
   */
  async getPromoCodeById(promoCodeId: string): Promise<PromoCodeWithRelations> {
    try {
      const promoCode = await prisma.promoCode.findUnique({
        where: { id: promoCodeId },
        include: {
          plan: true,
          activations: true,
        },
      });

      if (!promoCode) {
        throw new NotFoundError('Promo code not found');
      }

      return promoCode;
    } catch (error) {
      logger.error('Failed to get promo code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        promoCodeId,
      });
      throw error;
    }
  }

  /**
   * Get promo code by code
   */
  async getPromoCodeByCode(code: string): Promise<PromoCodeWithRelations> {
    try {
      const promoCode = await prisma.promoCode.findUnique({
        where: { code },
        include: {
          plan: true,
          activations: true,
        },
      });

      if (!promoCode) {
        throw new NotFoundError('Promo code not found');
      }

      return promoCode;
    } catch (error) {
      logger.error('Failed to get promo code by code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        code,
      });
      throw error;
    }
  }

  /**
   * Validate promo code
   */
  async validatePromoCode(code: string): Promise<PromoCodeValidationResult> {
    try {
      const promoCode = await prisma.promoCode.findUnique({
        where: { code },
        include: {
          plan: true,
        },
      });

      if (!promoCode) {
        return {
          isValid: false,
          reason: 'Promo code not found',
        };
      }

      // Check if active
      if (!promoCode.isActive) {
        return {
          isValid: false,
          code: promoCode,
          reason: 'Promo code is inactive',
        };
      }

      // Check if expired
      if (promoCode.expiresAt && new Date() > promoCode.expiresAt) {
        return {
          isValid: false,
          code: promoCode,
          reason: 'Promo code has expired',
        };
      }

      // Check max uses
      if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
        return {
          isValid: false,
          code: promoCode,
          reason: 'Promo code has reached maximum uses',
        };
      }

      return {
        isValid: true,
        code: promoCode,
      };
    } catch (error) {
      logger.error('Failed to validate promo code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        code,
      });
      throw error;
    }
  }

  /**
   * Activate promo code
   * Creates subscription and increments used count
   */
  async activatePromoCode(input: ActivatePromoCodeInput): Promise<PromoActivationWithRelations> {
    try {
      // Validate promo code
      const validation = await this.validatePromoCode(input.code);

      if (!validation.isValid || !validation.code) {
        throw new ValidationError(validation.reason || 'Invalid promo code');
      }

      const promoCode = validation.code;

      // Check if user already activated this promo code
      const existingActivation = await prisma.promoActivation.findUnique({
        where: {
          userId_promoCodeId: {
            userId: input.userId,
            promoCodeId: promoCode.id,
          },
        },
      });

      if (existingActivation) {
        throw new ValidationError('You have already used this promo code');
      }

      // Create subscription and activation in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + promoCode.durationDays);

        // Create subscription
        const subscription = await tx.subscription.create({
          data: {
            userId: input.userId,
            planId: promoCode.planId,
            status: 'active',
            startDate,
            endDate,
          },
        });

        // Create activation record
        const activation = await tx.promoActivation.create({
          data: {
            userId: input.userId,
            promoCodeId: promoCode.id,
          },
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            promoCode: true,
          },
        });

        // Increment used count
        await tx.promoCode.update({
          where: { id: promoCode.id },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });

        logger.info('Promo code activated', {
          promoCodeId: promoCode.id,
          code: promoCode.code,
          userId: input.userId,
          subscriptionId: subscription.id,
        });

        return activation;
      });

      return result;
    } catch (error) {
      logger.error('Failed to activate promo code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        input,
      });
      throw error;
    }
  }

  /**
   * List promo codes (admin only)
   */
  async listPromoCodes(query: PromoCodeListQuery): Promise<PaginatedPromoCodesResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        isActive,
        planId,
        sortBy = 'createdAt',
        order = 'desc',
      } = query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (planId) where.planId = planId;

      const [promoCodes, total] = await Promise.all([
        prisma.promoCode.findMany({
          where,
          include: {
            plan: true,
          },
          orderBy: { [sortBy]: order },
          skip,
          take: limit,
        }),
        prisma.promoCode.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.info('Promo codes listed', {
        page,
        limit,
        total,
        count: promoCodes.length,
      });

      return {
        promoCodes,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Failed to list promo codes', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
      });
      throw error;
    }
  }

  /**
   * List promo activations
   */
  async listPromoActivations(
    promoCodeId?: string,
    userId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    activations: PromoActivationWithRelations[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    try {
      const skip = (page - 1) * limit;

      const where: any = {};
      if (promoCodeId) where.promoCodeId = promoCodeId;
      if (userId) where.userId = userId;

      const [activations, total] = await Promise.all([
        prisma.promoActivation.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            promoCode: true,
          },
          orderBy: { activatedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.promoActivation.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.info('Promo activations listed', {
        page,
        limit,
        total,
        count: activations.length,
        filters: { promoCodeId, userId },
      });

      return {
        activations,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Failed to list promo activations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        promoCodeId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get promo code statistics (admin only)
   */
  async getPromoCodeStatistics(): Promise<PromoCodeStatistics> {
    try {
      const now = new Date();

      const [total, active, inactive, expired, totalActivations, topPromoCodes] = await Promise.all([
        prisma.promoCode.count(),
        prisma.promoCode.count({
          where: {
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        }),
        prisma.promoCode.count({ where: { isActive: false } }),
        prisma.promoCode.count({
          where: {
            isActive: true,
            expiresAt: { lte: now },
          },
        }),
        prisma.promoActivation.count(),
        prisma.promoCode.findMany({
          where: { usedCount: { gt: 0 } },
          include: { plan: true },
          orderBy: { usedCount: 'desc' },
          take: 10,
        }),
      ]);

      logger.info('Promo code statistics retrieved', {
        total,
        active,
        inactive,
        expired,
      });

      return {
        total,
        active,
        inactive,
        expired,
        totalActivations,
        topPromoCodes: topPromoCodes.map((pc) => ({
          code: pc.code,
          usedCount: pc.usedCount,
          maxUses: pc.maxUses,
          planName: pc.plan.name,
        })),
      };
    } catch (error) {
      logger.error('Failed to get promo code statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const promoService = new PromoService();
