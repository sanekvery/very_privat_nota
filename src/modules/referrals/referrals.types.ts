/**
 * Referrals Module Types
 * Domain types for referral system, balances, and withdrawals
 */

import type { ReferralTransaction, WithdrawalRequest } from '@prisma/client';

// User partial type for relations
export interface UserPartial {
  id: string;
  telegramId: bigint | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

// Referral balance
export interface ReferralBalance {
  userId: string;
  totalEarned: number;      // Total earned all time
  availableBalance: number; // Current available balance
  pendingBalance: number;   // Pending from unprocessed withdrawals
  withdrawnTotal: number;   // Total withdrawn
  currency: string;         // 'TON'
}

// Referral statistics
export interface ReferralStatistics {
  userId: string;
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;  // Referrals with active subscriptions
  totalEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  balance: ReferralBalance;
  topReferrals: TopReferral[];
}

// Top referral user
export interface TopReferral {
  userId: string;
  username?: string;
  totalSpent: number;
  earnedFromUser: number;
  joinedAt: Date;
}

// Referral transaction with relations
export interface ReferralTransactionWithRelations extends ReferralTransaction {
  referrer?: UserPartial;
  referredUser?: UserPartial;
}

// Withdrawal request with relations
export interface WithdrawalRequestWithRelations extends WithdrawalRequest {
  user?: UserPartial;
}

// Create withdrawal input
export interface CreateWithdrawalInput {
  userId: string;
  amount: number;
  tonWalletAddress: string;
}

// Withdrawal status type (from Prisma schema)
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';

// Referral settings
export interface ReferralSettings {
  firstPaymentPercentage: number;   // e.g., 20
  recurringPercentage: number;      // e.g., 10
  minWithdrawalAmount: number;      // e.g., 5 TON
  withdrawalsEnabled: boolean;      // Flag to enable/disable withdrawals
}

// Referral history query
export interface ReferralHistoryQuery {
  userId: string;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'amount';
  order?: 'asc' | 'desc';
  type?: 'earning' | 'withdrawal';
}

// Referral earnings summary
export interface ReferralEarningsSummary {
  period: string;
  totalEarnings: number;
  transactionCount: number;
  uniqueReferrals: number;
  averagePerReferral: number;
}

// Admin referral statistics
export interface AdminReferralStatistics {
  totalReferrers: number;
  totalReferrals: number;
  totalEarnings: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  topReferrers: Array<{
    userId: string;
    username?: string;
    referralCount: number;
    totalEarnings: number;
  }>;
  recentTransactions: ReferralTransactionWithRelations[];
}
