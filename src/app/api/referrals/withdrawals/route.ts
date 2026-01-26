/**
 * Withdrawals API
 * GET /api/referrals/withdrawals - Get withdrawal requests for current user
 * POST /api/referrals/withdrawals - Create withdrawal request
 */

import { NextRequest } from 'next/server';
import { referralService } from '@/modules/referrals/referral.service';
import { createWithdrawalSchema } from '@/modules/referrals/referrals.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/referrals/withdrawals
 * Get withdrawal requests for current user
 *
 * Query params:
 * - limit (number, default 20, max 100)
 * - offset (number, default 0)
 *
 * Returns:
 * {
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
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20'),
      100
    );
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get withdrawals
    const result = await referralService.listWithdrawals({
      userId: user.id,
      limit,
      offset,
    });

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/referrals/withdrawals
 * Create new withdrawal request
 *
 * Body:
 * {
 *   amount: number,
 *   tonAddress: string
 * }
 *
 * Returns: WithdrawalRequest
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Parse body
    const body = await request.json();

    // Validate
    const validated = createWithdrawalSchema.parse({
      userId: user.id,
      amount: body.amount,
      tonWalletAddress: body.tonWalletAddress,
    });

    // Create withdrawal
    const withdrawal = await referralService.createWithdrawal(validated);

    return createSuccessResponse(withdrawal);
  } catch (error) {
    return createErrorResponse(error);
  }
}
