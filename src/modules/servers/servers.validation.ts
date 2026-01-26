/**
 * Servers Module Validation Schemas
 * Zod schemas for server input validation
 */

import { z } from 'zod';
import { uuidSchema } from '@/lib/validation';

// Server status enum
export const serverStatusSchema = z.enum(['active', 'maintenance', 'offline']);

// CIDR validation
const cidrSchema = z
  .string()
  .regex(
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[12][0-9]|3[0-2])$/,
    'Invalid CIDR notation (e.g. 10.0.1.0/24)'
  );

// Create server
export const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535).optional().default(443),
  publicKey: z.string().min(1).max(255),
  endpoint: z.string().min(1).max(255), // host:port format
  city: z.string().min(1).max(100).optional(),
  countryCode: z.string().length(2).toUpperCase(), // ISO 3166-1 alpha-2
  listenPort: z.number().int().min(1).max(65535).optional().default(51820),
  subnet: cidrSchema,
  maxUsers: z.number().int().positive().max(10000).optional().default(1000),
  agentApiUrl: z.string().url(),
  agentBearerToken: z.string().min(1),
  dns: z.string().optional().default('1.1.1.1,8.8.8.8'),
  priority: z.number().int().min(0).max(1000).optional().default(100),
  isActive: z.boolean().optional().default(true),
});

export type CreateServerInput = z.infer<typeof createServerSchema>;

// Update server
export const updateServerSchema = z.object({
  serverId: uuidSchema,
  name: z.string().min(1).max(100).optional(),
  host: z.string().min(1).max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  publicKey: z.string().min(1).max(255).optional(),
  endpoint: z.string().min(1).max(255).optional(),
  city: z.string().min(1).max(100).optional(),
  countryCode: z.string().length(2).toUpperCase().optional(),
  listenPort: z.number().int().min(1).max(65535).optional(),
  subnet: cidrSchema.optional(),
  maxUsers: z.number().int().positive().max(10000).optional(),
  agentApiUrl: z.string().url().optional(),
  agentBearerToken: z.string().min(1).optional(),
  dns: z.string().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
  status: serverStatusSchema.optional(),
});

export type UpdateServerInput = z.infer<typeof updateServerSchema>;

// Get server
export const getServerSchema = z.object({
  serverId: uuidSchema,
});

// List servers query
export const listServersSchema = z.object({
  status: serverStatusSchema.optional(),
  countryCode: z.string().length(2).toUpperCase().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
});

// Server selection criteria
export const serverSelectionSchema = z.object({
  preferredCountry: z.string().length(2).toUpperCase().optional(),
  maxCapacity: z.number().min(0).max(100).optional().default(90), // Max 90% capacity
  requireActive: z.boolean().optional().default(true),
  excludeServerIds: z.array(uuidSchema).optional(),
});

export type ServerSelectionInput = z.infer<typeof serverSelectionSchema>;

// Health check
export const healthCheckSchema = z.object({
  serverId: uuidSchema,
});
