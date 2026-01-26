/**
 * SUPPORT Module Exports
 */

// Services
export { supportService } from './support.service';

// Types
export type {
  UserPartial,
  TicketStatus,
  TicketPriority,
  SupportTicketWithRelations,
  TicketReplyWithRelations,
  CreateTicketInput,
  UpdateTicketInput,
  CreateReplyInput,
  TicketListQuery,
  TicketStatistics,
  AdminTicketStatistics,
} from './support.types';

// Validation schemas
export {
  ticketStatusSchema,
  ticketPrioritySchema,
  createTicketSchema,
  updateTicketSchema,
  getTicketSchema,
  createReplySchema,
  listTicketsSchema,
  closeTicketSchema,
} from './support.validation';

export type {
  CreateTicketInput as CreateTicketInputValidated,
  UpdateTicketInput as UpdateTicketInputValidated,
  CreateReplyInput as CreateReplyInputValidated,
  TicketListInput,
} from './support.validation';
