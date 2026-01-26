/**
 * Payment Verification API
 * POST /api/payments/:paymentId/verify - Verify TON payment
 */

import { NextRequest } from 'next/server';
import { paymentService } from '@/modules/payments/payment.service';
import { z } from 'zod';
import { uuidSchema } from '@/lib/validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

const verifyPaymentSchema = z.object({
  paymentId: uuidSchema,
  transactionHash: z.string().min(1, 'Transaction hash is required'),
});

/**
 * POST /api/payments/:paymentId/verify
 * Verify TON payment with transaction hash
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Parse body
    const body = await request.json();

    // Validate
    const validated = verifyPaymentSchema.parse({
      paymentId: params.paymentId,
      transactionHash: body.transactionHash,
    });

    // Get payment to check ownership
    const existingPayment = await paymentService.getPaymentById(
      validated.paymentId
    );

    if (existingPayment.userId !== user.id) {
      throw new ForbiddenError('You can only verify your own payments');
    }

    // Verify TON payment
    const payment = await paymentService.verifyTonPayment(
      validated.paymentId,
      validated.transactionHash
    );

    return createSuccessResponse(payment);
  } catch (error) {
    return createErrorResponse(error);
  }
}
