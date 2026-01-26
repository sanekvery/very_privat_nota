/**
 * Metrics Routes
 * GET /metrics - Get server metrics
 */

import { Router, Request, Response } from 'express';
import { metricsService } from '../services/metrics.service';
import { logger } from '../logger';
import { requireAuth } from '../middleware/auth';
import type { SuccessResponse } from '../types';

const router = Router();

// All metrics routes require authentication
router.use(requireAuth);

/**
 * GET /metrics
 * Get comprehensive server metrics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getServerMetrics();

    const response: SuccessResponse = {
      success: true,
      data: metrics,
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get metrics via API', { error });

    res.status(500).json({
      error: 'MetricsError',
      message: 'Failed to get metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
