/**
 * Admin Audit Log API
 * GET /api/admin/audit-log - Get audit log entries
 * POST /api/admin/audit-log - Create audit log entry
 */

import { NextRequest } from 'next/server';
import { adminService } from '@/modules/admin/admin.service';
import { createAuditLogSchema, listAuditLogSchema } from '@/modules/admin/admin.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/admin/audit-log
 * Get audit log entries (admin only)
 *
 * Query Parameters:
 * - page, limit, adminId, entityType, entityId, action
 * - startDate, endDate, sortBy, order
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
      adminId: searchParams.get('adminId'),
      entityType: searchParams.get('entityType'),
      entityId: searchParams.get('entityId'),
      action: searchParams.get('action'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      sortBy: searchParams.get('sortBy'),
      order: searchParams.get('order'),
    };

    // Validate
    const validated = listAuditLogSchema.parse(query);

    // Get audit logs
    const result = await adminService.listAuditLogs(validated);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/admin/audit-log
 * Create audit log entry (admin only)
 *
 * Body:
 * {
 *   action: string,
 *   entityType: string,
 *   entityId?: string,
 *   changes?: Record<string, any>
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

    // Get IP and User-Agent from headers
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Validate
    const validated = createAuditLogSchema.parse({
      ...body,
      adminId: user.id,
      ipAddress,
      userAgent,
    });

    // Create audit log
    const auditLog = await adminService.createAuditLog(validated);

    return createSuccessResponse(auditLog);
  } catch (error) {
    return createErrorResponse(error);
  }
}
