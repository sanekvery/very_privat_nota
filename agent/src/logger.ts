/**
 * Logger Configuration
 * Winston-based structured logging
 */

import winston from 'winston';
import { config } from './config';

export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'vpn-agent' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Log startup
logger.info('Logger initialized', {
  level: config.logLevel,
  environment: config.nodeEnv,
});
