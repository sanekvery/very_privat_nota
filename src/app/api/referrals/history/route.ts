/**
 * Referral History API
 * GET /api/referrals/history - Get referral earnings and withdrawals history
 */

import { NextRequest } from 'next/server';
import { referralService } from '@/modules/referrals/referral.service';
import { getReferralHistorySchema } from '@/modules/referrals/referrals.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/referrals/history
 * Get referral transaction history
 *
 * Query params:
 * - limit (number, default 20, max 100)
 * - offset (number, default 0)
 * - sortBy ('date' | 'amount', default 'date')
 * - order ('asc' | 'desc', default 'desc')
 * - type ('earning' | 'withdrawal', optional) - filter by type
 *
 * Returns:
 * {
 *   transactions: ReferralTransaction[],
 *   withdrawals: WithdrawalRequest[],
 *   total: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const params = {
      userId: user.id,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : undefined,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : undefined,
      sortBy: (searchParams.get('sortBy') as 'date' | 'amount') || undefined,
      order: (searchParams.get('order') as 'asc' | 'desc') || undefined,
      type: (searchParams.get('type') as 'earning' | 'withdrawal') || undefined,
    };

    // Validate
    const validated = getReferralHistorySchema.parse(params);

    // Get history
    const history = await referralService.getReferralHistory(validated);

    return createSuccessResponse(history);
  } catch (error) {
    return createErrorResponse(error);
  }
}
