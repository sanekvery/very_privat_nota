/**
 * Ticket Reply API
 * POST /api/support/tickets/:ticketId/reply - Reply to ticket
 */

import { NextRequest } from 'next/server';
import { supportService } from '@/modules/support/support.service';
import { createReplySchema } from '@/modules/support/support.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * POST /api/support/tickets/:ticketId/reply
 * Create reply to ticket
 *
 * Body:
 * {
 *   message: string
 * }
 *
 * Returns: TicketReply
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Parse body
    const body = await request.json();

    // Validate
    const validated = createReplySchema.parse({
      ticketId: params.ticketId,
      userId: user.id,
      message: body.message,
      isStaff: user.isAdmin, // Admins are staff
    });

    // Create reply
    const reply = await supportService.createReply(validated);

    return createSuccessResponse(reply);
  } catch (error) {
    return createErrorResponse(error);
  }
}
