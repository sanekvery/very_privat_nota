/**
 * Payment Details API
 * GET /api/payments/:paymentId - Get payment details
 */

import { NextRequest } from 'next/server';
import { paymentService } from '@/modules/payments/payment.service';
import { getPaymentSchema } from '@/modules/payments/payments.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/payments/:paymentId
 * Get payment details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Validate
    const validated = getPaymentSchema.parse({
      paymentId: params.paymentId,
    });

    // Get payment
    const payment = await paymentService.getPaymentById(validated.paymentId);

    // Check ownership
    if (payment.userId !== user.id) {
      throw new ForbiddenError('You can only view your own payments');
    }

    return createSuccessResponse(payment);
  } catch (error) {
    return createErrorResponse(error);
  }
}
