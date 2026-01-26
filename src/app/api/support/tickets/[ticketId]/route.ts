/**
 * Ticket Details API
 * GET /api/support/tickets/:ticketId - Get ticket details with replies
 * PATCH /api/support/tickets/:ticketId - Update ticket (admin only)
 */

import { NextRequest } from 'next/server';
import { supportService } from '@/modules/support/support.service';
import { getTicketSchema, updateTicketSchema } from '@/modules/support/support.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { ForbiddenError } from '@/lib/errors';

/**
 * GET /api/support/tickets/:ticketId
 * Get ticket details with all replies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Validate
    const validated = getTicketSchema.parse({
      ticketId: params.ticketId,
    });

    // Get ticket
    const ticket = await supportService.getTicket(
      validated.ticketId,
      user.id,
      user.isAdmin
    );

    return createSuccessResponse(ticket);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PATCH /api/support/tickets/:ticketId
 * Update ticket status, priority, or assignment (admin only)
 *
 * Body:
 * {
 *   status?: 'open' | 'in_progress' | 'waiting_user' | 'closed',
 *   priority?: 'low' | 'medium' | 'high' | 'urgent',
 *   assignedTo?: string (user ID)
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
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
    const validated = updateTicketSchema.parse({
      ticketId: params.ticketId,
      ...body,
    });

    // Update ticket
    const ticket = await supportService.updateTicket(validated);

    return createSuccessResponse(ticket);
  } catch (error) {
    return createErrorResponse(error);
  }
}
