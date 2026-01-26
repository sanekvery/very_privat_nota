/**
 * Authentication Middleware
 * Bearer token verification
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../logger';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Skip auth in development if no token set
  if (config.isDevelopment && !config.bearerToken) {
    logger.warn('Authentication skipped in development mode');
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header',
    });
    return;
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer') {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authorization type. Use Bearer token',
    });
    return;
  }

  if (token !== config.bearerToken) {
    logger.warn('Invalid bearer token attempt', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid bearer token',
    });
    return;
  }

  next();
}
