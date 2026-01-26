/**
 * Admin Withdrawals List API
 * GET /api/referrals/admin/withdrawals - Get all withdrawal requests (admin only)
 */

import { NextRequest } from 'next/server';
import { referralService } from '@/modules/referrals/referral.service';
import { listWithdrawalsSchema } from '@/modules/referrals/referrals.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/referrals/admin/withdrawals
 * Get all withdrawal requests (admin only)
 *
 * Query params:
 * - status ('pending' | 'processing' | 'completed' | 'rejected', optional)
 * - userId (UUID, optional) - filter by user
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
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const params = {
      status: searchParams.get('status') as
        | 'pending'
        | 'approved'
        | 'rejected'
        | 'completed'
        | null,
      userId: searchParams.get('userId') || undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : undefined,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : undefined,
    };

    // Validate
    const validated = listWithdrawalsSchema.parse(params);

    // Get withdrawals
    const result = await referralService.listWithdrawals(validated);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
