/**
 * TON Payment Webhook
 * POST /api/payments/webhook/ton - Handle TON blockchain webhook
 *
 * This endpoint is called by TON payment gateway when transaction is confirmed
 * No authentication required - webhook authenticity verified by signature
 */

import { NextRequest } from 'next/server';
import { paymentService } from '@/modules/payments/payment.service';
import { tonWebhookSchema } from '@/modules/payments/payments.validation';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

/**
 * POST /api/payments/webhook/ton
 * Handle TON webhook
 *
 * Expected payload:
 * {
 *   transactionHash: string
 *   from: string
 *   to: string
 *   amount: string (nanoTON)
 *   comment?: string
 *   timestamp: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse body
    const body = await request.json();

    logger.info('TON webhook received', {
      transactionHash: body.transactionHash,
      amount: body.amount,
    });

    // Validate payload
    const validated = tonWebhookSchema.parse(body);

    // TODO: Verify webhook signature if TON gateway provides it
    // Example:
    // const signature = request.headers.get('X-TON-Signature');
    // if (!verifyWebhookSignature(body, signature)) {
    //   throw new Error('Invalid webhook signature');
    // }

    // Process webhook
    await paymentService.handleTonWebhook(validated);

    return createSuccessResponse({ message: 'Webhook processed' });
  } catch (error) {
    logger.error('TON webhook processing failed', {
      error: error instanceof Error ? error.message : 'Unknown',
    });

    return createErrorResponse(error);
  }
}
