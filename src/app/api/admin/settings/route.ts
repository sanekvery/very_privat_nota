/**
 * Admin System Settings API
 * GET /api/admin/settings - List all settings
 * POST /api/admin/settings - Create or update setting
 */

import { NextRequest } from 'next/server';
import { adminService } from '@/modules/admin/admin.service';
import { createSystemSettingSchema, listSystemSettingsSchema } from '@/modules/admin/admin.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';
import type { CreateSystemSettingInput } from '@/modules/admin/admin.types';

/**
 * GET /api/admin/settings
 * List all system settings (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    };

    // Validate
    const validated = listSystemSettingsSchema.parse(query);

    // Get settings
    const result = await adminService.listSystemSettings(validated.page, validated.limit);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/admin/settings
 * Create or update system setting (admin only)
 *
 * Body:
 * {
 *   key: string,
 *   value: any,
 *   description?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse body
    const body = await request.json();

    // Validate
    const validated = createSystemSettingSchema.parse(body);

    // Upsert setting
    const setting = await adminService.upsertSystemSetting(validated as CreateSystemSettingInput);

    return createSuccessResponse(setting);
  } catch (error) {
    return createErrorResponse(error);
  }
}
