/**
 * POST /api/vpn/generate
 * Generate new VPN configuration
 */

import { NextRequest } from 'next/server';
import {
  apiHandler,
  createSuccessResponse,
  parseRequestBody,
  validateMethod,
} from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { vpnService } from '@/modules/vpn/vpn.service';
import {
  generateConfigSchema,
  type GenerateConfigInput,
} from '@/modules/vpn/vpn.validation';
import type { AuthUser } from '@/types';

export const POST = apiHandler(
  withAuth(async (request: NextRequest, user: AuthUser) => {
    validateMethod(request, ['POST']);

    const body = await parseRequestBody<GenerateConfigInput>(request);
    const validated = generateConfigSchema.parse(body);

    const config = await vpnService.generateConfig({
      subscriptionId: validated.subscriptionId,
      serverId: validated.serverId,
      userId: user.id,
    });

    return createSuccessResponse({ config });
  })
);
