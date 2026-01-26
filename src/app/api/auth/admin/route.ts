/**
 * POST /api/auth/admin
 * Authenticate admin user
 */

import { NextRequest } from 'next/server';
import {
  apiHandler,
  createSuccessResponse,
  parseRequestBody,
  validateMethod,
} from '@/lib/api-response';
import { authService } from '@/modules/auth/auth.service';
import {
  adminAuthSchema,
  type AdminAuthInput,
} from '@/modules/auth/auth.validation';

export const POST = apiHandler(async (request: NextRequest) => {
  validateMethod(request, ['POST']);

  // Parse and validate request body
  const body = await parseRequestBody<AdminAuthInput>(request);
  const validated = adminAuthSchema.parse(body);

  // Authenticate admin
  const result = await authService.authenticateAdmin({
    secret: validated.secret,
    telegramId: validated.telegramId,
  });

  return createSuccessResponse(
    {
      user: result.user,
      sessionToken: result.sessionToken,
      expiresAt: result.expiresAt.toISOString(),
    },
    200
  );
});
