/**
 * Monitoring Module Types
 * Domain types for system monitoring, metrics, and abuse detection
 */

import type { ServerMetric, ServerHealthCheck } from '@prisma/client';

// Health status enum
export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'offline';

// Metric type enum
export type MetricType = 'server' | 'user' | 'network' | 'system';

// Alert severity
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

// Server metrics with aggregations
export interface ServerMetricsWithAggregations extends ServerMetric {
  avgBytesIn?: number;
  avgBytesOut?: number;
  peakActiveUsers?: number;
  totalBandwidth?: number;
}

// Metrics time range
export interface MetricsTimeRange {
  start: Date;
  end: Date;
  interval?: '1h' | '24h' | '7d' | '30d';
}

// Server metrics query
export interface ServerMetricsQuery {
  serverId?: string;
  timeRange: MetricsTimeRange;
  aggregation?: 'avg' | 'sum' | 'max' | 'min';
}

// System health summary
export interface SystemHealthSummary {
  status: HealthStatus;
  totalServers: number;
  healthyServers: number;
  degradedServers: number;
  criticalServers: number;
  offlineServers: number;
  totalUsers: number;
  activeUsers: number;
  totalBandwidth: number; // bytes
  avgServerLoad: number; // percentage
  alerts: Alert[];
}

// Alert
export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  serverId?: string;
  userId?: string;
  timestamp: Date;
  isResolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}

// Create alert input
export interface CreateAlertInput {
  type: string;
  severity: AlertSeverity;
  message: string;
  serverId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// Abuse detection result
export interface AbuseDetectionResult {
  userId: string;
  isAbusive: boolean;
  reason?: string;
  score: number; // 0-100, higher is more suspicious
  indicators: AbuseIndicator[];
  recommendation: 'monitor' | 'warn' | 'throttle' | 'ban';
}

// Abuse indicator
export interface AbuseIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  value: number;
  threshold: number;
}

// User activity metrics
export interface UserActivityMetrics {
  userId: string;
  totalConfigs: number;
  activeConfigs: number;
  totalBandwidth: number; // bytes
  avgSessionDuration: number; // minutes
  connectionCount: number;
  lastActivity?: Date;
  createdAt: Date;
}

// Bandwidth usage
export interface BandwidthUsage {
  userId?: string;
  serverId?: string;
  bytesIn: number;
  bytesOut: number;
  totalBytes: number;
  period: string; // '1h', '24h', '7d', '30d'
}

// Server health trend
export interface ServerHealthTrend {
  serverId: string;
  period: string;
  checks: ServerHealthCheck[];
  uptimePercentage: number;
  avgResponseTime: number;
  failureCount: number;
  successCount: number;
}

// Monitoring statistics (admin)
export interface MonitoringStatistics {
  systemHealth: SystemHealthSummary;
  topServersByLoad: Array<{
    serverId: string;
    serverName: string;
    load: number;
  }>;
  topUsersByBandwidth: Array<{
    userId: string;
    username?: string;
    bandwidth: number;
  }>;
  recentAlerts: Alert[];
  abuseDetections: number;
}

// Metrics aggregation result
export interface MetricsAggregation {
  serverId?: string;
  userId?: string;
  period: string;
  avgBytesIn: number;
  avgBytesOut: number;
  totalBytesIn: number;
  totalBytesOut: number;
  peakActiveUsers: number;
  avgActiveUsers: number;
  totalConnections: number;
}
