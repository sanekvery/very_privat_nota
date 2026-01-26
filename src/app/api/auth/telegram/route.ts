/**
 * POST /api/auth/telegram
 * Authenticate user via Telegram WebApp
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
  telegramAuthSchema,
  type TelegramAuthInput,
} from '@/modules/auth/auth.validation';

export const POST = apiHandler(async (request: NextRequest) => {
  validateMethod(request, ['POST']);

  // Parse and validate request body
  const body = await parseRequestBody<TelegramAuthInput>(request);
  const validated = telegramAuthSchema.parse(body);

  // Authenticate user
  const result = await authService.authenticateWithTelegram(
    validated.initData,
    validated.startParam
  );

  return createSuccessResponse(
    {
      user: result.user,
      sessionToken: result.sessionToken,
      expiresAt: result.expiresAt.toISOString(),
    },
    200
  );
});
