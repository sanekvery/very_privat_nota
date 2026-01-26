/**
 * Activate Promo Code API
 * POST /api/promo/activate - Activate promo code and create subscription
 */

import { NextRequest } from 'next/server';
import { promoService } from '@/modules/promo/promo.service';
import { activatePromoCodeSchema } from '@/modules/promo/promo.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * POST /api/promo/activate
 * Activate promo code and create subscription
 *
 * Body:
 * {
 *   code: string
 * }
 *
 * Returns activation details and created subscription
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Parse body
    const body = await request.json();

    // Validate
    const validated = activatePromoCodeSchema.parse({
      code: body.code,
      userId: user.id,
    });

    // Activate promo code
    const activation = await promoService.activatePromoCode(validated);

    return createSuccessResponse(activation);
  } catch (error) {
    return createErrorResponse(error);
  }
}
