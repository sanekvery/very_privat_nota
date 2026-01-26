/**
 * Notifications Module
 * Exports all notification-related functionality
 */

// Service
export { notificationService } from './notification.service';

// Types
export type {
  NotificationType,
  NotificationWithRelations,
  CreateNotificationInput,
  CreateBroadcastNotificationInput,
  NotificationListQuery,
  NotificationStatistics,
  AdminNotificationStatistics,
  UserPartial,
} from './notifications.types';

// Validation Schemas
export {
  createNotificationSchema,
  createBroadcastNotificationSchema,
  getNotificationSchema,
  listNotificationsSchema,
  markAsReadSchema,
  deleteNotificationSchema,
} from './notifications.validation';
