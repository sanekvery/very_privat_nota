/**
 * IP Pool Management Service
 * CRITICAL: Manages IP allocation with SELECT FOR UPDATE to prevent collisions
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  IpPoolExhaustedError,
  NotFoundError,
} from '@/lib/errors';
import type { IpPool } from '@prisma/client';

export class IpPoolService {
  /**
   * Allocate IP address from pool with SELECT FOR UPDATE
   * CRITICAL: Prevents race conditions when multiple users subscribe simultaneously
   */
  async allocateIp(
    serverId: string,
    subscriptionId: string
  ): Promise<IpPool> {
    return await prisma.$transaction(async (tx) => {
      // SELECT FOR UPDATE - locks the row until transaction completes
      // This prevents other transactions from allocating the same IP
      const availableIp = await tx.$queryRaw<IpPool[]>`
        SELECT * FROM ip_pools
        WHERE server_id = ${serverId}::uuid
          AND is_allocated = false
        ORDER BY ip_address
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      if (!availableIp || availableIp.length === 0) {
        throw new IpPoolExhaustedError(serverId);
      }

      const ip = availableIp[0]!;

      // Mark as allocated
      const allocatedIp = await tx.ipPool.update({
        where: { id: ip.id },
        data: {
          isAllocated: true,
          allocatedTo: subscriptionId,
          allocatedAt: new Date(),
          releasedAt: null,
        },
      });

      logger.info('IP allocated', {
        serverId,
        subscriptionId,
        ipAddress: allocatedIp.ipAddress,
      });

      return allocatedIp;
    });
  }

  /**
   * Release IP address back to pool
   */
  async releaseIp(ipPoolId: string): Promise<void> {
    const ip = await prisma.ipPool.findUnique({
      where: { id: ipPoolId },
    });

    if (!ip) {
      throw new NotFoundError('IP Pool entry', ipPoolId);
    }

    await prisma.ipPool.update({
      where: { id: ipPoolId },
      data: {
        isAllocated: false,
        allocatedTo: null,
        releasedAt: new Date(),
        // Keep keys for audit trail
      },
    });

    logger.info('IP released', {
      ipAddress: ip.ipAddress,
      serverId: ip.serverId,
    });
  }

  /**
   * Release IP by subscription
   */
  async releaseIpBySubscription(subscriptionId: string): Promise<void> {
    const ips = await prisma.ipPool.findMany({
      where: { allocatedTo: subscriptionId },
    });

    for (const ip of ips) {
      await this.releaseIp(ip.id);
    }

    logger.info('All IPs released for subscription', {
      subscriptionId,
      count: ips.length,
    });
  }

  /**
   * Get available IP count for server
   */
  async getAvailableIpCount(serverId: string): Promise<number> {
    return await prisma.ipPool.count({
      where: {
        serverId,
        isAllocated: false,
      },
    });
  }

  /**
   * Get allocated IPs for subscription
   */
  async getAllocatedIps(subscriptionId: string): Promise<IpPool[]> {
    return await prisma.ipPool.findMany({
      where: {
        allocatedTo: subscriptionId,
        isAllocated: true,
      },
    });
  }

  /**
   * Initialize IP pool for server
   * Creates IP addresses from CIDR subnet
   */
  async initializeServerIpPool(
    serverId: string,
    subnet: string
  ): Promise<number> {
    const [network, cidr] = subnet.split('/');
    if (!network || !cidr) {
      throw new Error('Invalid subnet format');
    }

    const parts = network.split('.').map(Number);
    if (parts.length !== 4) {
      throw new Error('Invalid network address');
    }

    const [oct1, oct2, oct3] = parts;
    const cidrNum = parseInt(cidr, 10);

    // Calculate available IPs (simplified for /24 networks)
    const totalIps = Math.pow(2, 32 - cidrNum) - 2; // Exclude network and broadcast
    const maxIps = Math.min(totalIps, 250); // Limit to 250 IPs per server

    const ips: { serverId: string; ipAddress: string }[] = [];

    // Generate IP addresses
    // For /24: 10.0.1.2 to 10.0.1.254
    if (cidrNum === 24) {
      for (let i = 2; i <= Math.min(254, maxIps + 1); i++) {
        ips.push({
          serverId,
          ipAddress: `${oct1}.${oct2}.${oct3}.${i}`,
        });
      }
    } else {
      throw new Error('Only /24 subnets are currently supported');
    }

    // Batch insert IPs
    await prisma.ipPool.createMany({
      data: ips,
      skipDuplicates: true,
    });

    logger.info('IP pool initialized', {
      serverId,
      subnet,
      count: ips.length,
    });

    return ips.length;
  }

  /**
   * Check if IP is available
   */
  async isIpAvailable(serverId: string, ipAddress: string): Promise<boolean> {
    const ip = await prisma.ipPool.findFirst({
      where: {
        serverId,
        ipAddress,
      },
    });

    return ip ? !ip.isAllocated : false;
  }

  /**
   * Update IP keys (for key rotation)
   */
  async updateIpKeys(
    ipPoolId: string,
    keys: {
      privateKey: string;
      publicKey: string;
      presharedKey?: string;
    }
  ): Promise<void> {
    await prisma.ipPool.update({
      where: { id: ipPoolId },
      data: {
        privateKey: keys.privateKey,
        publicKey: keys.publicKey,
        presharedKey: keys.presharedKey,
      },
    });

    logger.debug('IP keys updated', { ipPoolId });
  }

  /**
   * Get IP pool statistics
   */
  async getPoolStats(serverId: string) {
    const [total, allocated, available] = await Promise.all([
      prisma.ipPool.count({ where: { serverId } }),
      prisma.ipPool.count({ where: { serverId, isAllocated: true } }),
      prisma.ipPool.count({ where: { serverId, isAllocated: false } }),
    ]);

    return {
      total,
      allocated,
      available,
      utilizationPercentage: total > 0 ? (allocated / total) * 100 : 0,
    };
  }
}

export const ipPoolService = new IpPoolService();
