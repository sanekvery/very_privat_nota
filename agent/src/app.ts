/**
 * Express Application
 * Main application setup
 */

import express, { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// Routes
import healthRoutes from './routes/health';
import peersRoutes from './routes/peers';
import metricsRoutes from './routes/metrics';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/peers', peersRoutes);
app.use('/metrics', metricsRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'VPN Server Agent',
    version: '1.0.0',
    status: 'running',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'NotFound',
    message: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
    details: err.message,
  });
});

export default app;
