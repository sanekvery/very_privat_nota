/**
 * Referrals Module Validation Schemas
 * Zod schemas for referral input validation
 */

import { z } from 'zod';
import { uuidSchema } from '@/lib/validation';

// Get referral balance
export const getReferralBalanceSchema = z.object({
  userId: uuidSchema,
});

// Get referral statistics
export const getReferralStatisticsSchema = z.object({
  userId: uuidSchema,
});

// Get referral history
export const getReferralHistorySchema = z.object({
  userId: uuidSchema,
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
  sortBy: z.enum(['date', 'amount']).optional().default('date'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  type: z.enum(['earning', 'withdrawal']).optional(),
});

export type ReferralHistoryInput = z.infer<typeof getReferralHistorySchema>;

// Create withdrawal request
export const createWithdrawalSchema = z.object({
  userId: uuidSchema,
  amount: z.number().positive(),
  tonWalletAddress: z.string().min(48).max(48).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid TON address format'),
});

export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;

// Update withdrawal status (admin)
export const updateWithdrawalStatusSchema = z.object({
  withdrawalId: uuidSchema,
  status: z.enum(['pending', 'approved', 'rejected', 'completed']),
  rejectionReason: z.string().min(1).max(500).optional(),
  transactionHash: z.string().min(1).max(255).optional(),
});

export type UpdateWithdrawalStatusInput = z.infer<typeof updateWithdrawalStatusSchema>;

// Get withdrawal request
export const getWithdrawalSchema = z.object({
  withdrawalId: uuidSchema,
});

// List withdrawal requests (admin)
export const listWithdrawalsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'completed']).optional(),
  userId: uuidSchema.optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
});

export type ListWithdrawalsInput = z.infer<typeof listWithdrawalsSchema>;

// Update referral settings (admin)
export const updateReferralSettingsSchema = z.object({
  firstPaymentPercentage: z.number().min(0).max(100).optional(),
  recurringPercentage: z.number().min(0).max(100).optional(),
  minWithdrawalAmount: z.number().positive().optional(),
  withdrawalsEnabled: z.boolean().optional(),
});

export type UpdateReferralSettingsInput = z.infer<typeof updateReferralSettingsSchema>;

// Referral code validation
export const referralCodeSchema = z.string().min(6).max(20).regex(/^[A-Z0-9]+$/, 'Referral code must contain only uppercase letters and numbers');
