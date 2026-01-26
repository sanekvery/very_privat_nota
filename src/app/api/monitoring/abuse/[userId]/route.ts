/**
 * Abuse Detection API
 * GET /api/monitoring/abuse/:userId - Detect abuse for user (admin only)
 */

import { NextRequest } from 'next/server';
import { abuseDetectionService } from '@/modules/monitoring/abuse-detection.service';
import { abuseDetectionSchema } from '@/modules/monitoring/monitoring.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/monitoring/abuse/:userId
 * Detect abuse for specific user
 *
 * Query params:
 * - period ('1h' | '24h' | '7d' | '30d', default '24h')
 *
 * Returns:
 * {
 *   userId: string,
 *   isAbusive: boolean,
 *   reason?: string,
 *   score: number,
 *   indicators: AbuseIndicator[],
 *   recommendation: 'monitor' | 'warn' | 'throttle' | 'ban'
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      userId: params.userId,
      period: (searchParams.get('period') || '24h') as '1h' | '24h' | '7d' | '30d',
    };

    // Validate
    const validated = abuseDetectionSchema.parse(queryParams);

    // Detect abuse
    const result = await abuseDetectionService.detectAbuse(
      validated.userId,
      validated.period
    );

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
