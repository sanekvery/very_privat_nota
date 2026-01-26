/**
 * Server Service
 * Manages VPN servers, health checks, and load balancing
 *
 * Responsibilities:
 * - CRUD operations for servers
 * - Server health monitoring
 * - Load balancing and optimal server selection
 * - Capacity management
 * - Server statistics
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '@/lib/errors';
import type { VpnServer } from '@prisma/client';
import type {
  CreateServerInput,
  UpdateServerInput,
  ServerWithStats,
  HealthCheckResult,
  ServerLoadMetrics,
  ServerSelectionCriteria,
  OptimalServerResult,
  ServerStatistics,
  ServerCapacityInfo,
  ServerStatus,
} from './servers.types';

export class ServerService {
  /**
   * Create new VPN server
   */
  async createServer(input: CreateServerInput): Promise<VpnServer> {
    const {
      name,
      host,
      port = 443,
      publicKey,
      endpoint,
      city,
      countryCode,
      listenPort = 51820,
      subnet,
      maxUsers = 1000,
      agentApiUrl,
      agentBearerToken,
      dns = '1.1.1.1,8.8.8.8',
      priority = 100,
      isActive = true,
    } = input;

    // Check if server with same host already exists
    const existing = await prisma.vpnServer.findFirst({
      where: { host },
    });

    if (existing) {
      throw new ConflictError(`Server with host "${host}" already exists`);
    }

    const server = await prisma.vpnServer.create({
      data: {
        name,
        host,
        port,
        publicKey,
        endpoint,
        city,
        countryCode: countryCode.toUpperCase(),
        listenPort,
        subnet,
        maxUsers,
        agentApiUrl,
        agentBearerToken,
        dns,
        priority,
        isActive,
        status: 'active',
        currentUsers: 0,
      },
    });

    logger.info('VPN server created', {
      serverId: server.id,
      name: server.name,
      city: server.city,
      countryCode: server.countryCode,
    });

    return server;
  }

  /**
   * Get server by ID
   */
  async getServerById(serverId: string): Promise<VpnServer> {
    const server = await prisma.vpnServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundError('Server', serverId);
    }

    return server;
  }

  /**
   * Get server with statistics
   */
  async getServerWithStats(serverId: string): Promise<ServerWithStats> {
    const server = await this.getServerById(serverId);

    // Get active configs count
    const activeConfigs = await prisma.vpnConfig.count({
      where: {
        serverId,
        isActive: true,
      },
    });

    // Get total configs count
    const totalConfigs = await prisma.vpnConfig.count({
      where: { serverId },
    });

    // Calculate capacity
    const capacityUsed = server.maxUsers > 0
      ? Math.round((activeConfigs / server.maxUsers) * 100)
      : 0;

    // Get last health check
    const lastHealthCheck = await prisma.serverHealthCheck.findFirst({
      where: { serverId },
      orderBy: { checkedAt: 'desc' },
    });

    return {
      ...server,
      stats: {
        activeConfigs,
        totalConfigs,
        capacityUsed,
        lastHealthCheck: lastHealthCheck?.checkedAt,
        isHealthy: lastHealthCheck?.isHealthy ?? false,
      },
    };
  }

  /**
   * List all servers with optional filters
   */
  async getAllServers(filters?: {
    status?: ServerStatus;
    countryCode?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<VpnServer[]> {
    const {
      status,
      countryCode,
      isActive,
      limit = 50,
      offset = 0,
    } = filters || {};

    const servers = await prisma.vpnServer.findMany({
      where: {
        ...(status && { status }),
        ...(countryCode && { countryCode: countryCode.toUpperCase() }),
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: [
        { isActive: 'desc' },
        { priority: 'desc' },
        { name: 'asc' },
      ],
      take: limit,
      skip: offset,
    });

    return servers;
  }

  /**
   * Update server
   */
  async updateServer(input: UpdateServerInput): Promise<VpnServer> {
    const { serverId, ...updates } = input;

    // Verify server exists
    await this.getServerById(serverId);

    const server = await prisma.vpnServer.update({
      where: { id: serverId },
      data: {
        ...updates,
        ...(updates.countryCode && {
          countryCode: updates.countryCode.toUpperCase(),
        }),
      },
    });

    logger.info('Server updated', {
      serverId,
      updates: Object.keys(updates),
    });

    return server;
  }

  /**
   * Delete server (soft delete - mark as inactive)
   */
  async deleteServer(serverId: string): Promise<void> {
    const server = await this.getServerById(serverId);

    // Check if server has active configs
    const activeConfigsCount = await prisma.vpnConfig.count({
      where: {
        serverId,
        isActive: true,
      },
    });

    if (activeConfigsCount > 0) {
      throw new ValidationError(
        `Cannot delete server with ${activeConfigsCount} active configurations. Deactivate configs first.`
      );
    }

    // Soft delete - mark as inactive and offline
    await prisma.vpnServer.update({
      where: { id: serverId },
      data: {
        isActive: false,
        status: 'offline',
      },
    });

    logger.warn('Server deleted (soft)', { serverId, name: server.name });
  }

  /**
   * Perform health check on server
   */
  async performHealthCheck(serverId: string): Promise<HealthCheckResult> {
    const server = await this.getServerById(serverId);

    const startTime = Date.now();
    let isHealthy = false;
    let errorMessage: string | undefined;
    let agentReachable = false;

    try {
      // Simple ping check (in production, would call VPN Agent health endpoint)
      // TODO: Implement actual VPN Agent client call

      // Mock implementation for now
      const isMockMode = process.env.VPN_AGENT_MOCK === 'true';

      if (isMockMode) {
        // Mock: always healthy
        isHealthy = true;
        agentReachable = true;
      } else {
        // Production: would call agent API
        // const response = await fetch(`${server.agentApiUrl}/health`, {
        //   headers: { Authorization: `Bearer ${server.agentBearerToken}` }
        // });
        // isHealthy = response.ok;
        // agentReachable = true;

        throw new Error('VPN Agent health check not implemented. Use VPN_AGENT_MOCK=true');
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Health check failed';
      isHealthy = false;
    }

    const responseTime = Date.now() - startTime;

    // Save health check result
    await prisma.serverHealthCheck.create({
      data: {
        serverId,
        isHealthy,
        responseTime,
        errorMessage,
        checkedAt: new Date(),
      },
    });

    // Update server status if needed
    if (!isHealthy && server.status === 'active') {
      await prisma.vpnServer.update({
        where: { id: serverId },
        data: { status: 'offline' },
      });

      logger.warn('Server marked as offline due to failed health check', {
        serverId,
        error: errorMessage,
      });
    }

    // Update server lastHealthCheck
    await prisma.vpnServer.update({
      where: { id: serverId },
      data: { lastHealthCheck: new Date() },
    });

    return {
      serverId,
      isHealthy,
      responseTime,
      lastChecked: new Date(),
      error: errorMessage,
      details: {
        agentReachable,
      },
    };
  }

  /**
   * Get server load metrics
   */
  async getServerLoadMetrics(serverId: string): Promise<ServerLoadMetrics> {
    const server = await this.getServerById(serverId);

    // Count active users (active configs)
    const activeUsers = await prisma.vpnConfig.count({
      where: {
        serverId,
        isActive: true,
      },
    });

    const capacityUsed = server.maxUsers > 0
      ? Math.round((activeUsers / server.maxUsers) * 100)
      : 0;

    // Get IP pool info
    const totalIps = await prisma.ipPool.count({
      where: { serverId },
    });

    const usedIps = await prisma.ipPool.count({
      where: {
        serverId,
        isAllocated: true,
      },
    });

    return {
      serverId,
      activeUsers,
      maxUsers: server.maxUsers,
      capacityUsed,
      availableIps: totalIps - usedIps,
      totalIps,
    };
  }

  /**
   * Get optimal server for new user
   * Load balancing algorithm
   */
  async getOptimalServer(
    criteria?: ServerSelectionCriteria
  ): Promise<OptimalServerResult> {
    const {
      preferredCountry,
      maxCapacity = 90,
      requireActive = true,
      excludeServerIds = [],
    } = criteria || {};

    // Get all eligible servers
    const servers = await prisma.vpnServer.findMany({
      where: {
        ...(requireActive && { isActive: true, status: 'active' }),
        ...(preferredCountry && { countryCode: preferredCountry.toUpperCase() }),
        ...(excludeServerIds.length > 0 && {
          id: { notIn: excludeServerIds },
        }),
      },
      orderBy: {
        priority: 'desc',
      },
    });

    if (servers.length === 0) {
      throw new NotFoundError(
        'Server',
        `No available servers matching criteria`
      );
    }

    // Calculate score for each server
    const scoredServers = await Promise.all(
      servers.map(async (server) => {
        const metrics = await this.getServerLoadMetrics(server.id);

        // Skip servers over capacity
        if (metrics.capacityUsed > maxCapacity) {
          return null;
        }

        // Calculate score (lower capacity = higher score)
        let score = 100 - metrics.capacityUsed;

        // Add priority bonus
        score += server.priority / 10;

        // Bonus for preferred country
        if (preferredCountry && server.countryCode === preferredCountry.toUpperCase()) {
          score += 20;
        }

        // Penalty for high capacity
        if (metrics.capacityUsed > 70) {
          score -= 10;
        }

        return {
          server,
          score,
          metrics,
        };
      })
    );

    // Filter out null scores and sort by score
    const validServers = scoredServers
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.score - a.score);

    if (validServers.length === 0) {
      throw new ValidationError('All servers are at capacity');
    }

    // Return best server
    const best = validServers[0]!;

    return {
      server: best.server,
      score: best.score,
      reason: this.getSelectionReason(best.server, best.metrics, preferredCountry),
      metrics: best.metrics,
    };
  }

  /**
   * Get server statistics (admin)
   */
  async getServerStatistics(): Promise<ServerStatistics> {
    const [
      totalServers,
      activeServers,
      maintenanceServers,
      offlineServers,
      serversByCountry,
      capacityStats,
    ] = await Promise.all([
      prisma.vpnServer.count(),

      prisma.vpnServer.count({ where: { status: 'active' } }),
      prisma.vpnServer.count({ where: { status: 'maintenance' } }),
      prisma.vpnServer.count({ where: { status: 'offline' } }),

      prisma.vpnServer.groupBy({
        by: ['countryCode'],
        _count: true,
        orderBy: { _count: { countryCode: 'desc' } },
      }),

      // Get total and used capacity
      prisma.vpnServer.aggregate({
        _sum: {
          maxUsers: true,
        },
      }),
    ]);

    // Calculate total active configs
    const totalActiveConfigs = await prisma.vpnConfig.count({
      where: { isActive: true },
    });

    const totalCapacity = capacityStats._sum.maxUsers || 0;
    const usedCapacity = totalActiveConfigs;
    const averageLoad = totalCapacity > 0
      ? Math.round((usedCapacity / totalCapacity) * 100)
      : 0;

    return {
      totalServers,
      activeServers,
      maintenanceServers,
      offlineServers,
      totalCapacity,
      usedCapacity,
      averageLoad,
      serversByCountry: serversByCountry.map((item) => ({
        countryCode: item.countryCode,
        count: item._count,
      })),
    };
  }

  /**
   * Get server capacity info
   */
  async getServerCapacityInfo(serverId: string): Promise<ServerCapacityInfo> {
    const server = await this.getServerById(serverId);

    const currentUsers = await prisma.vpnConfig.count({
      where: { serverId, isActive: true },
    });

    const totalIps = await prisma.ipPool.count({
      where: { serverId },
    });

    const usedIps = await prisma.ipPool.count({
      where: {
        serverId,
        isAllocated: true,
      },
    });

    return {
      serverId,
      maxUsers: server.maxUsers,
      currentUsers,
      availableSlots: Math.max(0, server.maxUsers - currentUsers),
      capacityPercentage: server.maxUsers > 0
        ? Math.round((currentUsers / server.maxUsers) * 100)
        : 0,
      ipPoolSize: totalIps,
      ipPoolUsed: usedIps,
      ipPoolAvailable: totalIps - usedIps,
    };
  }

  // ==================
  // Private helpers
  // ==================

  /**
   * Get human-readable selection reason
   */
  private getSelectionReason(
    server: VpnServer,
    metrics: ServerLoadMetrics,
    preferredCountry?: string
  ): string {
    const reasons: string[] = [];

    if (preferredCountry && server.countryCode === preferredCountry.toUpperCase()) {
      reasons.push('matches preferred country');
    }

    if (metrics.capacityUsed < 50) {
      reasons.push('low load');
    } else if (metrics.capacityUsed < 70) {
      reasons.push('moderate load');
    }

    if (reasons.length === 0) {
      reasons.push('best available option');
    }

    return reasons.join(', ');
  }
}

export const serverService = new ServerService();
