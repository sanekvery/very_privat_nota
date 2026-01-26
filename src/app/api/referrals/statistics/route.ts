/**
 * Referral Statistics API
 * GET /api/referrals/statistics - Get referral statistics for current user
 */

import { NextRequest } from 'next/server';
import { referralService } from '@/modules/referrals/referral.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/referrals/statistics
 * Get comprehensive referral statistics
 *
 * Returns:
 * {
 *   userId: string,
 *   referralCode: string,
 *   totalReferrals: number,
 *   activeReferrals: number,
 *   totalEarnings: number,
 *   thisMonthEarnings: number,
 *   lastMonthEarnings: number,
 *   balance: ReferralBalance,
 *   topReferrals: TopReferral[]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Get statistics
    const stats = await referralService.getReferralStatistics(user.id);

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error);
  }
}
