/**
 * Payments Module Types
 * Domain types for payments, TON integration, and promo codes
 */

import type { Payment, PromoCode } from '@prisma/client';

// Payment status and method from Prisma enums
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'ton' | 'promo_code' | 'manual';

// Payment with relations
export interface PaymentWithRelations extends Payment {
  user?: {
    id: string;
    username: string | null;
    telegramId: bigint | null;
  };
  promoCode: PromoCode | null;
}

// Create payment input
export interface CreatePaymentInput {
  userId: string;
  planId?: string;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  tonWalletAddress?: string;
  promoCodeId?: string;
  metadata?: Record<string, unknown>;
}

// Update payment status
export interface UpdatePaymentStatusInput {
  paymentId: string;
  status: PaymentStatus;
  tonTransactionHash?: string;
  failureReason?: string;
}

// TON payment verification
export interface TonPaymentVerification {
  isValid: boolean;
  amount?: number;
  from?: string;
  to?: string;
  transactionHash?: string;
  timestamp?: Date;
  error?: string;
}

// Payment webhook payload (from TON)
export interface TonWebhookPayload {
  transactionHash: string;
  from: string;
  to: string;
  amount: string; // in nanoTON
  comment?: string;
  timestamp: number;
}

// Promo code with relations
export interface PromoCodeWithRelations extends PromoCode {
  plan?: {
    id: string;
    name: string;
    price: number | any; // Decimal from Prisma
  };
  activations?: Array<{
    id: string;
    userId: string;
    promoCodeId?: string;
    activatedAt: Date;
  }>;
}

// Create promo code input (admin)
export interface CreatePromoCodeInput {
  code: string;
  planId: string;
  durationDays: number;
  maxUses?: number;
  expiresAt?: Date;
  createdBy?: string;
}

// Activate promo code input
export interface ActivatePromoCodeInput {
  code: string;
  userId: string;
}

// Promo code validation result
export interface PromoCodeValidation {
  isValid: boolean;
  promoCode?: PromoCode;
  reason?: string;
}

// Payment statistics
export interface PaymentStats {
  totalRevenue: number;
  totalCompleted: number;
  totalPending: number;
  totalFailed: number;
  revenueThisMonth: number;
  revenueToday: number;
  averagePaymentAmount: number;
  topPaymentMethod: PaymentMethod;
}

// User payment history
export interface UserPaymentHistory {
  userId: string;
  totalPaid: number;
  totalPayments: number;
  lastPaymentDate?: Date;
  payments: PaymentWithRelations[];
}

// TON wallet configuration
export interface TonWalletConfig {
  address: string; // Merchant wallet address
  mnemonic?: string; // For sending (optional, if automated)
  apiKey?: string; // TON API key
  network: 'mainnet' | 'testnet';
}

// TON transaction
export interface TonTransaction {
  hash: string;
  from: string;
  to: string;
  amount: number; // in TON
  fee: number;
  timestamp: Date;
  comment?: string;
  isConfirmed: boolean;
}

// Refund request
export interface RefundRequest {
  paymentId: string;
  reason: string;
  amount?: number; // Partial refund if specified
  adminId: string;
}
