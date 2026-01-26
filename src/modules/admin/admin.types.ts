/**
 * Admin Module Types
 * Domain types for admin operations, audit log, and system settings
 */

import type { AdminAuditLog, SystemSettings } from '@prisma/client';

// Re-export types
export type { AdminAuditLog, SystemSettings };

// Create audit log entry input
export interface CreateAuditLogInput {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Audit log list query
export interface AuditLogListQuery {
  page?: number;
  limit?: number;
  adminId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'createdAt';
  order?: 'asc' | 'desc';
}

// Paginated audit log response
export interface PaginatedAuditLogResponse {
  logs: AdminAuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// System setting input
export interface CreateSystemSettingInput {
  key: string;
  value: any;
  description?: string;
}

// Update system setting input
export interface UpdateSystemSettingInput {
  value?: any;
  description?: string;
}

// System settings list query
export interface SystemSettingsListQuery {
  page?: number;
  limit?: number;
}

// Paginated system settings response
export interface PaginatedSystemSettingsResponse {
  settings: SystemSettings[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard statistics
export interface DashboardStatistics {
  users: {
    total: number;
    active: number;
    banned: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  subscriptions: {
    total: number;
    active: number;
    expired: number;
    cancelled: number;
  };
  payments: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    totalRevenue: number;
    revenueToday: number;
    revenueThisMonth: number;
  };
  servers: {
    total: number;
    active: number;
    offline: number;
    maintenance: number;
    overloaded: number;
    totalUsers: number;
  };
  support: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    closedTickets: number;
  };
  promoCodes: {
    total: number;
    active: number;
    totalActivations: number;
  };
  referrals: {
    totalEarnings: number;
    totalWithdrawals: number;
    pendingWithdrawals: number;
  };
}

// Audit log action types (for consistency)
export enum AuditAction {
  // User management
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_BANNED = 'user_banned',
  USER_UNBANNED = 'user_unbanned',
  USER_DELETED = 'user_deleted',

  // Subscription management
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',

  // Plan management
  PLAN_CREATED = 'plan_created',
  PLAN_UPDATED = 'plan_updated',
  PLAN_DELETED = 'plan_deleted',

  // Server management
  SERVER_CREATED = 'server_created',
  SERVER_UPDATED = 'server_updated',
  SERVER_DELETED = 'server_deleted',

  // Promo code management
  PROMO_CREATED = 'promo_created',
  PROMO_UPDATED = 'promo_updated',
  PROMO_DELETED = 'promo_deleted',

  // Support management
  TICKET_ASSIGNED = 'ticket_assigned',
  TICKET_UPDATED = 'ticket_updated',
  TICKET_CLOSED = 'ticket_closed',

  // News management
  NEWS_CREATED = 'news_created',
  NEWS_UPDATED = 'news_updated',
  NEWS_PUBLISHED = 'news_published',
  NEWS_UNPUBLISHED = 'news_unpublished',
  NEWS_DELETED = 'news_deleted',

  // System settings
  SETTINGS_UPDATED = 'settings_updated',

  // Withdrawal management
  WITHDRAWAL_APPROVED = 'withdrawal_approved',
  WITHDRAWAL_REJECTED = 'withdrawal_rejected',
  WITHDRAWAL_COMPLETED = 'withdrawal_completed',
}

// Entity types
export enum EntityType {
  USER = 'user',
  SUBSCRIPTION = 'subscription',
  PLAN = 'plan',
  SERVER = 'server',
  PROMO_CODE = 'promo_code',
  TICKET = 'ticket',
  NEWS = 'news',
  SETTINGS = 'settings',
  WITHDRAWAL = 'withdrawal',
}
