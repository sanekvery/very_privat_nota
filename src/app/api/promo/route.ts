/**
 * Promo Codes API
 * GET /api/promo - Get list of promo codes (admin only)
 * POST /api/promo - Create promo code (admin only)
 */

import { NextRequest } from 'next/server';
import { promoService } from '@/modules/promo/promo.service';
import { createPromoCodeSchema, listPromoCodesSchema } from '@/modules/promo/promo.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/promo
 * Get list of promo codes (admin only)
 *
 * Query Parameters:
 * - page (number, optional) - Page number (default: 1)
 * - limit (number, optional) - Items per page (default: 20, max: 100)
 * - isActive (boolean, optional) - Filter by active status
 * - planId (string, optional) - Filter by plan ID
 * - sortBy (string, optional) - Sort by: createdAt | expiresAt | usedCount (default: createdAt)
 * - order (string, optional) - Sort order: asc | desc (default: desc)
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
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      isActive: searchParams.get('isActive'),
      planId: searchParams.get('planId'),
      sortBy: searchParams.get('sortBy'),
      order: searchParams.get('order'),
    };

    // Validate
    const validated = listPromoCodesSchema.parse(query);

    // Get promo codes
    const result = await promoService.listPromoCodes(validated);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/promo
 * Create promo code (admin only)
 *
 * Body:
 * {
 *   code: string,
 *   planId: string,
 *   durationDays: number,
 *   maxUses?: number,
 *   expiresAt?: Date
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse body
    const body = await request.json();

    // Validate
    const validated = createPromoCodeSchema.parse({
      ...body,
      createdBy: user.id,
    });

    // Create promo code
    const promoCode = await promoService.createPromoCode(validated);

    return createSuccessResponse(promoCode);
  } catch (error) {
    return createErrorResponse(error);
  }
}
