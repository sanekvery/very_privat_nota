/**
 * Winston Logger
 * Structured logging with different levels
 */

import winston from 'winston';
import path from 'path';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(
    ({ timestamp, level, message, ...meta }) =>
      `${timestamp} [${level}]: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
      }`
  )
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
    level: LOG_LEVEL,
  }),
];

// File transports only in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format: logFormat,
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  transports,
  exitOnError: false,
});

export default logger;
