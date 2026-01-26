/**
 * Promo Code Details API
 * GET /api/promo/:promoCodeId - Get promo code by ID
 * PATCH /api/promo/:promoCodeId - Update promo code
 * DELETE /api/promo/:promoCodeId - Delete promo code
 */

import { NextRequest } from 'next/server';
import { promoService } from '@/modules/promo/promo.service';
import {
  getPromoCodeByIdSchema,
  updatePromoCodeSchema,
  deletePromoCodeSchema,
} from '@/modules/promo/promo.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/promo/:promoCodeId
 * Get promo code by ID (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { promoCodeId: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Validate
    const validated = getPromoCodeByIdSchema.parse({
      promoCodeId: params.promoCodeId,
    });

    // Get promo code
    const promoCode = await promoService.getPromoCodeById(validated.promoCodeId);

    return createSuccessResponse(promoCode);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PATCH /api/promo/:promoCodeId
 * Update promo code (admin only)
 *
 * Body:
 * {
 *   code?: string,
 *   durationDays?: number,
 *   maxUses?: number,
 *   expiresAt?: Date,
 *   isActive?: boolean
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { promoCodeId: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse body
    const body = await request.json();

    // Validate
    const validated = updatePromoCodeSchema.parse({
      promoCodeId: params.promoCodeId,
      ...body,
    });

    // Update promo code
    const { promoCodeId, ...updateData } = validated;
    const promoCode = await promoService.updatePromoCode(promoCodeId, updateData);

    return createSuccessResponse(promoCode);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/promo/:promoCodeId
 * Delete promo code (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { promoCodeId: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Validate
    const validated = deletePromoCodeSchema.parse({
      promoCodeId: params.promoCodeId,
    });

    // Delete promo code
    await promoService.deletePromoCode(validated.promoCodeId);

    return createSuccessResponse({ message: 'Promo code deleted successfully' });
  } catch (error) {
    return createErrorResponse(error);
  }
}
