/**
 * Promo Code Activations API
 * GET /api/promo/activations - Get list of promo code activations (admin only)
 */

import { NextRequest } from 'next/server';
import { promoService } from '@/modules/promo/promo.service';
import { listPromoActivationsSchema } from '@/modules/promo/promo.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/promo/activations
 * Get list of promo code activations (admin only)
 *
 * Query Parameters:
 * - promoCodeId (string, optional) - Filter by promo code ID
 * - userId (string, optional) - Filter by user ID
 * - page (number, optional) - Page number (default: 1)
 * - limit (number, optional) - Items per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = {
      promoCodeId: searchParams.get('promoCodeId'),
      userId: searchParams.get('userId'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    };

    // Validate
    const validated = listPromoActivationsSchema.parse(query);

    // Get activations
    const result = await promoService.listPromoActivations(
      validated.promoCodeId,
      validated.userId,
      validated.page,
      validated.limit
    );

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
