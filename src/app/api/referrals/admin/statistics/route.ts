/**
 * Admin Referral Statistics API
 * GET /api/referrals/admin/statistics - Get comprehensive referral statistics (admin only)
 */

import { NextRequest } from 'next/server';
import { referralService } from '@/modules/referrals/referral.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/referrals/admin/statistics
 * Get admin referral statistics
 *
 * Returns:
 * {
 *   totalReferrers: number,
 *   totalReferrals: number,
 *   totalEarnings: number,
 *   totalWithdrawals: number,
 *   pendingWithdrawals: number,
 *   topReferrers: Array<{userId, username, referralCount, totalEarnings}>,
 *   recentTransactions: ReferralTransaction[]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Get admin statistics
    const stats = await referralService.getAdminStatistics();

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error);
  }
}
