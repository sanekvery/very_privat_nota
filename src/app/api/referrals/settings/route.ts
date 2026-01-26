/**
 * Referral Settings API (Admin)
 * GET /api/referrals/settings - Get referral settings
 * PATCH /api/referrals/settings - Update referral settings (admin)
 */

import { NextRequest } from 'next/server';
import { referralService } from '@/modules/referrals/referral.service';
import { updateReferralSettingsSchema } from '@/modules/referrals/referrals.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/referrals/settings
 * Get referral system settings
 *
 * Returns:
 * {
 *   firstPaymentPercentage: number,
 *   recurringPercentage: number,
 *   minWithdrawalAmount: number,
 *   withdrawalsEnabled: boolean
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth(request);

    // Get settings
    const settings = await referralService.getReferralSettings();

    return createSuccessResponse(settings);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PATCH /api/referrals/settings
 * Update referral settings (admin only)
 *
 * Body:
 * {
 *   firstPaymentPercentage?: number,
 *   recurringPercentage?: number,
 *   minWithdrawalAmount?: number,
 *   withdrawalsEnabled?: boolean
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse body
    const body = await request.json();

    // Validate
    const validated = updateReferralSettingsSchema.parse(body);

    // Update settings
    const settings = await referralService.updateReferralSettings(validated);

    return createSuccessResponse(settings);
  } catch (error) {
    return createErrorResponse(error);
  }
}
