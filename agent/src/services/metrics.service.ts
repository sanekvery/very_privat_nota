/**
 * Metrics Service
 * Collects system and WireGuard metrics
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { logger } from '../logger';
import { wireguardService } from './wireguard.service';
import type { ServerMetrics } from '../types';

const execAsync = promisify(exec);

class MetricsService {
  /**
   * Get CPU usage percentage
   */
  async getCpuUsage(): Promise<number> {
    try {
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach((cpu) => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - (100 * idle) / total;

      return Math.round(usage * 100) / 100;
    } catch (error) {
      logger.error('Failed to get CPU usage', { error });
      return 0;
    }
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsage(): number {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usage = (usedMem / totalMem) * 100;

      return Math.round(usage * 100) / 100;
    } catch (error) {
      logger.error('Failed to get memory usage', { error });
      return 0;
    }
  }

  /**
   * Get disk usage percentage
   */
  async getDiskUsage(): Promise<number> {
    try {
      const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'");
      return parseInt(stdout.trim(), 10);
    } catch (error) {
      logger.error('Failed to get disk usage', { error });
      return 0;
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<{ bytesReceived: number; bytesSent: number }> {
    try {
      // This is a simplified version - in production you'd want to track delta
      const { stdout } = await execAsync("cat /proc/net/dev | grep -v 'lo:' | awk '{rx+=$2; tx+=$10} END {print rx, tx}'");
      const [rx, tx] = stdout.trim().split(' ').map(Number);

      return {
        bytesReceived: rx || 0,
        bytesSent: tx || 0,
      };
    } catch (error) {
      logger.error('Failed to get network stats', { error });
      return { bytesReceived: 0, bytesSent: 0 };
    }
  }

  /**
   * Get comprehensive server metrics
   */
  async getServerMetrics(): Promise<ServerMetrics> {
    try {
      const [cpuUsage, memoryUsage, diskUsage, networkStats, peers] = await Promise.all([
        this.getCpuUsage(),
        Promise.resolve(this.getMemoryUsage()),
        this.getDiskUsage(),
        this.getNetworkStats(),
        wireguardService.getAllPeers(),
      ]);

      const activePeers = peers.filter((peer) => {
        // Consider peer active if handshake within last 3 minutes
        const now = Math.floor(Date.now() / 1000);
        return peer.latestHandshake && now - peer.latestHandshake < 180;
      }).length;

      return {
        cpuUsage,
        memoryUsage,
        diskUsage,
        networkStats,
        wireguard: {
          activePeers,
          totalPeers: peers.length,
          peers,
        },
      };
    } catch (error) {
      logger.error('Failed to get server metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return default metrics on error
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkStats: { bytesReceived: 0, bytesSent: 0 },
        wireguard: {
          activePeers: 0,
          totalPeers: 0,
          peers: [],
        },
      };
    }
  }
}

export const metricsService = new MetricsService();
