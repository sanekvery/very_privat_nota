/**
 * Promo Module Types
 * Domain types for promo codes
 */

import type { PromoCode, PromoActivation, SubscriptionPlan } from '@prisma/client';

// Re-export PromoCode
export type { PromoCode };

// PromoCode with relations
export interface PromoCodeWithRelations extends PromoCode {
  plan: SubscriptionPlan;
  activations?: PromoActivation[];
}

// PromoActivation with relations
export interface PromoActivationWithRelations extends PromoActivation {
  user: {
    id: string;
    telegramId: bigint | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  promoCode: PromoCode;
}

// Create promo code input
export interface CreatePromoCodeInput {
  code: string;
  planId: string;
  durationDays: number;
  maxUses?: number;
  expiresAt?: Date;
  createdBy: string;
}

// Update promo code input
export interface UpdatePromoCodeInput {
  code?: string;
  durationDays?: number;
  maxUses?: number | null;
  expiresAt?: Date | null;
  isActive?: boolean;
}

// Activate promo code input
export interface ActivatePromoCodeInput {
  code: string;
  userId: string;
}

// Promo code list query
export interface PromoCodeListQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  planId?: string;
  sortBy?: 'createdAt' | 'expiresAt' | 'usedCount';
  order?: 'asc' | 'desc';
}

// Paginated promo codes response
export interface PaginatedPromoCodesResponse {
  promoCodes: PromoCodeWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Promo code statistics
export interface PromoCodeStatistics {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  totalActivations: number;
  topPromoCodes: Array<{
    code: string;
    usedCount: number;
    maxUses: number | null;
    planName: string;
  }>;
}

// Promo code validation result
export interface PromoCodeValidationResult {
  isValid: boolean;
  code?: PromoCode;
  reason?: string;
}
