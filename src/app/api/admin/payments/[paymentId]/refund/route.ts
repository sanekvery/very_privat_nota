/**
 * Payment Refund API (Admin)
 * POST /api/admin/payments/:paymentId/refund - Refund payment
 */

import { NextRequest } from 'next/server';
import { paymentService } from '@/modules/payments/payment.service';
import { refundPaymentSchema } from '@/modules/payments/payments.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * POST /api/admin/payments/:paymentId/refund
 * Refund payment (admin only)
 *
 * Request:
 * {
 *   reason: string           // Refund reason
 *   amount?: number          // Partial refund amount (optional)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
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
    const validated = refundPaymentSchema.parse({
      paymentId: params.paymentId,
      reason: body.reason,
      amount: body.amount,
      adminId: user.id,
    });

    // Process refund
    const payment = await paymentService.refundPayment(validated);

    return createSuccessResponse(payment);
  } catch (error) {
    return createErrorResponse(error);
  }
}
