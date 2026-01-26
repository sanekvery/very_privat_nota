/**
 * Subscriptions Module Validation Schemas
 * Zod schemas for subscription input validation
 */

import { z } from 'zod';
import { uuidSchema } from '@/lib/validation';

// Subscription status enum
export const subscriptionStatusSchema = z.enum([
  'active',
  'expired',
  'cancelled',
  'pending',
]);

// Create subscription
export const createSubscriptionSchema = z.object({
  userId: uuidSchema,
  planId: uuidSchema,
  startDate: z.coerce.date().optional(),
  paymentId: uuidSchema.optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

// Update subscription status
export const updateSubscriptionStatusSchema = z.object({
  subscriptionId: uuidSchema,
  status: subscriptionStatusSchema,
  cancelReason: z.string().max(500).optional(),
});

export type UpdateSubscriptionStatusInput = z.infer<
  typeof updateSubscriptionStatusSchema
>;

// Extend subscription
export const extendSubscriptionSchema = z.object({
  subscriptionId: uuidSchema,
  additionalDays: z.number().int().positive().max(365),
  paymentId: uuidSchema.optional(),
});

export type ExtendSubscriptionInput = z.infer<typeof extendSubscriptionSchema>;

// Cancel subscription
export const cancelSubscriptionSchema = z.object({
  subscriptionId: uuidSchema,
  reason: z.string().min(1).max(500).optional(),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

// Get subscription by ID
export const getSubscriptionSchema = z.object({
  subscriptionId: uuidSchema,
});

// Get user subscriptions
export const getUserSubscriptionsSchema = z.object({
  userId: uuidSchema,
  status: subscriptionStatusSchema.optional(),
});

// ==================
// Plan schemas (Admin)
// ==================

// Create plan
export const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  nameEn: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  descriptionEn: z.string().max(500).optional(),
  maxConfigs: z.number().int().positive().max(10),
  durationDays: z.number().int().positive().max(365),
  price: z.number().positive().max(10000),
  isCustom: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

// Update plan
export const updatePlanSchema = z.object({
  planId: uuidSchema,
  name: z.string().min(1).max(100).optional(),
  nameEn: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  descriptionEn: z.string().max(500).optional(),
  maxConfigs: z.number().int().positive().max(10).optional(),
  durationDays: z.number().int().positive().max(365).optional(),
  price: z.number().positive().max(10000).optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

// Get plan by ID
export const getPlanSchema = z.object({
  planId: uuidSchema,
});

// List plans query
export const listPlansSchema = z.object({
  isActive: z.boolean().optional(),
  isCustom: z.boolean().optional(),
});
