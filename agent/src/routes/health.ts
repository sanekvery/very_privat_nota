/**
 * Health Check Routes
 * GET /health - Health check endpoint
 */

import { Router, Request, Response } from 'express';
import { wireguardService } from '../services/wireguard.service';
import { metricsService } from '../services/metrics.service';
import { config } from '../config';
import type { HealthCheckResponse } from '../types';

const router = Router();

/**
 * GET /health
 * Health check endpoint (no auth required)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const [isWgRunning, cpuUsage, memoryUsage, diskUsage] = await Promise.all([
      wireguardService.isRunning(),
      metricsService.getCpuUsage(),
      Promise.resolve(metricsService.getMemoryUsage()),
      metricsService.getDiskUsage(),
    ]);

    const response: HealthCheckResponse = {
      status: isWgRunning ? 'healthy' : 'unhealthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      wireguard: {
        running: isWgRunning,
        interface: config.wireguard.interface,
      },
      system: {
        cpuUsage,
        memoryUsage,
        diskUsage,
      },
    };

    const statusCode = isWgRunning ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    res.status(500).json({
      error: 'HealthCheckError',
      message: 'Failed to perform health check',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
