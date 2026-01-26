/**
 * Monitoring Service
 * Manages system monitoring, metrics collection, and health checks
 *
 * Responsibilities:
 * - Collect and aggregate metrics
 * - System health monitoring
 * - Alert management
 * - Bandwidth tracking
 * - Performance monitoring
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import { NotFoundError } from '@/lib/errors';
import type { ServerMetric } from '@prisma/client';
import type {
  SystemHealthSummary,
  HealthStatus,
  ServerMetricsQuery,
  MetricsAggregation,
  ServerHealthTrend,
  BandwidthUsage,
  MonitoringStatistics,
  Alert,
  CreateAlertInput,
} from './monitoring.types';

export class MonitoringService {
  /**
   * Get system health summary
   */
  async getSystemHealth(): Promise<SystemHealthSummary> {
    // Get server counts by status
    const [totalServers, serversByStatus, totalUsers, activeConfigs] =
      await Promise.all([
        prisma.vpnServer.count(),

        prisma.vpnServer.groupBy({
          by: ['status'],
          _count: true,
        }),

        prisma.user.count(),

        prisma.vpnConfig.count({
          where: { isActive: true },
        }),
      ]);

    // Calculate server health distribution
    let healthyServers = 0;
    let degradedServers = 0;
    let criticalServers = 0;
    let offlineServers = 0;

    serversByStatus.forEach((item) => {
      if (item.status === 'active') healthyServers = item._count;
      if (item.status === 'maintenance') degradedServers = item._count;
      if (item.status === 'offline') offlineServers = item._count;
    });

    // Get total capacity and usage
    const capacityStats = await prisma.vpnServer.aggregate({
      _sum: {
        maxUsers: true,
        currentUsers: true,
      },
    });

    const totalCapacity = capacityStats._sum.maxUsers || 0;
    const currentUsers = capacityStats._sum.currentUsers || 0;
    const avgServerLoad =
      totalCapacity > 0 ? Math.round((currentUsers / totalCapacity) * 100) : 0;

    // Get recent metrics for bandwidth
    const recentMetrics = await prisma.serverMetric.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 3600000), // Last hour
        },
      },
      take: 100,
    });

    const totalBandwidth = recentMetrics.reduce(
      (sum, m) => sum + Number(m.bytesIn) + Number(m.bytesOut),
      0
    );

    // Get recent alerts (cached)
    const alerts = await this.getRecentAlerts(10);

    // Determine overall health status
    const status = this.calculateHealthStatus({
      healthyServers,
      degradedServers,
      criticalServers,
      offlineServers,
      avgServerLoad,
    });

    return {
      status,
      totalServers,
      healthyServers,
      degradedServers,
      criticalServers,
      offlineServers,
      totalUsers,
      activeUsers: activeConfigs,
      totalBandwidth,
      avgServerLoad,
      alerts,
    };
  }

  /**
   * Get server metrics for time range
   */
  async getServerMetrics(
    serverId: string,
    period: '1h' | '24h' | '7d' | '30d' = '24h',
    limit = 100
  ): Promise<ServerMetric[]> {
    const timeRanges = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
    };

    const since = new Date(Date.now() - timeRanges[period]);

    const metrics = await prisma.serverMetric.findMany({
      where: {
        serverId,
        timestamp: { gte: since },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    return metrics;
  }

  /**
   * Get aggregated metrics
   */
  async getAggregatedMetrics(
    query: ServerMetricsQuery
  ): Promise<MetricsAggregation> {
    const { serverId, timeRange } = query;

    const metrics = await prisma.serverMetric.findMany({
      where: {
        ...(serverId && { serverId }),
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
    });

    if (metrics.length === 0) {
      return {
        serverId,
        period: `${timeRange.start.toISOString()} - ${timeRange.end.toISOString()}`,
        avgBytesIn: 0,
        avgBytesOut: 0,
        totalBytesIn: 0,
        totalBytesOut: 0,
        peakActiveUsers: 0,
        avgActiveUsers: 0,
        totalConnections: 0,
      };
    }

    const totalBytesIn = metrics.reduce((sum, m) => sum + Number(m.bytesIn), 0);
    const totalBytesOut = metrics.reduce((sum, m) => sum + Number(m.bytesOut), 0);
    const totalActiveUsers = metrics.reduce((sum, m) => sum + m.activeUsers, 0);
    const totalConnections = metrics.reduce(
      (sum, m) => sum + m.totalConnections,
      0
    );
    const peakActiveUsers = Math.max(...metrics.map((m) => m.activeUsers));

    return {
      serverId,
      period: `${timeRange.start.toISOString()} - ${timeRange.end.toISOString()}`,
      avgBytesIn: Math.round(totalBytesIn / metrics.length),
      avgBytesOut: Math.round(totalBytesOut / metrics.length),
      totalBytesIn,
      totalBytesOut,
      peakActiveUsers,
      avgActiveUsers: Math.round(totalActiveUsers / metrics.length),
      totalConnections,
    };
  }

  /**
   * Get server health trend
   */
  async getServerHealthTrend(
    serverId: string,
    period: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<ServerHealthTrend> {
    const timeRanges = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
    };

    const since = new Date(Date.now() - timeRanges[period]);

    const checks = await prisma.serverHealthCheck.findMany({
      where: {
        serverId,
        checkedAt: { gte: since },
      },
      orderBy: {
        checkedAt: 'desc',
      },
    });

    const successCount = checks.filter((c) => c.isHealthy).length;
    const failureCount = checks.length - successCount;
    const uptimePercentage =
      checks.length > 0 ? Math.round((successCount / checks.length) * 100) : 0;

    const responseTimes = checks
      .filter((c) => c.responseTime !== null)
      .map((c) => c.responseTime!);

    const avgResponseTime =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
          )
        : 0;

    return {
      serverId,
      period,
      checks,
      uptimePercentage,
      avgResponseTime,
      failureCount,
      successCount,
    };
  }

  /**
   * Get bandwidth usage
   */
  async getBandwidthUsage(params: {
    userId?: string;
    serverId?: string;
    period?: '1h' | '24h' | '7d' | '30d';
  }): Promise<BandwidthUsage> {
    const { userId, serverId, period = '24h' } = params;

    const timeRanges = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
    };

    const since = new Date(Date.now() - timeRanges[period]);

    // If userId specified, get metrics from their configs
    let metrics: ServerMetric[] = [];

    if (userId) {
      // Get user's configs
      const configs = await prisma.vpnConfig.findMany({
        where: {
          subscription: {
            userId,
          },
        },
        select: { serverId: true },
      });

      const serverIds = configs.map((c) => c.serverId);

      metrics = await prisma.serverMetric.findMany({
        where: {
          serverId: { in: serverIds },
          timestamp: { gte: since },
        },
      });
    } else if (serverId) {
      metrics = await prisma.serverMetric.findMany({
        where: {
          serverId,
          timestamp: { gte: since },
        },
      });
    } else {
      // All servers
      metrics = await prisma.serverMetric.findMany({
        where: {
          timestamp: { gte: since },
        },
      });
    }

    const bytesIn = metrics.reduce((sum, m) => sum + Number(m.bytesIn), 0);
    const bytesOut = metrics.reduce((sum, m) => sum + Number(m.bytesOut), 0);

    return {
      userId,
      serverId,
      bytesIn,
      bytesOut,
      totalBytes: bytesIn + bytesOut,
      period,
    };
  }

  /**
   * Create alert
   */
  async createAlert(input: CreateAlertInput): Promise<Alert> {
    const alert: Alert = {
      id: crypto.randomUUID(),
      type: input.type,
      severity: input.severity,
      message: input.message,
      serverId: input.serverId,
      userId: input.userId,
      timestamp: new Date(),
      isResolved: false,
      metadata: input.metadata,
    };

    // Store in Redis with 7 day TTL
    const key = `alert:${alert.id}`;
    await redis.setex(key, 604800, JSON.stringify(alert));

    // Add to alerts list
    await redis.lpush('alerts:recent', alert.id);
    await redis.ltrim('alerts:recent', 0, 99); // Keep last 100

    logger.warn('Alert created', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
    });

    return alert;
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(limit = 20): Promise<Alert[]> {
    const alertIds = await redis.lrange('alerts:recent', 0, limit - 1);

    const alerts: Alert[] = [];

    for (const id of alertIds) {
      const key = `alert:${id}`;
      const data = await redis.get(key);

      if (data) {
        alerts.push(JSON.parse(data));
      }
    }

    return alerts;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string): Promise<Alert> {
    const key = `alert:${alertId}`;
    const data = await redis.get(key);

    if (!data) {
      throw new NotFoundError('Alert', alertId);
    }

    const alert: Alert = JSON.parse(data);
    alert.isResolved = true;
    alert.resolvedAt = new Date();

    await redis.setex(key, 604800, JSON.stringify(alert));

    logger.info('Alert resolved', { alertId });

    return alert;
  }

  /**
   * Get monitoring statistics (admin)
   */
  async getMonitoringStatistics(): Promise<MonitoringStatistics> {
    const systemHealth = await this.getSystemHealth();

    // Top servers by load
    const servers = await prisma.vpnServer.findMany({
      where: { isActive: true },
      orderBy: { currentUsers: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        currentUsers: true,
        maxUsers: true,
      },
    });

    const topServersByLoad = servers.map((s) => ({
      serverId: s.id,
      serverName: s.name,
      load: s.maxUsers > 0 ? Math.round((s.currentUsers / s.maxUsers) * 100) : 0,
    }));

    // Top users by bandwidth (last 24h)
    const since24h = new Date(Date.now() - 86400000);
    const configs = await prisma.vpnConfig.findMany({
      where: {
        isActive: true,
      },
      select: {
        serverId: true,
        subscription: {
          select: {
            userId: true,
            user: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    // Get metrics for active configs
    const userBandwidth = new Map<string, { username?: string; bandwidth: number }>();

    for (const config of configs) {
      const metrics = await prisma.serverMetric.findMany({
        where: {
          serverId: config.serverId,
          timestamp: { gte: since24h },
        },
      });

      const totalBytes = metrics.reduce(
        (sum, m) => sum + Number(m.bytesIn) + Number(m.bytesOut),
        0
      );

      const userId = config.subscription.userId;
      const current = userBandwidth.get(userId);
      userBandwidth.set(userId, {
        username: config.subscription.user.username || undefined,
        bandwidth: (current?.bandwidth || 0) + totalBytes,
      });
    }

    const topUsersByBandwidth = Array.from(userBandwidth.entries())
      .sort((a, b) => b[1].bandwidth - a[1].bandwidth)
      .slice(0, 10)
      .map(([userId, data]) => ({
        userId,
        username: data.username,
        bandwidth: data.bandwidth,
      }));

    // Get recent alerts
    const recentAlerts = await this.getRecentAlerts(20);

    // Count abuse detections (placeholder)
    const abuseDetections = 0;

    return {
      systemHealth,
      topServersByLoad,
      topUsersByBandwidth,
      recentAlerts,
      abuseDetections,
    };
  }

  // ==================
  // Private helpers
  // ==================

  /**
   * Calculate overall health status
   */
  private calculateHealthStatus(params: {
    healthyServers: number;
    degradedServers: number;
    criticalServers: number;
    offlineServers: number;
    avgServerLoad: number;
  }): HealthStatus {
    const { healthyServers, degradedServers, criticalServers, offlineServers, avgServerLoad } =
      params;

    const totalServers = healthyServers + degradedServers + criticalServers + offlineServers;

    if (totalServers === 0) return 'offline';

    const healthyPercentage = (healthyServers / totalServers) * 100;

    if (criticalServers > 0 || offlineServers === totalServers) {
      return 'critical';
    }

    if (healthyPercentage < 50 || avgServerLoad > 90) {
      return 'degraded';
    }

    if (degradedServers > 0 || avgServerLoad > 70) {
      return 'degraded';
    }

    return 'healthy';
  }
}

export const monitoringService = new MonitoringService();
