/**
 * Support Tickets API
 * GET /api/support/tickets - List tickets for current user
 * POST /api/support/tickets - Create new ticket
 */

import { NextRequest } from 'next/server';
import { supportService } from '@/modules/support/support.service';
import { createTicketSchema, listTicketsSchema } from '@/modules/support/support.validation';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/support/tickets
 * List tickets for current user (or all tickets if admin)
 *
 * Query params:
 * - status ('open' | 'in_progress' | 'waiting_user' | 'closed', optional)
 * - priority ('low' | 'medium' | 'high' | 'urgent', optional)
 * - limit (number, default 20, max 100)
 * - offset (number, default 0)
 * - sortBy ('createdAt' | 'updatedAt' | 'priority', default 'createdAt')
 * - order ('asc' | 'desc', default 'desc')
 *
 * Returns:
 * {
 *   tickets: SupportTicket[],
 *   total: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const params = {
      userId: user.isAdmin ? undefined : user.id, // Admins see all, users see only their own
      status: searchParams.get('status') as any,
      priority: searchParams.get('priority') as any,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : undefined,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : undefined,
      sortBy: searchParams.get('sortBy') as any,
      order: searchParams.get('order') as any,
    };

    // Validate
    const validated = listTicketsSchema.parse(params);

    // Get tickets
    const result = await supportService.listTickets(validated);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/support/tickets
 * Create new support ticket
 *
 * Body:
 * {
 *   subject: string,
 *   message: string,
 *   priority?: 'low' | 'medium' | 'high' | 'urgent'
 * }
 *
 * Returns: SupportTicket
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Parse body
    const body = await request.json();

    // Validate
    const validated = createTicketSchema.parse({
      userId: user.id,
      subject: body.subject,
      message: body.message,
      priority: body.priority,
    });

    // Create ticket
    const ticket = await supportService.createTicket(validated);

    return createSuccessResponse(ticket);
  } catch (error) {
    return createErrorResponse(error);
  }
}
