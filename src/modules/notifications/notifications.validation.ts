/**
 * Notifications Module Validation Schemas
 * Zod schemas for notification input validation
 */

import { z } from 'zod';
import { uuidSchema } from '@/lib/validation';

// Notification type enum
export const notificationTypeSchema = z.enum([
  'subscription_expiring',
  'subscription_expired',
  'payment_received',
  'support_reply',
  'news',
  'system',
]);

// Create notification
export const createNotificationSchema = z.object({
  userId: uuidSchema,
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(1000),
  messageEn: z.string().min(1).max(1000).optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

// Create broadcast notification
export const createBroadcastNotificationSchema = z.object({
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(1000),
  messageEn: z.string().min(1).max(1000).optional(),
  metadata: z.record(z.any()).optional(),
  userFilter: z
    .object({
      hasActiveSubscription: z.boolean().optional(),
      isAdmin: z.boolean().optional(),
    })
    .optional(),
});

export type CreateBroadcastNotificationInput = z.infer<typeof createBroadcastNotificationSchema>;

// Get notification
export const getNotificationSchema = z.object({
  notificationId: uuidSchema,
});

// List notifications
export const listNotificationsSchema = z.object({
  userId: uuidSchema,
  type: notificationTypeSchema.optional(),
  isRead: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
  sortBy: z.enum(['createdAt']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type NotificationListInput = z.infer<typeof listNotificationsSchema>;

// Mark as read
export const markAsReadSchema = z.object({
  notificationId: uuidSchema,
});

// Mark all as read
export const markAllAsReadSchema = z.object({
  userId: uuidSchema,
});

// Delete notification
export const deleteNotificationSchema = z.object({
  notificationId: uuidSchema,
});
