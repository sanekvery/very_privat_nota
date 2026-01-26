/**
 * Monitoring Module Validation Schemas
 * Zod schemas for monitoring input validation
 */

import { z } from 'zod';
import { uuidSchema } from '@/lib/validation';

// Alert severity enum
export const alertSeveritySchema = z.enum(['info', 'warning', 'error', 'critical']);

// Metric aggregation type
export const aggregationTypeSchema = z.enum(['avg', 'sum', 'max', 'min']);

// Time interval
export const timeIntervalSchema = z.enum(['1h', '24h', '7d', '30d']);

// Metrics time range
export const metricsTimeRangeSchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
  interval: timeIntervalSchema.optional(),
});

// Server metrics query
export const serverMetricsQuerySchema = z.object({
  serverId: uuidSchema.optional(),
  timeRange: metricsTimeRangeSchema,
  aggregation: aggregationTypeSchema.optional().default('avg'),
});

export type ServerMetricsQueryInput = z.infer<typeof serverMetricsQuerySchema>;

// Get metrics by server
export const getServerMetricsSchema = z.object({
  serverId: uuidSchema,
  period: timeIntervalSchema.optional().default('24h'),
  limit: z.number().int().positive().max(1000).optional().default(100),
});

// Get health checks
export const getHealthChecksSchema = z.object({
  serverId: uuidSchema.optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
});

// Create alert
export const createAlertSchema = z.object({
  type: z.string().min(1).max(50),
  severity: alertSeveritySchema,
  message: z.string().min(1).max(500),
  serverId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;

// Resolve alert
export const resolveAlertSchema = z.object({
  alertId: uuidSchema,
});

// Abuse detection
export const abuseDetectionSchema = z.object({
  userId: uuidSchema,
  period: timeIntervalSchema.optional().default('24h'),
});

export type AbuseDetectionInput = z.infer<typeof abuseDetectionSchema>;

// User activity query
export const userActivityQuerySchema = z.object({
  userId: uuidSchema.optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
  sortBy: z.enum(['bandwidth', 'sessions', 'lastActivity']).optional().default('bandwidth'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Bandwidth usage query
export const bandwidthUsageSchema = z.object({
  userId: uuidSchema.optional(),
  serverId: uuidSchema.optional(),
  period: timeIntervalSchema.optional().default('24h'),
});

export type BandwidthUsageInput = z.infer<typeof bandwidthUsageSchema>;
