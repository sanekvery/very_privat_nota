/**
 * GET /api/auth/me
 * Get current authenticated user
 */

import { NextRequest } from 'next/server';
import {
  apiHandler,
  createSuccessResponse,
  validateMethod,
} from '@/lib/api-response';
import { UnauthorizedError } from '@/lib/errors';
import { authService } from '@/modules/auth/auth.service';

export const GET = apiHandler(async (request: NextRequest) => {
  validateMethod(request, ['GET']);

  // Get session token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Get current user
  const user = await authService.getCurrentUser(token);

  return createSuccessResponse({ user }, 200);
});
