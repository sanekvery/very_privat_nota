/**
 * Abuse Detection Service
 * Analyzes user behavior for abuse patterns and generates recommendations
 *
 * Responsibilities:
 * - Bandwidth abuse detection
 * - Multiple config abuse detection
 * - Connection pattern analysis
 * - Scoring and recommendations
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { monitoringService } from './monitoring.service';
import type {
  AbuseDetectionResult,
  AbuseIndicator,
} from './monitoring.types';

// Thresholds for abuse detection
const THRESHOLDS = {
  // Bandwidth thresholds (bytes)
  BANDWIDTH_24H_HIGH: 100 * 1024 * 1024 * 1024, // 100 GB/day
  BANDWIDTH_24H_CRITICAL: 500 * 1024 * 1024 * 1024, // 500 GB/day

  // Config thresholds
  MAX_ACTIVE_CONFIGS: 5,
  MAX_TOTAL_CONFIGS: 10,
  CONFIG_CREATION_RATE_LIMIT: 10, // per 24h

  // Connection thresholds
  FAILED_CONNECTION_RATE: 0.5, // 50% failure rate
  MIN_CONNECTIONS_FOR_ANALYSIS: 10,

  // Payment thresholds
  MAX_FAILED_PAYMENTS: 5,
  MAX_REFUND_REQUESTS: 3,

  // Score thresholds for recommendations
  SCORE_MONITOR: 30,
  SCORE_WARN: 50,
  SCORE_THROTTLE: 70,
  SCORE_BAN: 90,
} as const;

export class AbuseDetectionService {
  /**
   * Detect abuse for a user
   */
  async detectAbuse(
    userId: string,
    period: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<AbuseDetectionResult> {
    const indicators: AbuseIndicator[] = [];

    // Run all checks in parallel
    const [
      bandwidthIndicator,
      configIndicators,
      connectionIndicators,
      paymentIndicators,
    ] = await Promise.all([
      this.checkBandwidthAbuse(userId, period),
      this.checkConfigAbuse(userId, period),
      this.checkConnectionAbuse(userId, period),
      this.checkPaymentAbuse(userId, period),
    ]);

    // Collect all indicators
    if (bandwidthIndicator) indicators.push(bandwidthIndicator);
    indicators.push(...configIndicators);
    indicators.push(...connectionIndicators);
    indicators.push(...paymentIndicators);

    // Calculate abuse score (0-100)
    const score = this.calculateAbuseScore(indicators);

    // Determine recommendation
    const recommendation = this.getRecommendation(score);

    // Check if user is considered abusive
    const isAbusive = score >= THRESHOLDS.SCORE_WARN;

    // Generate reason if abusive
    let reason: string | undefined;
    if (isAbusive) {
      const highSeverityIndicators = indicators.filter(
        (i) => i.severity === 'high'
      );
      if (highSeverityIndicators.length > 0) {
        reason = highSeverityIndicators
          .map((i) => i.description)
          .join('; ');
      } else {
        reason = `Abuse score ${score}/100 exceeded threshold`;
      }
    }

    // Log if abusive
    if (isAbusive) {
      logger.warn('Abuse detected', {
        userId,
        score,
        recommendation,
        indicatorCount: indicators.length,
      });

      // Create alert for high-severity cases
      if (score >= THRESHOLDS.SCORE_THROTTLE) {
        await monitoringService.createAlert({
          type: 'abuse_detection',
          severity: score >= THRESHOLDS.SCORE_BAN ? 'critical' : 'warning',
          message: `User ${userId} flagged for abuse: ${reason}`,
          userId,
          metadata: {
            score,
            recommendation,
            indicators: indicators.map((i) => i.type),
          },
        });
      }
    }

    return {
      userId,
      isAbusive,
      reason,
      score,
      indicators,
      recommendation,
    };
  }

  /**
   * Check bandwidth abuse
   */
  private async checkBandwidthAbuse(
    userId: string,
    period: '1h' | '24h' | '7d' | '30d'
  ): Promise<AbuseIndicator | null> {
    const usage = await monitoringService.getBandwidthUsage({
      userId,
      period,
    });

    const totalGB = usage.totalBytes / (1024 * 1024 * 1024);

    // Only check for 24h period
    if (period !== '24h') {
      return null;
    }

    if (usage.totalBytes > THRESHOLDS.BANDWIDTH_24H_CRITICAL) {
      return {
        type: 'excessive_bandwidth',
        severity: 'high',
        description: `Excessive bandwidth usage: ${totalGB.toFixed(2)} GB in 24h`,
        value: usage.totalBytes,
        threshold: THRESHOLDS.BANDWIDTH_24H_CRITICAL,
      };
    }

    if (usage.totalBytes > THRESHOLDS.BANDWIDTH_24H_HIGH) {
      return {
        type: 'high_bandwidth',
        severity: 'medium',
        description: `High bandwidth usage: ${totalGB.toFixed(2)} GB in 24h`,
        value: usage.totalBytes,
        threshold: THRESHOLDS.BANDWIDTH_24H_HIGH,
      };
    }

    return null;
  }

  /**
   * Check config abuse (multiple configs, rapid creation)
   */
  private async checkConfigAbuse(
    userId: string,
    period: '1h' | '24h' | '7d' | '30d'
  ): Promise<AbuseIndicator[]> {
    const indicators: AbuseIndicator[] = [];

    // Get user's configs
    const configs = await prisma.vpnConfig.findMany({
      where: {
        subscription: {
          userId,
        },
      },
      select: {
        id: true,
        isActive: true,
        createdAt: true,
        serverId: true,
      },
    });

    const activeConfigs = configs.filter((c) => c.isActive);
    const totalConfigs = configs.length;

    // Check too many active configs
    if (activeConfigs.length > THRESHOLDS.MAX_ACTIVE_CONFIGS) {
      indicators.push({
        type: 'too_many_active_configs',
        severity: 'high',
        description: `Too many active configs: ${activeConfigs.length}`,
        value: activeConfigs.length,
        threshold: THRESHOLDS.MAX_ACTIVE_CONFIGS,
      });
    }

    // Check too many total configs
    if (totalConfigs > THRESHOLDS.MAX_TOTAL_CONFIGS) {
      indicators.push({
        type: 'too_many_total_configs',
        severity: 'medium',
        description: `Too many total configs: ${totalConfigs}`,
        value: totalConfigs,
        threshold: THRESHOLDS.MAX_TOTAL_CONFIGS,
      });
    }

    // Check rapid config creation (for 24h period)
    if (period === '24h') {
      const since24h = new Date(Date.now() - 86400000);
      const recentConfigs = configs.filter(
        (c) => c.createdAt >= since24h
      );

      if (recentConfigs.length > THRESHOLDS.CONFIG_CREATION_RATE_LIMIT) {
        indicators.push({
          type: 'rapid_config_creation',
          severity: 'high',
          description: `Rapid config creation: ${recentConfigs.length} in 24h`,
          value: recentConfigs.length,
          threshold: THRESHOLDS.CONFIG_CREATION_RATE_LIMIT,
        });
      }
    }

    // Check multiple configs from same server (potential abuse)
    const serverCounts = new Map<string, number>();
    activeConfigs.forEach((config) => {
      const count = serverCounts.get(config.serverId) || 0;
      serverCounts.set(config.serverId, count + 1);
    });

    for (const [_serverId, count] of serverCounts.entries()) {
      if (count > 2) {
        indicators.push({
          type: 'multiple_configs_same_server',
          severity: 'medium',
          description: `Multiple configs on same server: ${count}`,
          value: count,
          threshold: 2,
        });
      }
    }

    return indicators;
  }

  /**
   * Check connection abuse (failed connections, unusual patterns)
   */
  private async checkConnectionAbuse(
    userId: string,
    period: '1h' | '24h' | '7d' | '30d'
  ): Promise<AbuseIndicator[]> {
    const indicators: AbuseIndicator[] = [];

    // Get user's configs
    const configs = await prisma.vpnConfig.findMany({
      where: {
        subscription: {
          userId,
        },
      },
      select: { id: true },
    });

    if (configs.length === 0) {
      return indicators;
    }

    // Note: Connection logs don't exist in schema yet
    // This is a placeholder for future implementation
    // When connection logging is added, analyze:
    // - Failed connection rate
    // - Connection frequency
    // - Unusual connection times

    // For now, we can check subscription payment failures as proxy
    const timeRanges = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
    };

    const since = new Date(Date.now() - timeRanges[period]);

    const failedPayments = await prisma.payment.count({
      where: {
        userId,
        status: 'failed',
        createdAt: { gte: since },
      },
    });

    if (failedPayments >= THRESHOLDS.MAX_FAILED_PAYMENTS) {
      indicators.push({
        type: 'excessive_failed_payments',
        severity: 'medium',
        description: `Excessive failed payments: ${failedPayments}`,
        value: failedPayments,
        threshold: THRESHOLDS.MAX_FAILED_PAYMENTS,
      });
    }

    return indicators;
  }

  /**
   * Check payment abuse (failed payments, refunds)
   */
  private async checkPaymentAbuse(
    userId: string,
    period: '1h' | '24h' | '7d' | '30d'
  ): Promise<AbuseIndicator[]> {
    const indicators: AbuseIndicator[] = [];

    const timeRanges = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
    };

    const since = new Date(Date.now() - timeRanges[period]);

    // Get payment statistics
    const [failedPayments, refundedPayments] = await Promise.all([
      prisma.payment.count({
        where: {
          userId,
          status: 'failed',
          createdAt: { gte: since },
        },
      }),

      prisma.payment.count({
        where: {
          userId,
          status: 'refunded',
          createdAt: { gte: since },
        },
      }),
    ]);

    if (failedPayments >= THRESHOLDS.MAX_FAILED_PAYMENTS) {
      indicators.push({
        type: 'excessive_failed_payments',
        severity: 'low',
        description: `Multiple failed payments: ${failedPayments}`,
        value: failedPayments,
        threshold: THRESHOLDS.MAX_FAILED_PAYMENTS,
      });
    }

    if (refundedPayments >= THRESHOLDS.MAX_REFUND_REQUESTS) {
      indicators.push({
        type: 'excessive_refunds',
        severity: 'medium',
        description: `Multiple refund requests: ${refundedPayments}`,
        value: refundedPayments,
        threshold: THRESHOLDS.MAX_REFUND_REQUESTS,
      });
    }

    return indicators;
  }

  /**
   * Calculate abuse score from indicators
   */
  private calculateAbuseScore(indicators: AbuseIndicator[]): number {
    if (indicators.length === 0) {
      return 0;
    }

    // Weight by severity
    const severityWeights = {
      low: 10,
      medium: 25,
      high: 40,
    };

    let totalScore = 0;

    for (const indicator of indicators) {
      const baseScore = severityWeights[indicator.severity];

      // Add bonus based on how much threshold was exceeded
      const exceedPercentage = (indicator.value / indicator.threshold - 1) * 100;
      const bonus = Math.min(exceedPercentage * 0.5, 20); // Max 20 bonus points

      totalScore += baseScore + bonus;
    }

    // Cap at 100
    return Math.min(Math.round(totalScore), 100);
  }

  /**
   * Get recommendation based on score
   */
  private getRecommendation(
    score: number
  ): 'monitor' | 'warn' | 'throttle' | 'ban' {
    if (score >= THRESHOLDS.SCORE_BAN) {
      return 'ban';
    }

    if (score >= THRESHOLDS.SCORE_THROTTLE) {
      return 'throttle';
    }

    if (score >= THRESHOLDS.SCORE_WARN) {
      return 'warn';
    }

    if (score >= THRESHOLDS.SCORE_MONITOR) {
      return 'monitor';
    }

    return 'monitor';
  }

  /**
   * Get abuse statistics (admin)
   */
  async getAbuseStatistics(params: {
    period?: '1h' | '24h' | '7d' | '30d';
    minScore?: number;
  }): Promise<{
    totalChecked: number;
    abusiveUsers: number;
    averageScore: number;
    byRecommendation: Record<string, number>;
  }> {
    const { period = '24h', minScore = THRESHOLDS.SCORE_WARN } = params;

    // Get all active users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    // Check each user
    const results = await Promise.all(
      users.map((user) => this.detectAbuse(user.id, period))
    );

    const abusiveResults = results.filter((r) => r.score >= minScore);

    const byRecommendation: Record<string, number> = {
      monitor: 0,
      warn: 0,
      throttle: 0,
      ban: 0,
    };

    abusiveResults.forEach((r) => {
      const rec = r.recommendation;
      byRecommendation[rec] = (byRecommendation[rec] || 0) + 1;
    });

    const averageScore =
      results.length > 0
        ? Math.round(
            results.reduce((sum, r) => sum + r.score, 0) / results.length
          )
        : 0;

    return {
      totalChecked: results.length,
      abusiveUsers: abusiveResults.length,
      averageScore,
      byRecommendation,
    };
  }
}

export const abuseDetectionService = new AbuseDetectionService();
