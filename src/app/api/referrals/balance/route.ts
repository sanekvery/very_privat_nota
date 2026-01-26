/**
 * Referral Balance API
 * GET /api/referrals/balance - Get referral balance for current user
 */

import { NextRequest } from 'next/server';
import { referralService } from '@/modules/referrals/referral.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/referrals/balance
 * Get referral balance and earnings
 *
 * Returns:
 * {
 *   userId: string,
 *   totalEarned: number,
 *   availableBalance: number,
 *   pendingBalance: number,
 *   withdrawnTotal: number,
 *   currency: 'TON'
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Get balance
    const balance = await referralService.getReferralBalance(user.id);

    return createSuccessResponse(balance);
  } catch (error) {
    return createErrorResponse(error);
  }
}
