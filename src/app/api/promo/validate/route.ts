/**
 * Validate Promo Code API
 * POST /api/promo/validate - Check if promo code is valid
 */

import { NextRequest } from 'next/server';
import { promoService } from '@/modules/promo/promo.service';
import { validatePromoCodeSchema } from '@/modules/promo/promo.validation';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * POST /api/promo/validate
 * Check if promo code is valid
 *
 * Body:
 * {
 *   code: string
 * }
 *
 * Returns:
 * {
 *   isValid: boolean,
 *   code?: PromoCode,
 *   reason?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse body
    const body = await request.json();

    // Validate input
    const validated = validatePromoCodeSchema.parse(body);

    // Validate promo code
    const result = await promoService.validatePromoCode(validated.code);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
