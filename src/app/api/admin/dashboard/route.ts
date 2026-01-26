/**
 * Admin Dashboard API
 * GET /api/admin/dashboard - Get dashboard statistics
 */

import { NextRequest } from 'next/server';
import { adminService } from '@/modules/admin/admin.service';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/admin/dashboard
 * Get comprehensive dashboard statistics (admin only)
 *
 * Returns statistics for:
 * - Users (total, active, banned, new)
 * - Subscriptions (total, active, expired, cancelled)
 * - Payments (total, revenue, status breakdown)
 * - Servers (total, active, offline, users)
 * - Support (tickets by status)
 * - Promo codes (total, activations)
 * - Referrals (earnings, withdrawals)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Get dashboard statistics
    const stats = await adminService.getDashboardStatistics();

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error);
  }
}
