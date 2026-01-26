/**
 * Payment Service
 * Manages payments, transactions, and payment lifecycle
 *
 * Responsibilities:
 * - Create and process payments
 * - Verify TON transactions
 * - Handle payment webhooks
 * - Process refunds
 * - Track payment statistics
 * - Integration with subscription creation
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  NotFoundError,
  ValidationError,
  ExternalServiceError,
} from '@/lib/errors';
import { tonService } from './ton.service';
import { subscriptionService } from '@/modules/subscriptions/subscription.service';
import type { Payment, PaymentStatus } from '@prisma/client';
import type {
  CreatePaymentInput,
  UpdatePaymentStatusInput,
  PaymentWithRelations,
  PaymentStats,
  UserPaymentHistory,
  TonWebhookPayload,
  RefundRequest,
} from './payments.types';

export class PaymentService {
  /**
   * Create new payment
   */
  async createPayment(input: CreatePaymentInput): Promise<Payment> {
    const {
      userId,
      planId,
      amount,
      currency = 'TON',
      method,
      tonWalletAddress,
      promoCodeId,
      metadata,
    } = input;

    // Validate amount
    if (amount <= 0) {
      throw new ValidationError('Payment amount must be positive');
    }

    // Validate TON wallet if method is TON
    if (method === 'ton' && tonWalletAddress) {
      if (!tonService.isValidAddress(tonWalletAddress)) {
        throw new ValidationError('Invalid TON wallet address');
      }
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        planId,
        amount,
        currency,
        method,
        status: 'pending',
        tonWalletAddress,
        promoCodeId,
        metadata: metadata as any,
      },
    });

    logger.info('Payment created', {
      paymentId: payment.id,
      userId,
      amount: amount.toString(),
      method,
    });

    return payment;
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<PaymentWithRelations> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            telegramId: true,
          },
        },
        promoCode: true,
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment', paymentId);
    }

    return payment;
  }

  /**
   * Get user's payment history
   */
  async getUserPayments(
    userId: string,
    filters?: {
      status?: PaymentStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<UserPaymentHistory> {
    const { status, limit = 20, offset = 0 } = filters || {};

    const [payments, totalPaidAgg] = await Promise.all([
      prisma.payment.findMany({
        where: {
          userId,
          ...(status && { status }),
        },
        include: {
          promoCode: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),

      prisma.payment.aggregate({
        where: {
          userId,
          status: 'completed',
        },
        _sum: {
          amount: true,
        },
        _count: true,
      }),
    ]);

    const lastPayment = payments.length > 0 ? payments[0] : null;

    return {
      userId,
      totalPaid: Number(totalPaidAgg._sum.amount || 0),
      totalPayments: totalPaidAgg._count,
      lastPaymentDate: lastPayment?.createdAt,
      payments,
    };
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    input: UpdatePaymentStatusInput
  ): Promise<Payment> {
    const { paymentId, status, tonTransactionHash, failureReason } = input;

    const existingPayment = await this.getPaymentById(paymentId);

    // Prevent status changes from completed/refunded
    if (
      existingPayment.status === 'completed' &&
      status !== 'refunded'
    ) {
      throw new ValidationError(
        'Cannot change status of completed payment (except refund)'
      );
    }

    if (existingPayment.status === 'refunded') {
      throw new ValidationError('Cannot change status of refunded payment');
    }

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        ...(tonTransactionHash && { tonTransactionHash }),
        ...(failureReason && { failureReason }),
        ...(status === 'completed' && { completedAt: new Date() }),
      },
    });

    logger.info('Payment status updated', {
      paymentId,
      oldStatus: existingPayment.status,
      newStatus: status,
    });

    // If payment completed, create subscription
    if (status === 'completed' && existingPayment.status !== 'completed') {
      await this.handlePaymentCompleted(payment);
    }

    return payment;
  }

  /**
   * Handle completed payment
   * Create subscription and process referrals
   */
  private async handlePaymentCompleted(payment: Payment): Promise<void> {
    if (!payment.planId) {
      logger.warn('Payment completed without planId', {
        paymentId: payment.id,
      });
      return;
    }

    try {
      // Create subscription
      await subscriptionService.createSubscription({
        userId: payment.userId,
        planId: payment.planId,
        paymentId: payment.id,
      });

      logger.info('Subscription created from payment', {
        paymentId: payment.id,
        userId: payment.userId,
      });

      // Process referral commission (if applicable)
      await this.processReferralCommission(payment);
    } catch (error) {
      logger.error('Failed to handle payment completion', {
        paymentId: payment.id,
        error: error instanceof Error ? error.message : 'Unknown',
      });

      // Update payment status to failed if subscription creation failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          failureReason: 'Failed to create subscription',
        },
      });
    }
  }

  /**
   * Process referral commission
   */
  private async processReferralCommission(payment: Payment): Promise<void> {
    // Get user with referrer info
    const user = await prisma.user.findUnique({
      where: { id: payment.userId },
      select: {
        referredBy: true,
      },
    });

    if (!user?.referredBy) {
      // User has no referrer
      return;
    }

    // Find referrer by referral code
    const referrer = await prisma.user.findUnique({
      where: { referralCode: user.referredBy },
    });

    if (!referrer) {
      logger.warn('Referrer not found', {
        referralCode: user.referredBy,
        paymentId: payment.id,
      });
      return;
    }

    // Check if this is first payment
    const previousPayments = await prisma.payment.count({
      where: {
        userId: payment.userId,
        status: 'completed',
        id: { not: payment.id },
      },
    });

    const isFirstPayment = previousPayments === 0;

    // Get commission percentage from system settings
    const settingKey = isFirstPayment
      ? 'referral_first_payment_percentage'
      : 'referral_recurring_percentage';

    const setting = await prisma.systemSettings.findUnique({
      where: { key: settingKey },
    });

    if (!setting) {
      logger.warn('Referral setting not found', { key: settingKey });
      return;
    }

    const percentage = Number(setting.value);
    const commissionAmount = Number(payment.amount) * (percentage / 100);

    // Create referral transaction
    await prisma.referralTransaction.create({
      data: {
        referrerId: referrer.id,
        referredUserId: payment.userId,
        paymentId: payment.id,
        amount: commissionAmount,
        percentage,
        isFirstPayment,
      },
    });

    // Update referrer balance
    await prisma.user.update({
      where: { id: referrer.id },
      data: {
        referralBalance: {
          increment: commissionAmount,
        },
        totalEarned: {
          increment: commissionAmount,
        },
      },
    });

    logger.info('Referral commission processed', {
      paymentId: payment.id,
      referrerId: referrer.id,
      amount: commissionAmount,
      percentage,
      isFirstPayment,
    });
  }

  /**
   * Verify TON payment and update status
   */
  async verifyTonPayment(
    paymentId: string,
    transactionHash: string
  ): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId);

    if (payment.method !== 'ton') {
      throw new ValidationError('Payment method is not TON');
    }

    if (payment.status === 'completed') {
      throw new ValidationError('Payment already completed');
    }

    // Verify transaction with TON blockchain
    const verification = await tonService.verifyTransaction(
      transactionHash,
      Number(payment.amount),
      tonService.getMerchantAddress()
    );

    if (!verification.isValid) {
      logger.warn('TON payment verification failed', {
        paymentId,
        transactionHash,
        error: verification.error,
      });

      throw new ExternalServiceError(
        'TON',
        verification.error || 'Transaction verification failed'
      );
    }

    // Update payment status to completed
    return await this.updatePaymentStatus({
      paymentId,
      status: 'completed',
      tonTransactionHash: transactionHash,
    });
  }

  /**
   * Handle TON webhook
   * Called when TON transaction is detected
   */
  async handleTonWebhook(payload: TonWebhookPayload): Promise<void> {
    const { transactionHash, amount, to, comment } = payload;

    // Convert nanoTON to TON
    const amountTon = tonService.nanoToTon(amount);

    // Verify recipient is our merchant wallet
    const merchantAddress = tonService.getMerchantAddress();
    if (to !== merchantAddress) {
      logger.warn('TON webhook for wrong recipient', { to, expected: merchantAddress });
      return;
    }

    // Try to find pending payment by amount and comment (if comment contains paymentId)
    let payment: Payment | null = null;

    if (comment) {
      // Extract payment ID from comment if present
      const paymentIdMatch = comment.match(/payment[_-]?([a-f0-9-]{36})/i);
      if (paymentIdMatch) {
        payment = await prisma.payment.findUnique({
          where: { id: paymentIdMatch[1] },
        });
      }
    }

    // If not found by comment, try to find by amount
    if (!payment) {
      payment = await prisma.payment.findFirst({
        where: {
          amount: amountTon,
          method: 'ton',
          status: 'pending',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    if (!payment) {
      logger.warn('No matching payment found for TON webhook', {
        transactionHash,
        amount: amountTon,
      });
      return;
    }

    // Update payment
    await this.updatePaymentStatus({
      paymentId: payment.id,
      status: 'completed',
      tonTransactionHash: transactionHash,
    });

    logger.info('TON webhook processed successfully', {
      paymentId: payment.id,
      transactionHash,
      amount: amountTon,
    });
  }

  /**
   * Refund payment (admin)
   */
  async refundPayment(request: RefundRequest): Promise<Payment> {
    const { paymentId, reason, amount, adminId } = request;

    const payment = await this.getPaymentById(paymentId);

    if (payment.status !== 'completed') {
      throw new ValidationError('Can only refund completed payments');
    }

    const refundAmount = amount || Number(payment.amount);

    if (refundAmount > Number(payment.amount)) {
      throw new ValidationError('Refund amount exceeds payment amount');
    }

    // Update payment status
    const updated = await this.updatePaymentStatus({
      paymentId,
      status: 'refunded',
      failureReason: reason,
    });

    logger.info('Payment refunded', {
      paymentId,
      refundAmount,
      reason,
      adminId,
    });

    // TODO: Initiate TON refund transaction
    // This requires sending TON back to user's wallet

    return updated;
  }

  /**
   * Get payment statistics (admin)
   */
  async getPaymentStats(): Promise<PaymentStats> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalRevenueAgg,
      totalCompleted,
      totalPending,
      totalFailed,
      revenueThisMonthAgg,
      revenueTodayAgg,
      avgPaymentAgg,
      topMethodResult,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true },
      }),

      prisma.payment.count({ where: { status: 'completed' } }),
      prisma.payment.count({ where: { status: 'pending' } }),
      prisma.payment.count({ where: { status: 'failed' } }),

      prisma.payment.aggregate({
        where: { status: 'completed', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),

      prisma.payment.aggregate({
        where: { status: 'completed', createdAt: { gte: dayStart } },
        _sum: { amount: true },
      }),

      prisma.payment.aggregate({
        where: { status: 'completed' },
        _avg: { amount: true },
      }),

      prisma.payment.groupBy({
        by: ['method'],
        _count: true,
        orderBy: { _count: { method: 'desc' } },
        take: 1,
      }),
    ]);

    return {
      totalRevenue: Number(totalRevenueAgg._sum.amount || 0),
      totalCompleted,
      totalPending,
      totalFailed,
      revenueThisMonth: Number(revenueThisMonthAgg._sum.amount || 0),
      revenueToday: Number(revenueTodayAgg._sum.amount || 0),
      averagePaymentAmount: Number(avgPaymentAgg._avg.amount || 0),
      topPaymentMethod: topMethodResult[0]?.method || 'ton',
    };
  }

  /**
   * Delete payment (admin only)
   * Hard delete - use with caution!
   */
  async deletePayment(paymentId: string): Promise<void> {
    const payment = await this.getPaymentById(paymentId);

    if (payment.status === 'completed') {
      throw new ValidationError(
        'Cannot delete completed payment. Use refund instead.'
      );
    }

    await prisma.payment.delete({
      where: { id: paymentId },
    });

    logger.warn('Payment hard deleted', { paymentId });
  }
}

export const paymentService = new PaymentService();
