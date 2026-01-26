/**
 * MONITORING Module Exports
 */

// Services
export { monitoringService } from './monitoring.service';
export { abuseDetectionService } from './abuse-detection.service';

// Types
export type {
  HealthStatus,
  MetricType,
  AlertSeverity,
  ServerMetricsWithAggregations,
  MetricsTimeRange,
  ServerMetricsQuery,
  SystemHealthSummary,
  Alert,
  CreateAlertInput,
  AbuseDetectionResult,
  AbuseIndicator,
  UserActivityMetrics,
  BandwidthUsage,
  ServerHealthTrend,
  MonitoringStatistics,
  MetricsAggregation,
} from './monitoring.types';

// Validation schemas
export {
  alertSeveritySchema,
  aggregationTypeSchema,
  timeIntervalSchema,
  metricsTimeRangeSchema,
  serverMetricsQuerySchema,
  getServerMetricsSchema,
  getHealthChecksSchema,
  createAlertSchema,
  resolveAlertSchema,
  abuseDetectionSchema,
  userActivityQuerySchema,
  bandwidthUsageSchema,
} from './monitoring.validation';

export type {
  ServerMetricsQueryInput,
  CreateAlertInput as CreateAlertInputValidated,
  AbuseDetectionInput,
  BandwidthUsageInput,
} from './monitoring.validation';
