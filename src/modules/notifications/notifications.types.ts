/**
 * Notifications Module Types
 * Domain types for user notifications
 */

import type { Notification } from '@prisma/client';

// Notification type (from Prisma schema)
export type NotificationType =
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'payment_received'
  | 'support_reply'
  | 'news'
  | 'system';

// User partial type for relations
export interface UserPartial {
  id: string;
  telegramId: bigint | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

// Notification with relations
export interface NotificationWithRelations extends Notification {
  user?: UserPartial;
}

// Create notification input
export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  metadata?: Record<string, any>;
}

// Create broadcast notification input (for all users)
export interface CreateBroadcastNotificationInput {
  type: NotificationType;
  title: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  metadata?: Record<string, any>;
  userFilter?: {
    hasActiveSubscription?: boolean;
    isAdmin?: boolean;
  };
}

// Notification list query
export interface NotificationListQuery {
  userId: string;
  type?: NotificationType;
  isRead?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt';
  order?: 'asc' | 'desc';
}

// Notification statistics
export interface NotificationStatistics {
  total: number;
  unread: number;
  read: number;
  byType: Record<NotificationType, number>;
  recentUnread: NotificationWithRelations[];
}

// Admin notification statistics
export interface AdminNotificationStatistics {
  totalSent: number;
  totalRead: number;
  totalUnread: number;
  byType: Record<NotificationType, number>;
  recentNotifications: NotificationWithRelations[];
  readRate: number; // percentage
}
