/**
 * Support Module Types
 * Domain types for support tickets and replies
 */

import type { SupportTicket, TicketReply } from '@prisma/client';

// User partial type for relations
export interface UserPartial {
  id: string;
  telegramId: bigint | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

// Ticket status type (from Prisma schema)
export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'closed';

// Ticket priority type (from Prisma schema)
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

// Support ticket with relations
export interface SupportTicketWithRelations extends SupportTicket {
  user?: UserPartial;
  replies?: TicketReplyWithRelations[];
  assignedToUser?: UserPartial;
}

// Ticket reply with relations
export interface TicketReplyWithRelations extends TicketReply {
  user?: UserPartial;
  ticket?: SupportTicket;
}

// Create ticket input
export interface CreateTicketInput {
  userId: string;
  subject: string;
  message: string;
  priority?: TicketPriority;
}

// Update ticket input
export interface UpdateTicketInput {
  ticketId: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
}

// Create reply input
export interface CreateReplyInput {
  ticketId: string;
  userId: string;
  message: string;
  isStaff?: boolean;
}

// Ticket list query
export interface TicketListQuery {
  userId?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  order?: 'asc' | 'desc';
}

// Ticket statistics
export interface TicketStatistics {
  total: number;
  open: number;
  inProgress: number;
  waitingUser: number;
  closed: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  avgResolutionTime: number; // milliseconds
  unassignedCount: number;
}

// Admin ticket statistics
export interface AdminTicketStatistics extends TicketStatistics {
  recentTickets: SupportTicketWithRelations[];
  topAssignees: Array<{
    userId: string;
    username?: string;
    ticketCount: number;
    resolvedCount: number;
  }>;
}
