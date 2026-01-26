/**
 * POST /api/vpn/rotate
 * Rotate VPN configuration (new IP + new keys)
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
  rotateConfigSchema,
  type RotateConfigInput,
} from '@/modules/vpn/vpn.validation';

export const POST = apiHandler(
  withAuth(async (request: NextRequest) => {
    validateMethod(request, ['POST']);

    const body = await parseRequestBody<RotateConfigInput>(request);
    const validated = rotateConfigSchema.parse(body);

    const result = await vpnService.rotateConfig(validated.subscriptionId);

    return createSuccessResponse({ result });
  })
);
