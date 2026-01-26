/**
 * Promo Module Validation
 * Zod schemas for promo code operations
 */

import { z } from 'zod';

// UUID schema
const uuidSchema = z.string().uuid();

// Create promo code schema
export const createPromoCodeSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code must be at most 50 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, underscores, and hyphens'),
  planId: uuidSchema,
  durationDays: z.number().int().positive().max(365, 'Duration cannot exceed 365 days'),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.coerce.date().optional(),
  createdBy: uuidSchema,
});

// Update promo code schema
export const updatePromoCodeSchema = z.object({
  promoCodeId: uuidSchema,
  code: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/)
    .optional(),
  durationDays: z.number().int().positive().max(365).optional(),
  maxUses: z.number().int().positive().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Get promo code by ID schema
export const getPromoCodeByIdSchema = z.object({
  promoCodeId: uuidSchema,
});

// Get promo code by code schema
export const getPromoCodeByCodeSchema = z.object({
  code: z.string().min(1),
});

// Delete promo code schema
export const deletePromoCodeSchema = z.object({
  promoCodeId: uuidSchema,
});

// Activate promo code schema
export const activatePromoCodeSchema = z.object({
  code: z.string().min(1),
  userId: uuidSchema,
});

// Validate promo code schema
export const validatePromoCodeSchema = z.object({
  code: z.string().min(1),
});

// List promo codes schema
export const listPromoCodesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.coerce.boolean().optional(),
  planId: uuidSchema.optional(),
  sortBy: z.enum(['createdAt', 'expiresAt', 'usedCount']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// List promo activations schema
export const listPromoActivationsSchema = z.object({
  promoCodeId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['activatedAt']).default('activatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
