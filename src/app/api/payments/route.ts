/**
 * Payments API Routes
 * GET /api/payments - List user's payments
 * POST /api/payments - Create new payment
 */

import { NextRequest } from 'next/server';
import { paymentService } from '@/modules/payments/payment.service';
import {
  createPaymentSchema,
  listPaymentsSchema,
} from '@/modules/payments/payments.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/payments
 * List user's payments with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const statusParam = searchParams.get('status');

    const params = {
      userId: user.id,
      status: statusParam || undefined,
      limit: limitParam ? parseInt(limitParam) : undefined,
      offset: offsetParam ? parseInt(offsetParam) : undefined,
    };

    // Validate
    const validated = listPaymentsSchema.parse(params);

    // Get payments
    const history = await paymentService.getUserPayments(user.id, {
      status: validated.status,
      limit: validated.limit,
      offset: validated.offset,
    });

    return createSuccessResponse(history);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/payments
 * Create new payment
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Parse body
    const body = await request.json();

    // Validate
    const validated = createPaymentSchema.parse({
      ...body,
      userId: user.id,
    });

    // Create payment
    const payment = await paymentService.createPayment(validated);

    // If TON payment, generate payment link
    let paymentLink: string | undefined;
    if (validated.method === 'ton') {
      const { tonService } = await import('@/modules/payments/ton.service');
      paymentLink = tonService.generatePaymentLink(
        validated.amount,
        `payment_${payment.id}`
      );
    }

    return createSuccessResponse(
      {
        payment,
        paymentLink,
      },
      201
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
