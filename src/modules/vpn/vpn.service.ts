/**
 * VPN Service
 * Main orchestration service for VPN configuration management
 *
 * Responsibilities:
 * - Generate VPN configs (IP allocation + key generation + peer registration)
 * - Rotate configs (new IP + new keys + update peer)
 * - Delete configs (remove peer + release IP)
 * - Validate server availability
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ExternalServiceError,
} from '@/lib/errors';
import { ipPoolService } from './ip-pool.service';
import { wireguardService } from './wireguard.service';
import { createAgentClient } from './agent-client';
import type { VpnConfig, ConfigOptions, ConfigRotation } from './vpn.types';
import { formatWireGuardConfig } from './vpn.types';
import type { VpnConfig as PrismaVpnConfig, VpnServer, IpPool } from '@prisma/client';

export class VpnService {
  /**
   * Generate VPN configuration for subscription
   * CRITICAL: Transactional operation to ensure consistency
   *
   * Steps:
   * 1. Validate subscription exists and is active
   * 2. Select best available server
   * 3. Allocate IP from pool (with SELECT FOR UPDATE)
   * 4. Generate WireGuard keys
   * 5. Register peer with VPN Agent
   * 6. Save config to database
   */
  async generateConfig(options: ConfigOptions): Promise<VpnConfig> {
    const { subscriptionId, serverId, userId } = options;

    // Validate subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true, plan: true },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription', subscriptionId);
    }

    if (subscription.userId !== userId) {
      throw new ValidationError('Subscription does not belong to user');
    }

    if (subscription.status !== 'active') {
      throw new ValidationError('Subscription is not active');
    }

    // Check config limit
    const existingConfigs = await prisma.vpnConfig.count({
      where: {
        subscriptionId,
        isActive: true,
      },
    });

    if (existingConfigs >= subscription.plan.maxConfigs) {
      throw new ConflictError(
        `Maximum configs reached (${subscription.plan.maxConfigs})`
      );
    }

    // Select server
    const server = serverId
      ? await this.getServer(serverId)
      : await this.selectBestServer();

    // Verify server is active
    if (!server.isActive || server.status !== 'active') {
      throw new ValidationError('Server is not available');
    }

    // Check server capacity
    const availableIps = await ipPoolService.getAvailableIpCount(server.id);
    if (availableIps === 0) {
      throw new ValidationError('Server has no available IPs');
    }

    // Generate keys
    const keys = wireguardService.generateKeys(true); // with preshared key

    // Allocate IP (transactional with SELECT FOR UPDATE)
    const ipAllocation = await ipPoolService.allocateIp(
      server.id,
      subscriptionId
    );

    // Update IP with keys
    await ipPoolService.updateIpKeys(ipAllocation.id, keys);

    // Create agent client
    const agent = createAgentClient(server);

    // Verify agent is healthy
    const isHealthy = await agent.healthCheck();
    if (!isHealthy) {
      // Rollback IP allocation
      await ipPoolService.releaseIp(ipAllocation.id);
      throw new ExternalServiceError('VPN Agent', 'Agent is not responding');
    }

    // Register peer with agent
    try {
      await agent.addPeer({
        publicKey: keys.publicKey,
        presharedKey: keys.presharedKey,
        allowedIPs: `${ipAllocation.ipAddress}/32`,
      });
    } catch (error) {
      // Rollback IP allocation
      await ipPoolService.releaseIp(ipAllocation.id);
      throw error;
    }

    // Create VPN config
    const config: VpnConfig = {
      subscriptionId,
      serverId: server.id,
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      presharedKey: keys.presharedKey,
      ipAddress: ipAllocation.ipAddress,
      serverPublicKey: server.publicKey,
      serverEndpoint: server.endpoint,
      allowedIPs: wireguardService.formatAllowedIPs(),
      dns: wireguardService.formatDNS(server.dns.split(',')),
      configText: '',
    };

    // Format config text
    config.configText = formatWireGuardConfig(config);

    // Save to database
    await prisma.vpnConfig.create({
      data: {
        subscriptionId,
        serverId: server.id,
        ipPoolId: ipAllocation.id,
        privateKey: keys.privateKey,
        publicKey: keys.publicKey,
        presharedKey: keys.presharedKey,
        configText: config.configText,
        isActive: true,
      },
    });

    // Update server stats
    await this.updateServerStats(server.id);

    logger.info('VPN config generated', {
      subscriptionId,
      serverId: server.id,
      ipAddress: ipAllocation.ipAddress,
    });

    return config;
  }

  /**
   * Rotate VPN configuration (new IP + new keys)
   * Use case: Security, user requested rotation
   */
  async rotateConfig(subscriptionId: string): Promise<ConfigRotation> {
    // Find existing active config
    const existingConfig = await prisma.vpnConfig.findFirst({
      where: {
        subscriptionId,
        isActive: true,
      },
      include: {
        ipPool: true,
        server: true,
      },
    });

    if (!existingConfig) {
      throw new NotFoundError('Active VPN config', subscriptionId);
    }

    const oldIpAddress = existingConfig.ipPool.ipAddress;

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription', subscriptionId);
    }

    // Deactivate old config
    await prisma.vpnConfig.update({
      where: { id: existingConfig.id },
      data: { isActive: false },
    });

    // Remove old peer from server
    const agent = createAgentClient(existingConfig.server);
    try {
      await agent.removePeer({
        publicKey: existingConfig.publicKey,
      });
    } catch (error) {
      logger.warn('Failed to remove old peer during rotation', {
        subscriptionId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      // Continue anyway - old peer will be inactive
    }

    // Release old IP
    await ipPoolService.releaseIp(existingConfig.ipPoolId);

    // Generate new config on same server
    const newConfig = await this.generateConfig({
      subscriptionId,
      serverId: existingConfig.serverId,
      userId: subscription.userId,
    });

    logger.info('VPN config rotated', {
      subscriptionId,
      oldIp: oldIpAddress,
      newIp: newConfig.ipAddress,
    });

    return {
      oldIpAddress,
      newConfig,
    };
  }

  /**
   * Delete VPN configuration
   */
  async deleteConfig(subscriptionId: string, configId: string): Promise<void> {
    const config = await prisma.vpnConfig.findUnique({
      where: { id: configId },
      include: {
        ipPool: true,
        server: true,
      },
    });

    if (!config) {
      throw new NotFoundError('VPN config', configId);
    }

    if (config.subscriptionId !== subscriptionId) {
      throw new ValidationError('Config does not belong to subscription');
    }

    // Remove peer from server
    const agent = createAgentClient(config.server);
    try {
      await agent.removePeer({
        publicKey: config.publicKey,
      });
    } catch (error) {
      logger.warn('Failed to remove peer from server', {
        configId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      // Continue anyway - we still want to cleanup database
    }

    // Release IP
    await ipPoolService.releaseIp(config.ipPoolId);

    // Mark config as inactive
    await prisma.vpnConfig.update({
      where: { id: configId },
      data: { isActive: false },
    });

    // Update server stats
    await this.updateServerStats(config.serverId);

    logger.info('VPN config deleted', {
      configId,
      subscriptionId,
      ipAddress: config.ipPool.ipAddress,
    });
  }

  /**
   * Get VPN config by ID
   */
  async getConfig(configId: string, userId: string): Promise<VpnConfig> {
    const config = await prisma.vpnConfig.findUnique({
      where: { id: configId },
      include: {
        subscription: true,
        server: true,
        ipPool: true,
      },
    });

    if (!config) {
      throw new NotFoundError('VPN config', configId);
    }

    if (config.subscription.userId !== userId) {
      throw new ValidationError('Config does not belong to user');
    }

    return {
      subscriptionId: config.subscriptionId,
      serverId: config.serverId,
      privateKey: config.privateKey,
      publicKey: config.publicKey,
      presharedKey: config.presharedKey || undefined,
      ipAddress: config.ipPool.ipAddress,
      serverPublicKey: config.server.publicKey,
      serverEndpoint: config.server.endpoint,
      allowedIPs: wireguardService.formatAllowedIPs(),
      dns: wireguardService.formatDNS(config.server.dns.split(',')),
      configText: config.configText,
    };
  }

  /**
   * Get all configs for subscription
   */
  async getSubscriptionConfigs(
    subscriptionId: string,
    userId: string
  ): Promise<VpnConfig[]> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription', subscriptionId);
    }

    if (subscription.userId !== userId) {
      throw new ValidationError('Subscription does not belong to user');
    }

    const configs = await prisma.vpnConfig.findMany({
      where: {
        subscriptionId,
        isActive: true,
      },
      include: {
        server: true,
        ipPool: true,
      },
    });

    return configs.map((config: PrismaVpnConfig & { server: VpnServer; ipPool: IpPool }) => ({
      subscriptionId: config.subscriptionId,
      serverId: config.serverId,
      privateKey: config.privateKey,
      publicKey: config.publicKey,
      presharedKey: config.presharedKey || undefined,
      ipAddress: config.ipPool.ipAddress,
      serverPublicKey: config.server.publicKey,
      serverEndpoint: config.server.endpoint,
      allowedIPs: wireguardService.formatAllowedIPs(),
      dns: wireguardService.formatDNS(config.server.dns.split(',')),
      configText: config.configText,
    }));
  }

  /**
   * Select best available server based on load and priority
   */
  private async selectBestServer() {
    const servers = await prisma.vpnServer.findMany({
      where: {
        isActive: true,
        status: 'active',
      },
      orderBy: {
        priority: 'desc',
      },
    });

    if (servers.length === 0) {
      throw new ValidationError('No active servers available');
    }

    // Find server with lowest load
    let bestServer = servers[0];
    let bestLoad = 1.0;

    for (const server of servers) {
      const availableIps = await ipPoolService.getAvailableIpCount(server.id);
      if (availableIps === 0) continue;

      const load = server.currentUsers / server.maxUsers;
      if (load < bestLoad) {
        bestLoad = load;
        bestServer = server;
      }
    }

    if (!bestServer) {
      throw new ValidationError('No servers with available capacity');
    }

    return bestServer;
  }

  /**
   * Get server by ID
   */
  private async getServer(serverId: string) {
    const server = await prisma.vpnServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundError('VPN Server', serverId);
    }

    return server;
  }

  /**
   * Update server statistics
   */
  private async updateServerStats(serverId: string): Promise<void> {
    const activeConfigs = await prisma.vpnConfig.count({
      where: {
        serverId,
        isActive: true,
      },
    });

    await prisma.vpnServer.update({
      where: { id: serverId },
      data: {
        currentUsers: activeConfigs,
      },
    });

    logger.debug('Server stats updated', {
      serverId,
      currentUsers: activeConfigs,
    });
  }
}

export const vpnService = new VpnService();
