/**
 * POST /api/auth/logout
 * Logout current user session
 */

import { NextRequest } from 'next/server';
import {
  apiHandler,
  createSuccessResponse,
  validateMethod,
} from '@/lib/api-response';
import { UnauthorizedError } from '@/lib/errors';
import { authService } from '@/modules/auth/auth.service';

export const POST = apiHandler(async (request: NextRequest) => {
  validateMethod(request, ['POST']);

  // Get session token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Logout
  await authService.logout(token);

  return createSuccessResponse({ message: 'Logged out successfully' }, 200);
});
