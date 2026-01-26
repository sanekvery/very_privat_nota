/**
 * Payment Statistics API (Admin)
 * GET /api/admin/payments/stats - Get payment statistics
 */

import { NextRequest } from 'next/server';
import { paymentService } from '@/modules/payments/payment.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/admin/payments/stats
 * Get comprehensive payment statistics (admin only)
 *
 * Response:
 * {
 *   totalRevenue: number
 *   totalCompleted: number
 *   totalPending: number
 *   totalFailed: number
 *   revenueThisMonth: number
 *   revenueToday: number
 *   averagePaymentAmount: number
 *   topPaymentMethod: PaymentMethod
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Get payment statistics
    const stats = await paymentService.getPaymentStats();

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error);
  }
}
