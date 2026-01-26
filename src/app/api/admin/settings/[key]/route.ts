/**
 * Admin System Setting by Key API
 * GET /api/admin/settings/:key - Get setting by key
 * PUT /api/admin/settings/:key - Update setting
 * DELETE /api/admin/settings/:key - Delete setting
 */

import { NextRequest } from 'next/server';
import { adminService } from '@/modules/admin/admin.service';
import {
  getSystemSettingSchema,
  updateSystemSettingSchema,
  deleteSystemSettingSchema,
} from '@/modules/admin/admin.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/admin/settings/:key
 * Get system setting by key (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Validate
    const validated = getSystemSettingSchema.parse({ key: params.key });

    // Get setting
    const setting = await adminService.getSystemSetting(validated.key);

    return createSuccessResponse(setting);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/admin/settings/:key
 * Update system setting (admin only)
 *
 * Body:
 * {
 *   value: any,
 *   description?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Parse body
    const body = await request.json();

    // Validate
    const validated = updateSystemSettingSchema.parse({
      key: params.key,
      ...body,
    });

    // Update setting
    const { key, ...updateData } = validated;
    const setting = await adminService.updateSystemSetting(key, updateData);

    return createSuccessResponse(setting);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/settings/:key
 * Delete system setting (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request);

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Validate
    const validated = deleteSystemSettingSchema.parse({ key: params.key });

    // Delete setting
    await adminService.deleteSystemSetting(validated.key);

    return createSuccessResponse({ message: 'Setting deleted successfully' });
  } catch (error) {
    return createErrorResponse(error);
  }
}
