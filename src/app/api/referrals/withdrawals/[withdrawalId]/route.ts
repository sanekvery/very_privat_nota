/**
 * Withdrawal Management API (Admin)
 * GET /api/referrals/withdrawals/:withdrawalId - Get withdrawal details
 * PATCH /api/referrals/withdrawals/:withdrawalId - Update withdrawal status (admin)
 */

import { NextRequest } from 'next/server';
import { referralService } from '@/modules/referrals/referral.service';
import {
  getWithdrawalSchema,
  updateWithdrawalStatusSchema,
} from '@/modules/referrals/referrals.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/referrals/withdrawals/:withdrawalId
 * Get withdrawal request details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { withdrawalId: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Validate
    const validated = getWithdrawalSchema.parse({
      withdrawalId: params.withdrawalId,
    });

    // Get withdrawal
    const withdrawal = await referralService.getWithdrawal(
      validated.withdrawalId
    );

    // Check access: user can only see their own withdrawals, admins see all
    if (!user.isAdmin && withdrawal.userId !== user.id) {
      throw new ForbiddenError('Access denied');
    }

    return createSuccessResponse(withdrawal);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PATCH /api/referrals/withdrawals/:withdrawalId
 * Update withdrawal status (admin only)
 *
 * Body:
 * {
 *   status: 'pending' | 'processing' | 'completed' | 'rejected',
 *   rejectionReason?: string,
 *   transactionHash?: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { withdrawalId: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse body
    const body = await request.json();

    // Validate
    const validated = updateWithdrawalStatusSchema.parse({
      withdrawalId: params.withdrawalId,
      ...body,
    });

    // Update withdrawal status
    const withdrawal = await referralService.updateWithdrawalStatus(
      validated.withdrawalId,
      validated.status,
      {
        rejectionReason: validated.rejectionReason,
        transactionHash: validated.transactionHash,
      }
    );

    return createSuccessResponse(withdrawal);
  } catch (error) {
    return createErrorResponse(error);
  }
}
