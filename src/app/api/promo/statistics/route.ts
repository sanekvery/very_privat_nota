/**
 * Promo Code Statistics API
 * GET /api/promo/statistics - Get promo code statistics (admin only)
 */

import { NextRequest } from 'next/server';
import { promoService } from '@/modules/promo/promo.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/promo/statistics
 * Get promo code statistics (admin only)
 *
 * Returns:
 * {
 *   total: number,
 *   active: number,
 *   inactive: number,
 *   expired: number,
 *   totalActivations: number,
 *   topPromoCodes: Array<{code, usedCount, maxUses, planName}>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Get statistics
    const stats = await promoService.getPromoCodeStatistics();

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error);
  }
}
