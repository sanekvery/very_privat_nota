/**
 * Support Service
 * Manages support tickets and replies
 *
 * Responsibilities:
 * - Create and manage support tickets
 * - Handle ticket replies
 * - Update ticket status and assignment
 * - Provide ticket statistics
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';
import type {
  SupportTicketWithRelations,
  TicketReplyWithRelations,
  CreateTicketInput,
  UpdateTicketInput,
  CreateReplyInput,
  TicketListQuery,
  TicketStatistics,
  AdminTicketStatistics,
  TicketStatus,
} from './support.types';

export class SupportService {
  /**
   * Create new support ticket with initial message
   */
  async createTicket(input: CreateTicketInput): Promise<SupportTicketWithRelations> {
    const { userId, subject, message, priority = 'medium' } = input;

    // Create ticket with first reply in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create ticket
      const ticket = await tx.supportTicket.create({
        data: {
          userId,
          subject,
          priority,
          status: 'open',
        },
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Create first reply (user's message)
      await tx.ticketReply.create({
        data: {
          ticketId: ticket.id,
          userId,
          message,
          isStaff: false,
        },
      });

      return ticket;
    });

    logger.info('Support ticket created', {
      ticketId: result.id,
      userId,
      subject,
    });

    return result;
  }

  /**
   * Get ticket by ID with all replies
   */
  async getTicket(ticketId: string, userId?: string, isAdmin = false): Promise<SupportTicketWithRelations> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket', ticketId);
    }

    // Check access: user can only see their own tickets, admins see all
    if (!isAdmin && userId && ticket.userId !== userId) {
      throw new ForbiddenError('You can only view your own tickets');
    }

    return ticket;
  }

  /**
   * List tickets with filters
   */
  async listTickets(query: TicketListQuery): Promise<{
    tickets: SupportTicketWithRelations[];
    total: number;
  }> {
    const {
      userId,
      status,
      priority,
      assignedTo,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const where: any = {};

    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo !== undefined) {
      where.assignedTo = assignedTo === '' ? null : assignedTo;
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          replies: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              user: {
                select: {
                  id: true,
                  telegramId: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          [sortBy]: order,
        },
        take: limit,
        skip: offset,
      }),

      prisma.supportTicket.count({ where }),
    ]);

    return { tickets, total };
  }

  /**
   * Update ticket (status, priority, assignment)
   */
  async updateTicket(input: UpdateTicketInput): Promise<SupportTicketWithRelations> {
    const { ticketId, status, priority, assignedTo } = input;

    // Check ticket exists
    const existing = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!existing) {
      throw new NotFoundError('Ticket', ticketId);
    }

    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'closed') {
        updateData.closedAt = new Date();
      }
    }

    if (priority !== undefined) {
      updateData.priority = priority;
    }

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    logger.info('Ticket updated', {
      ticketId,
      status,
      priority,
      assignedTo,
    });

    return ticket;
  }

  /**
   * Close ticket
   */
  async closeTicket(ticketId: string): Promise<SupportTicketWithRelations> {
    return this.updateTicket({
      ticketId,
      status: 'closed',
    });
  }

  /**
   * Create reply to ticket
   */
  async createReply(input: CreateReplyInput): Promise<TicketReplyWithRelations> {
    const { ticketId, userId, message, isStaff = false } = input;

    // Check ticket exists and not closed
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket', ticketId);
    }

    if (ticket.status === 'closed') {
      throw new ValidationError('Cannot reply to closed ticket');
    }

    // Create reply
    const reply = await prisma.ticketReply.create({
      data: {
        ticketId,
        userId,
        message,
        isStaff,
      },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update ticket status based on who replied
    let newStatus: TicketStatus | undefined;

    if (isStaff && ticket.status === 'open') {
      newStatus = 'in_progress';
    } else if (!isStaff && ticket.status === 'in_progress') {
      newStatus = 'waiting_user';
    }

    if (newStatus) {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      });
    } else {
      // Just update updatedAt
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });
    }

    logger.info('Ticket reply created', {
      ticketId,
      replyId: reply.id,
      isStaff,
    });

    return reply;
  }

  /**
   * Get ticket statistics for user
   */
  async getTicketStatistics(userId: string): Promise<TicketStatistics> {
    const [tickets, byStatus, byPriority] = await Promise.all([
      prisma.supportTicket.findMany({
        where: { userId },
        select: {
          status: true,
          priority: true,
          createdAt: true,
          closedAt: true,
        },
      }),

      prisma.supportTicket.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),

      prisma.supportTicket.groupBy({
        by: ['priority'],
        where: { userId },
        _count: true,
      }),
    ]);

    const total = tickets.length;

    const statusCounts: Record<string, number> = {};
    byStatus.forEach((item) => {
      statusCounts[item.status] = item._count;
    });

    const priorityCounts: Record<string, number> = {};
    byPriority.forEach((item) => {
      priorityCounts[item.priority] = item._count;
    });

    // Calculate avg resolution time for closed tickets
    const closedTickets = tickets.filter(
      (t) => t.status === 'closed' && t.closedAt
    );

    let avgResolutionTime = 0;
    if (closedTickets.length > 0) {
      const totalTime = closedTickets.reduce((sum, t) => {
        return sum + (t.closedAt!.getTime() - t.createdAt.getTime());
      }, 0);
      avgResolutionTime = Math.round(totalTime / closedTickets.length);
    }

    return {
      total,
      open: statusCounts['open'] || 0,
      inProgress: statusCounts['in_progress'] || 0,
      waitingUser: statusCounts['waiting_user'] || 0,
      closed: statusCounts['closed'] || 0,
      byPriority: {
        low: priorityCounts['low'] || 0,
        medium: priorityCounts['medium'] || 0,
        high: priorityCounts['high'] || 0,
        urgent: priorityCounts['urgent'] || 0,
      },
      avgResolutionTime,
      unassignedCount: 0, // Not applicable for user stats
    };
  }

  /**
   * Get admin ticket statistics
   */
  async getAdminStatistics(): Promise<AdminTicketStatistics> {
    const [tickets, byStatus, byPriority, unassignedCount] = await Promise.all([
      prisma.supportTicket.findMany({
        select: {
          status: true,
          priority: true,
          createdAt: true,
          closedAt: true,
          assignedTo: true,
        },
      }),

      prisma.supportTicket.groupBy({
        by: ['status'],
        _count: true,
      }),

      prisma.supportTicket.groupBy({
        by: ['priority'],
        _count: true,
      }),

      prisma.supportTicket.count({
        where: { assignedTo: null },
      }),
    ]);

    const total = tickets.length;

    const statusCounts: Record<string, number> = {};
    byStatus.forEach((item) => {
      statusCounts[item.status] = item._count;
    });

    const priorityCounts: Record<string, number> = {};
    byPriority.forEach((item) => {
      priorityCounts[item.priority] = item._count;
    });

    // Calculate avg resolution time
    const closedTickets = tickets.filter(
      (t) => t.status === 'closed' && t.closedAt
    );

    let avgResolutionTime = 0;
    if (closedTickets.length > 0) {
      const totalTime = closedTickets.reduce((sum, t) => {
        return sum + (t.closedAt!.getTime() - t.createdAt.getTime());
      }, 0);
      avgResolutionTime = Math.round(totalTime / closedTickets.length);
    }

    // Recent tickets
    const recentTickets = await prisma.supportTicket.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        replies: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Top assignees
    const assignedTickets = tickets.filter((t) => t.assignedTo);
    const assigneeCounts = new Map<string, { total: number; resolved: number }>();

    assignedTickets.forEach((ticket) => {
      const assigneeId = ticket.assignedTo!;
      const current = assigneeCounts.get(assigneeId) || { total: 0, resolved: 0 };

      current.total++;
      if (ticket.status === 'closed') {
        current.resolved++;
      }

      assigneeCounts.set(assigneeId, current);
    });

    const topAssignees = await Promise.all(
      Array.from(assigneeCounts.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(async ([userId, counts]) => {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true },
          });

          return {
            userId,
            username: user?.username || undefined,
            ticketCount: counts.total,
            resolvedCount: counts.resolved,
          };
        })
    );

    return {
      total,
      open: statusCounts['open'] || 0,
      inProgress: statusCounts['in_progress'] || 0,
      waitingUser: statusCounts['waiting_user'] || 0,
      closed: statusCounts['closed'] || 0,
      byPriority: {
        low: priorityCounts['low'] || 0,
        medium: priorityCounts['medium'] || 0,
        high: priorityCounts['high'] || 0,
        urgent: priorityCounts['urgent'] || 0,
      },
      avgResolutionTime,
      unassignedCount,
      recentTickets,
      topAssignees,
    };
  }
}

export const supportService = new SupportService();
