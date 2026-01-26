/**
 * Admin Service
 * Business logic for admin operations, audit log, and system settings
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { NotFoundError } from '@/lib/errors';
import type {
  AdminAuditLog,
  SystemSettings,
  CreateAuditLogInput,
  AuditLogListQuery,
  PaginatedAuditLogResponse,
  CreateSystemSettingInput,
  UpdateSystemSettingInput,
  PaginatedSystemSettingsResponse,
  DashboardStatistics,
} from './admin.types';

class AdminService {
  /**
   * Create audit log entry
   */
  async createAuditLog(input: CreateAuditLogInput): Promise<AdminAuditLog> {
    try {
      const auditLog = await prisma.adminAuditLog.create({
        data: {
          adminId: input.adminId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          changes: input.changes || undefined,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });

      logger.info('Audit log created', {
        auditLogId: auditLog.id,
        adminId: input.adminId,
        action: input.action,
        entityType: input.entityType,
      });

      return auditLog;
    } catch (error) {
      logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : 'Unknown error',
        input,
      });
      throw error;
    }
  }

  /**
   * List audit logs with filters
   */
  async listAuditLogs(query: AuditLogListQuery): Promise<PaginatedAuditLogResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        adminId,
        entityType,
        entityId,
        action,
        startDate,
        endDate,
        sortBy = 'createdAt',
        order = 'desc',
      } = query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (adminId) where.adminId = adminId;
      if (entityType) where.entityType = entityType;
      if (entityId) where.entityId = entityId;
      if (action) where.action = action;

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.adminAuditLog.findMany({
          where,
          orderBy: { [sortBy]: order },
          skip,
          take: limit,
        }),
        prisma.adminAuditLog.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.info('Audit logs listed', {
        page,
        limit,
        total,
        count: logs.length,
      });

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Failed to list audit logs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
      });
      throw error;
    }
  }

  /**
   * Create or update system setting
   */
  async upsertSystemSetting(input: CreateSystemSettingInput): Promise<SystemSettings> {
    try {
      const setting = await prisma.systemSettings.upsert({
        where: { key: input.key },
        update: {
          value: input.value,
          description: input.description,
        },
        create: {
          key: input.key,
          value: input.value,
          description: input.description,
        },
      });

      logger.info('System setting upserted', {
        key: setting.key,
      });

      return setting;
    } catch (error) {
      logger.error('Failed to upsert system setting', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key: input.key,
      });
      throw error;
    }
  }

  /**
   * Get system setting by key
   */
  async getSystemSetting(key: string): Promise<SystemSettings> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key },
      });

      if (!setting) {
        throw new NotFoundError(`System setting '${key}' not found`);
      }

      return setting;
    } catch (error) {
      logger.error('Failed to get system setting', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      throw error;
    }
  }

  /**
   * Update system setting
   */
  async updateSystemSetting(key: string, input: UpdateSystemSettingInput): Promise<SystemSettings> {
    try {
      // Check if exists
      const existing = await prisma.systemSettings.findUnique({
        where: { key },
      });

      if (!existing) {
        throw new NotFoundError(`System setting '${key}' not found`);
      }

      // Update
      const setting = await prisma.systemSettings.update({
        where: { key },
        data: {
          value: input.value,
          description: input.description !== undefined ? input.description : existing.description,
        },
      });

      logger.info('System setting updated', { key });

      return setting;
    } catch (error) {
      logger.error('Failed to update system setting', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      throw error;
    }
  }

  /**
   * Delete system setting
   */
  async deleteSystemSetting(key: string): Promise<void> {
    try {
      await prisma.systemSettings.delete({
        where: { key },
      });

      logger.info('System setting deleted', { key });
    } catch (error) {
      logger.error('Failed to delete system setting', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      throw error;
    }
  }

  /**
   * List all system settings
   */
  async listSystemSettings(
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedSystemSettingsResponse> {
    try {
      const skip = (page - 1) * limit;

      const [settings, total] = await Promise.all([
        prisma.systemSettings.findMany({
          orderBy: { key: 'asc' },
          skip,
          take: limit,
        }),
        prisma.systemSettings.count(),
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.info('System settings listed', {
        page,
        limit,
        total,
        count: settings.length,
      });

      return {
        settings,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Failed to list system settings', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStatistics(): Promise<DashboardStatistics> {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Users statistics
      const [
        totalUsers,
        activeUsers,
        bannedUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            subscriptions: {
              some: { status: 'active' },
            },
          },
        }),
        prisma.user.count({ where: { isBanned: true } }),
        prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
        prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
        prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      ]);

      // Subscriptions statistics
      const [totalSubscriptions, activeSubscriptions, expiredSubscriptions, cancelledSubscriptions] =
        await Promise.all([
          prisma.subscription.count(),
          prisma.subscription.count({ where: { status: 'active' } }),
          prisma.subscription.count({ where: { status: 'expired' } }),
          prisma.subscription.count({ where: { status: 'cancelled' } }),
        ]);

      // Payments statistics
      const [
        totalPayments,
        completedPayments,
        pendingPayments,
        failedPayments,
        totalRevenueResult,
        revenueTodayResult,
        revenueThisMonthResult,
      ] = await Promise.all([
        prisma.payment.count(),
        prisma.payment.count({ where: { status: 'completed' } }),
        prisma.payment.count({ where: { status: 'pending' } }),
        prisma.payment.count({ where: { status: 'failed' } }),
        prisma.payment.aggregate({
          where: { status: 'completed' },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            status: 'completed',
            completedAt: { gte: startOfToday },
          },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            status: 'completed',
            completedAt: { gte: startOfMonth },
          },
          _sum: { amount: true },
        }),
      ]);

      // Servers statistics
      const [
        totalServers,
        activeServers,
        offlineServers,
        maintenanceServers,
        overloadedServers,
        totalServerUsers,
      ] = await Promise.all([
        prisma.vpnServer.count(),
        prisma.vpnServer.count({ where: { status: 'active' } }),
        prisma.vpnServer.count({ where: { status: 'offline' } }),
        prisma.vpnServer.count({ where: { status: 'maintenance' } }),
        prisma.vpnServer.count({ where: { status: 'overloaded' } }),
        prisma.vpnServer.aggregate({
          _sum: { currentUsers: true },
        }),
      ]);

      // Support statistics
      const [totalTickets, openTickets, inProgressTickets, closedTickets] = await Promise.all([
        prisma.supportTicket.count(),
        prisma.supportTicket.count({ where: { status: 'open' } }),
        prisma.supportTicket.count({ where: { status: 'in_progress' } }),
        prisma.supportTicket.count({ where: { status: 'closed' } }),
      ]);

      // Promo codes statistics
      const [totalPromoCodes, activePromoCodes, totalPromoActivations] = await Promise.all([
        prisma.promoCode.count(),
        prisma.promoCode.count({ where: { isActive: true } }),
        prisma.promoActivation.count(),
      ]);

      // Referrals statistics
      const [totalEarningsResult, totalWithdrawalsResult, pendingWithdrawalsResult] =
        await Promise.all([
          prisma.referralTransaction.aggregate({
            _sum: { amount: true },
          }),
          prisma.withdrawalRequest.aggregate({
            where: { status: 'completed' },
            _sum: { amount: true },
          }),
          prisma.withdrawalRequest.aggregate({
            where: { status: { in: ['pending', 'approved'] } },
            _sum: { amount: true },
          }),
        ]);

      logger.info('Dashboard statistics retrieved');

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersThisWeek,
          newThisMonth: newUsersThisMonth,
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          expired: expiredSubscriptions,
          cancelled: cancelledSubscriptions,
        },
        payments: {
          total: totalPayments,
          completed: completedPayments,
          pending: pendingPayments,
          failed: failedPayments,
          totalRevenue: Number(totalRevenueResult._sum.amount || 0),
          revenueToday: Number(revenueTodayResult._sum.amount || 0),
          revenueThisMonth: Number(revenueThisMonthResult._sum.amount || 0),
        },
        servers: {
          total: totalServers,
          active: activeServers,
          offline: offlineServers,
          maintenance: maintenanceServers,
          overloaded: overloadedServers,
          totalUsers: totalServerUsers._sum.currentUsers || 0,
        },
        support: {
          totalTickets,
          openTickets,
          inProgressTickets,
          closedTickets,
        },
        promoCodes: {
          total: totalPromoCodes,
          active: activePromoCodes,
          totalActivations: totalPromoActivations,
        },
        referrals: {
          totalEarnings: Number(totalEarningsResult._sum.amount || 0),
          totalWithdrawals: Number(totalWithdrawalsResult._sum.amount || 0),
          pendingWithdrawals: Number(pendingWithdrawalsResult._sum.amount || 0),
        },
      };
    } catch (error) {
      logger.error('Failed to get dashboard statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const adminService = new AdminService();
