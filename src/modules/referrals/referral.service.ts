/**
 * Referral Service
 * Manages referral system, balances, and withdrawal requests
 *
 * Responsibilities:
 * - Calculate referral balances
 * - Provide referral statistics
 * - Handle withdrawal requests
 * - Manage referral settings
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type {
  ReferralBalance,
  ReferralStatistics,
  TopReferral,
  ReferralTransactionWithRelations,
  WithdrawalRequestWithRelations,
  CreateWithdrawalInput,
  ReferralSettings,
  ReferralHistoryQuery,
  ReferralEarningsSummary,
  AdminReferralStatistics,
} from './referrals.types';
import type { WithdrawalRequest } from '@prisma/client';

export class ReferralService {
  /**
   * Get referral balance for user
   */
  async getReferralBalance(userId: string): Promise<ReferralBalance> {
    // Get all earnings
    const earnings = await prisma.referralTransaction.findMany({
      where: { referrerId: userId },
    });

    const totalEarned = earnings.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    // Get all withdrawals
    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId },
    });

    const withdrawnTotal = withdrawals
      .filter((w) => w.status === 'completed')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const pendingBalance = withdrawals
      .filter((w) => w.status === 'pending' || w.status === 'approved')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const availableBalance = totalEarned - withdrawnTotal - pendingBalance;

    return {
      userId,
      totalEarned,
      availableBalance,
      pendingBalance,
      withdrawnTotal,
      currency: 'TON',
    };
  }

  /**
   * Get referral statistics for user
   */
  async getReferralStatistics(userId: string): Promise<ReferralStatistics> {
    // Get user with referral code
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user || !user.referralCode) {
      throw new NotFoundError('User', userId);
    }

    // Get all referrals
    const referrals = await prisma.user.findMany({
      where: { referredBy: user.referralCode },
      select: {
        id: true,
        username: true,
        createdAt: true,
        subscriptions: {
          where: { status: 'active' },
          select: { id: true },
        },
        payments: {
          where: { status: 'completed' },
          select: { amount: true },
        },
      },
    });

    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter(
      (r) => r.subscriptions.length > 0
    ).length;

    // Get earnings
    const transactions = await prisma.referralTransaction.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
    });

    const totalEarnings = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    // This month earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthEarnings = transactions
      .filter((t) => t.createdAt >= startOfMonth)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Last month earnings
    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
    const endOfLastMonth = new Date(startOfMonth);
    endOfLastMonth.setMilliseconds(-1);

    const lastMonthEarnings = transactions
      .filter(
        (t) => t.createdAt >= startOfLastMonth && t.createdAt < startOfMonth
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Top referrals
    const topReferrals: TopReferral[] = referrals
      .map((referral) => {
        const totalSpent = referral.payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        );

        const earnedFromUser = transactions
          .filter((t) => t.referredUserId === referral.id)
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
          userId: referral.id,
          username: referral.username || undefined,
          totalSpent,
          earnedFromUser,
          joinedAt: referral.createdAt,
        };
      })
      .sort((a, b) => b.earnedFromUser - a.earnedFromUser)
      .slice(0, 10);

    // Get balance
    const balance = await this.getReferralBalance(userId);

    return {
      userId,
      referralCode: user.referralCode,
      totalReferrals,
      activeReferrals,
      totalEarnings,
      thisMonthEarnings,
      lastMonthEarnings,
      balance,
      topReferrals,
    };
  }

  /**
   * Get referral history (earnings and withdrawals)
   */
  async getReferralHistory(
    query: ReferralHistoryQuery
  ): Promise<{
    transactions: ReferralTransactionWithRelations[];
    withdrawals: WithdrawalRequestWithRelations[];
    total: number;
  }> {
    const { userId, limit = 20, offset = 0, order = 'desc', type } = query;

    let transactions: ReferralTransactionWithRelations[] = [];
    let withdrawals: WithdrawalRequestWithRelations[] = [];

    // Get earnings
    if (!type || type === 'earning') {
      transactions = await prisma.referralTransaction.findMany({
        where: { referrerId: userId },
        include: {
          referredUser: {
            select: {
              id: true,
              telegramId: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: order,
        },
        take: limit,
        skip: offset,
      });
    }

    // Get withdrawals
    if (!type || type === 'withdrawal') {
      withdrawals = await prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: {
          createdAt: order,
        },
        take: limit,
        skip: offset,
      });
    }

    const total = transactions.length + withdrawals.length;

    return {
      transactions,
      withdrawals,
      total,
    };
  }

  /**
   * Create withdrawal request
   */
  async createWithdrawal(input: CreateWithdrawalInput): Promise<WithdrawalRequest> {
    const { userId, amount, tonWalletAddress } = input;

    // Check if withdrawals are enabled
    const settings = await this.getReferralSettings();
    if (!settings.withdrawalsEnabled) {
      throw new ValidationError('Withdrawals are currently disabled');
    }

    // Check minimum withdrawal amount
    if (amount < settings.minWithdrawalAmount) {
      throw new ValidationError(
        `Minimum withdrawal amount is ${settings.minWithdrawalAmount} TON`
      );
    }

    // Check available balance
    const balance = await this.getReferralBalance(userId);
    if (balance.availableBalance < amount) {
      throw new ValidationError(
        `Insufficient balance. Available: ${balance.availableBalance} TON`
      );
    }

    // Create withdrawal request
    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        userId,
        amount,
        tonWalletAddress,
        status: 'pending',
      },
    });

    logger.info('Withdrawal request created', {
      withdrawalId: withdrawal.id,
      userId,
      amount,
    });

    return withdrawal;
  }

  /**
   * Get withdrawal request by ID
   */
  async getWithdrawal(withdrawalId: string): Promise<WithdrawalRequestWithRelations> {
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!withdrawal) {
      throw new NotFoundError('WithdrawalRequest', withdrawalId);
    }

    return withdrawal;
  }

  /**
   * Update withdrawal status (admin)
   */
  async updateWithdrawalStatus(
    withdrawalId: string,
    status: 'pending' | 'approved' | 'rejected' | 'completed',
    metadata?: {
      rejectionReason?: string;
      transactionHash?: string;
    }
  ): Promise<WithdrawalRequest> {
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundError('WithdrawalRequest', withdrawalId);
    }

    const updateData: any = {
      status,
    };

    if (status === 'completed') {
      updateData.processedAt = new Date();
      if (metadata?.transactionHash) {
        updateData.tonTransactionHash = metadata.transactionHash;
      }
    }

    if (status === 'rejected' && metadata?.rejectionReason) {
      updateData.rejectionReason = metadata.rejectionReason;
    }

    const updated = await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: updateData,
    });

    logger.info('Withdrawal status updated', {
      withdrawalId,
      status,
      transactionHash: metadata?.transactionHash,
    });

    return updated;
  }

  /**
   * List withdrawal requests (admin)
   */
  async listWithdrawals(params: {
    status?: 'pending' | 'approved' | 'rejected' | 'completed';
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ withdrawals: WithdrawalRequestWithRelations[]; total: number }> {
    const { status, userId, limit = 20, offset = 0 } = params;

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),

      prisma.withdrawalRequest.count({ where }),
    ]);

    return { withdrawals, total };
  }

  /**
   * Get referral settings
   */
  async getReferralSettings(): Promise<ReferralSettings> {
    const settings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: [
            'referral_first_payment_percentage',
            'referral_recurring_percentage',
            'referral_min_withdrawal_amount',
            'referral_withdrawals_enabled',
          ],
        },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    return {
      firstPaymentPercentage: Number(
        settingsMap.get('referral_first_payment_percentage') || '20'
      ),
      recurringPercentage: Number(
        settingsMap.get('referral_recurring_percentage') || '10'
      ),
      minWithdrawalAmount: Number(
        settingsMap.get('referral_min_withdrawal_amount') || '5'
      ),
      withdrawalsEnabled:
        settingsMap.get('referral_withdrawals_enabled') === 'true',
    };
  }

  /**
   * Update referral settings (admin)
   */
  async updateReferralSettings(
    updates: Partial<ReferralSettings>
  ): Promise<ReferralSettings> {
    const settingsToUpdate: Array<{ key: string; value: string }> = [];

    if (updates.firstPaymentPercentage !== undefined) {
      settingsToUpdate.push({
        key: 'referral_first_payment_percentage',
        value: String(updates.firstPaymentPercentage),
      });
    }

    if (updates.recurringPercentage !== undefined) {
      settingsToUpdate.push({
        key: 'referral_recurring_percentage',
        value: String(updates.recurringPercentage),
      });
    }

    if (updates.minWithdrawalAmount !== undefined) {
      settingsToUpdate.push({
        key: 'referral_min_withdrawal_amount',
        value: String(updates.minWithdrawalAmount),
      });
    }

    if (updates.withdrawalsEnabled !== undefined) {
      settingsToUpdate.push({
        key: 'referral_withdrawals_enabled',
        value: String(updates.withdrawalsEnabled),
      });
    }

    // Update settings
    for (const setting of settingsToUpdate) {
      await prisma.systemSettings.upsert({
        where: { key: setting.key },
        create: setting,
        update: { value: setting.value },
      });
    }

    logger.info('Referral settings updated', { updates });

    return this.getReferralSettings();
  }

  /**
   * Get earnings summary for period
   */
  async getEarningsSummary(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<ReferralEarningsSummary> {
    const timeRanges = {
      day: 86400000,
      week: 604800000,
      month: 2592000000,
      year: 31536000000,
    };

    const since = new Date(Date.now() - timeRanges[period]);

    const transactions = await prisma.referralTransaction.findMany({
      where: {
        referrerId: userId,
        createdAt: { gte: since },
      },
    });

    const totalEarnings = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    const uniqueReferrals = new Set(
      transactions.map((t) => t.referredUserId)
    ).size;

    const averagePerReferral =
      uniqueReferrals > 0 ? totalEarnings / uniqueReferrals : 0;

    return {
      period,
      totalEarnings,
      transactionCount: transactions.length,
      uniqueReferrals,
      averagePerReferral,
    };
  }

  /**
   * Get admin referral statistics
   */
  async getAdminStatistics(): Promise<AdminReferralStatistics> {
    // Total referrers (users who have referral code and have referrals)
    const usersWithReferrals = await prisma.user.findMany({
      where: {
        referralCode: {
          not: null as any,
        },
      },
      select: {
        id: true,
        referralCode: true,
      },
    });

    const totalReferrers = usersWithReferrals.filter(async (user) => {
      const count = await prisma.user.count({
        where: { referredBy: user.referralCode! },
      });
      return count > 0;
    }).length;

    // Total referrals
    const totalReferrals = await prisma.user.count({
      where: {
        referredBy: {
          not: null as any,
        },
      },
    });

    // Total earnings
    const allTransactions = await prisma.referralTransaction.findMany();
    const totalEarnings = allTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    // Total withdrawals
    const completedWithdrawals = await prisma.withdrawalRequest.findMany({
      where: { status: 'completed' },
    });
    const totalWithdrawals = completedWithdrawals.reduce(
      (sum, w) => sum + Number(w.amount),
      0
    );

    // Pending withdrawals
    const pendingWithdrawalsData = await prisma.withdrawalRequest.findMany({
      where: { status: { in: ['pending', 'approved'] } },
    });
    const pendingWithdrawals = pendingWithdrawalsData.reduce(
      (sum, w) => sum + Number(w.amount),
      0
    );

    // Top referrers
    const topReferrersData = await Promise.all(
      usersWithReferrals.map(async (user) => {
        const referralCount = await prisma.user.count({
          where: { referredBy: user.referralCode! },
        });

        const earnings = await prisma.referralTransaction.findMany({
          where: { referrerId: user.id },
        });

        const totalEarnings = earnings.reduce(
          (sum, t) => sum + Number(t.amount),
          0
        );

        const userDetails = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true },
        });

        return {
          userId: user.id,
          username: userDetails?.username || undefined,
          referralCount,
          totalEarnings,
        };
      })
    );

    const topReferrers = topReferrersData
      .filter((r) => r.referralCount > 0)
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 10);

    // Recent transactions
    const recentTransactions = await prisma.referralTransaction.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        referrer: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        referredUser: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      totalReferrers,
      totalReferrals,
      totalEarnings,
      totalWithdrawals,
      pendingWithdrawals,
      topReferrers,
      recentTransactions,
    };
  }
}

export const referralService = new ReferralService();
