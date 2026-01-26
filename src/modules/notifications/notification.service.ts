/**
 * Notification Service
 * Manages user notifications
 *
 * Responsibilities:
 * - Create and send notifications to users
 * - Broadcast notifications to multiple users
 * - Mark notifications as read
 * - Provide notification statistics
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { NotFoundError, ForbiddenError } from '@/lib/errors';
import type {
  NotificationWithRelations,
  CreateNotificationInput,
  CreateBroadcastNotificationInput,
  NotificationListQuery,
  NotificationStatistics,
  AdminNotificationStatistics,
  NotificationType,
} from './notifications.types';

export class NotificationService {
  /**
   * Create notification for single user
   */
  async createNotification(
    input: CreateNotificationInput
  ): Promise<NotificationWithRelations> {
    const { userId, type, title, titleEn, message, messageEn, metadata } = input;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        titleEn,
        message,
        messageEn,
        metadata: metadata || undefined,
        isRead: false,
      },
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

    logger.info('Notification created', {
      notificationId: notification.id,
      userId,
      type,
    });

    return notification;
  }

  /**
   * Create broadcast notification for multiple users
   */
  async createBroadcastNotification(
    input: CreateBroadcastNotificationInput
  ): Promise<{ created: number; notifications: NotificationWithRelations[] }> {
    const { type, title, titleEn, message, messageEn, metadata, userFilter } = input;

    // Build user query based on filter
    const userWhere: any = {};

    if (userFilter?.hasActiveSubscription) {
      userWhere.subscriptions = {
        some: {
          status: 'active',
        },
      };
    }

    if (userFilter?.isAdmin !== undefined) {
      userWhere.isAdmin = userFilter.isAdmin;
    }

    // Get target users
    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true },
    });

    // Create notifications for all users
    const notifications = await Promise.all(
      users.map((user) =>
        prisma.notification.create({
          data: {
            userId: user.id,
            type,
            title,
            titleEn,
            message,
            messageEn,
            metadata: metadata || undefined,
            isRead: false,
          },
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
        })
      )
    );

    logger.info('Broadcast notification created', {
      type,
      recipientCount: users.length,
      filter: userFilter,
    });

    return {
      created: notifications.length,
      notifications,
    };
  }

  /**
   * Get notification by ID
   */
  async getNotification(
    notificationId: string,
    userId?: string
  ): Promise<NotificationWithRelations> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
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

    if (!notification) {
      throw new NotFoundError('Notification', notificationId);
    }

    // Check access if userId provided
    if (userId && notification.userId !== userId) {
      throw new ForbiddenError('You can only view your own notifications');
    }

    return notification;
  }

  /**
   * List notifications for user
   */
  async listNotifications(
    query: NotificationListQuery
  ): Promise<{ notifications: NotificationWithRelations[]; total: number }> {
    const {
      userId,
      type,
      isRead,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const where: any = { userId };

    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          [sortBy]: order,
        },
        take: limit,
        skip: offset,
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
      }),

      prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<NotificationWithRelations> {
    // Check notification exists and belongs to user
    const existing = await this.getNotification(notificationId, userId);

    // Already read
    if (existing.isRead) {
      return existing;
    }

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
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

    logger.info('Notification marked as read', {
      notificationId,
      userId,
    });

    return notification;
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    logger.info('All notifications marked as read', {
      userId,
      count: result.count,
    });

    return { updated: result.count };
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    // Check notification exists and belongs to user
    await this.getNotification(notificationId, userId);

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    logger.info('Notification deleted', {
      notificationId,
      userId,
    });
  }

  /**
   * Get notification statistics for user
   */
  async getNotificationStatistics(userId: string): Promise<NotificationStatistics> {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        select: {
          type: true,
          isRead: true,
        },
      }),

      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

    const total = notifications.length;
    const unread = unreadCount;
    const read = total - unread;

    // Count by type
    const byType: Record<string, number> = {};
    notifications.forEach((n) => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    // Get recent unread notifications
    const recentUnread = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
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

    return {
      total,
      unread,
      read,
      byType: byType as Record<NotificationType, number>,
      recentUnread,
    };
  }

  /**
   * Get admin notification statistics
   */
  async getAdminStatistics(): Promise<AdminNotificationStatistics> {
    const [allNotifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        select: {
          type: true,
          isRead: true,
        },
      }),

      prisma.notification.count({
        where: { isRead: false },
      }),
    ]);

    const totalSent = allNotifications.length;
    const totalUnread = unreadCount;
    const totalRead = totalSent - totalUnread;
    const readRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;

    // Count by type
    const byType: Record<string, number> = {};
    allNotifications.forEach((n) => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    // Get recent notifications
    const recentNotifications = await prisma.notification.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
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

    return {
      totalSent,
      totalRead,
      totalUnread,
      byType: byType as Record<NotificationType, number>,
      recentNotifications,
      readRate,
    };
  }

  /**
   * Helper: Create subscription expiring notification
   */
  async notifySubscriptionExpiring(
    userId: string,
    subscriptionId: string,
    daysLeft: number
  ): Promise<NotificationWithRelations> {
    return this.createNotification({
      userId,
      type: 'subscription_expiring',
      title: `Ваша подписка истекает через ${daysLeft} дн.`,
      titleEn: `Your subscription expires in ${daysLeft} days`,
      message: `Ваша подписка истекает ${new Date(Date.now() + daysLeft * 86400000).toLocaleDateString('ru')}. Не забудьте продлить!`,
      messageEn: `Your subscription expires on ${new Date(Date.now() + daysLeft * 86400000).toLocaleDateString('en')}. Don't forget to renew!`,
      metadata: {
        subscriptionId,
        daysLeft,
      },
    });
  }

  /**
   * Helper: Create subscription expired notification
   */
  async notifySubscriptionExpired(
    userId: string,
    subscriptionId: string
  ): Promise<NotificationWithRelations> {
    return this.createNotification({
      userId,
      type: 'subscription_expired',
      title: 'Ваша подписка истекла',
      titleEn: 'Your subscription has expired',
      message: 'Ваша подписка истекла. Продлите подписку для продолжения использования VPN.',
      messageEn: 'Your subscription has expired. Renew your subscription to continue using VPN.',
      metadata: {
        subscriptionId,
      },
    });
  }

  /**
   * Helper: Create payment received notification
   */
  async notifyPaymentReceived(
    userId: string,
    paymentId: string,
    amount: number
  ): Promise<NotificationWithRelations> {
    return this.createNotification({
      userId,
      type: 'payment_received',
      title: 'Платеж получен',
      titleEn: 'Payment received',
      message: `Ваш платеж на сумму ${amount} TON успешно обработан.`,
      messageEn: `Your payment of ${amount} TON has been successfully processed.`,
      metadata: {
        paymentId,
        amount,
      },
    });
  }

  /**
   * Helper: Create support reply notification
   */
  async notifySupportReply(
    userId: string,
    ticketId: string,
    ticketSubject: string
  ): Promise<NotificationWithRelations> {
    return this.createNotification({
      userId,
      type: 'support_reply',
      title: 'Новый ответ в поддержке',
      titleEn: 'New support reply',
      message: `Получен новый ответ на тикет: ${ticketSubject}`,
      messageEn: `New reply to your ticket: ${ticketSubject}`,
      metadata: {
        ticketId,
      },
    });
  }
}

export const notificationService = new NotificationService();
