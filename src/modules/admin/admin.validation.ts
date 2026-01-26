/**
 * Admin Module Validation
 * Zod schemas for admin operations
 */

import { z } from 'zod';

// UUID schema
const uuidSchema = z.string().uuid();

// Create audit log schema
export const createAuditLogSchema = z.object({
  adminId: uuidSchema,
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(50),
  entityId: uuidSchema.optional(),
  changes: z.record(z.any()).optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
});

// List audit log schema
export const listAuditLogSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  adminId: uuidSchema.optional(),
  entityType: z.string().optional(),
  entityId: uuidSchema.optional(),
  action: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortBy: z.enum(['createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Create system setting schema
export const createSystemSettingSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores'),
  value: z.any(),
  description: z.string().max(500).optional(),
});

// Update system setting schema
export const updateSystemSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any().optional(),
  description: z.string().max(500).optional(),
});

// Get system setting schema
export const getSystemSettingSchema = z.object({
  key: z.string().min(1),
});

// Delete system setting schema
export const deleteSystemSettingSchema = z.object({
  key: z.string().min(1),
});

// List system settings schema
export const listSystemSettingsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
