/**
 * Close Ticket API
 * POST /api/support/tickets/:ticketId/close - Close ticket
 */

import { NextRequest } from 'next/server';
import { supportService } from '@/modules/support/support.service';
import { closeTicketSchema } from '@/modules/support/support.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * POST /api/support/tickets/:ticketId/close
 * Close ticket (user can close their own tickets, admins can close any)
 *
 * Returns: SupportTicket
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Validate
    const validated = closeTicketSchema.parse({
      ticketId: params.ticketId,
    });

    // Get ticket to check ownership (will throw if not found or no access)
    await supportService.getTicket(
      validated.ticketId,
      user.id,
      user.isAdmin
    );

    // Close ticket
    const closed = await supportService.closeTicket(validated.ticketId);

    return createSuccessResponse(closed);
  } catch (error) {
    return createErrorResponse(error);
  }
}
