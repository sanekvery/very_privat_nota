/**
 * Payments Module Validation Schemas
 * Zod schemas for payment input validation
 */

import { z } from 'zod';
import { uuidSchema } from '@/lib/validation';

// Payment status enum
export const paymentStatusSchema = z.enum([
  'pending',
  'completed',
  'failed',
  'refunded',
]);

// Payment method enum
export const paymentMethodSchema = z.enum(['ton', 'promo_code', 'manual']);

// Create payment
export const createPaymentSchema = z.object({
  userId: uuidSchema,
  planId: uuidSchema.optional(),
  amount: z.number().positive().max(100000),
  currency: z.string().length(3).optional().default('TON'),
  method: paymentMethodSchema,
  tonWalletAddress: z
    .string()
    .regex(/^[A-Za-z0-9_-]{48}$/, 'Invalid TON wallet address')
    .optional(),
  promoCodeId: uuidSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

// Update payment status
export const updatePaymentStatusSchema = z.object({
  paymentId: uuidSchema,
  status: paymentStatusSchema,
  tonTransactionHash: z.string().optional(),
  failureReason: z.string().max(500).optional(),
});

export type UpdatePaymentStatusInput = z.infer<
  typeof updatePaymentStatusSchema
>;

// Get payment
export const getPaymentSchema = z.object({
  paymentId: uuidSchema,
});

// List payments query
export const listPaymentsSchema = z.object({
  userId: uuidSchema.optional(),
  status: paymentStatusSchema.optional(),
  method: paymentMethodSchema.optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
});

// TON webhook payload
export const tonWebhookSchema = z.object({
  transactionHash: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  amount: z.string().regex(/^\d+$/), // nanoTON as string
  comment: z.string().optional(),
  timestamp: z.number().int().positive(),
});

export type TonWebhookPayload = z.infer<typeof tonWebhookSchema>;

// ==================
// Promo Code schemas
// ==================

// Create promo code (admin)
export const createPromoCodeSchema = z.object({
  code: z
    .string()
    .min(4)
    .max(20)
    .regex(/^[A-Z0-9]+$/, 'Promo code must be uppercase alphanumeric'),
  planId: uuidSchema,
  durationDays: z.number().int().positive().max(365),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.coerce.date().optional(),
  createdBy: uuidSchema.optional(),
});

export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;

// Activate promo code
export const activatePromoCodeSchema = z.object({
  code: z.string().min(1).max(20),
  userId: uuidSchema,
});

export type ActivatePromoCodeInput = z.infer<typeof activatePromoCodeSchema>;

// Update promo code (admin)
export const updatePromoCodeSchema = z.object({
  promoCodeId: uuidSchema,
  maxUses: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.coerce.date().optional(),
});

export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeSchema>;

// Get promo code
export const getPromoCodeSchema = z.object({
  code: z.string().min(1).max(20),
});

// Validate promo code
export const validatePromoCodeSchema = z.object({
  code: z.string().min(1).max(20),
  userId: uuidSchema.optional(),
});

// Refund payment (admin)
export const refundPaymentSchema = z.object({
  paymentId: uuidSchema,
  reason: z.string().min(1).max(500),
  amount: z.number().positive().optional(),
  adminId: uuidSchema,
});

export type RefundRequest = z.infer<typeof refundPaymentSchema>;
