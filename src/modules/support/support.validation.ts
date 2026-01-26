/**
 * Support Module Validation Schemas
 * Zod schemas for support ticket input validation
 */

import { z } from 'zod';
import { uuidSchema } from '@/lib/validation';

// Ticket status enum
export const ticketStatusSchema = z.enum(['open', 'in_progress', 'waiting_user', 'closed']);

// Ticket priority enum
export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

// Create ticket
export const createTicketSchema = z.object({
  userId: uuidSchema,
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
  priority: ticketPrioritySchema.optional().default('medium'),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

// Update ticket
export const updateTicketSchema = z.object({
  ticketId: uuidSchema,
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assignedTo: uuidSchema.optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

// Get ticket
export const getTicketSchema = z.object({
  ticketId: uuidSchema,
});

// Create reply
export const createReplySchema = z.object({
  ticketId: uuidSchema,
  userId: uuidSchema,
  message: z.string().min(1).max(5000),
  isStaff: z.boolean().optional().default(false),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;

// List tickets
export const listTicketsSchema = z.object({
  userId: uuidSchema.optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assignedTo: uuidSchema.optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type TicketListInput = z.infer<typeof listTicketsSchema>;

// Close ticket
export const closeTicketSchema = z.object({
  ticketId: uuidSchema,
});
