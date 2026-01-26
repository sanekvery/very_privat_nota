/**
 * VPN Server Agent
 * Main entry point
 */

import app from './app';
import { config, validateConfig } from './config';
import { logger } from './logger';
import { wireguardService } from './services/wireguard.service';

async function startServer(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();

    logger.info('Starting VPN Server Agent', {
      port: config.port,
      host: config.host,
      wireguard: {
        interface: config.wireguard.interface,
        port: config.wireguard.port,
      },
      environment: config.nodeEnv,
    });

    // Check WireGuard status
    const isWgRunning = await wireguardService.isRunning();
    if (!isWgRunning) {
      logger.warn('WireGuard interface is not running', {
        interface: config.wireguard.interface,
      });
    } else {
      logger.info('WireGuard interface is running', {
        interface: config.wireguard.interface,
      });
    }

    // Start Express server
    const server = app.listen(config.port, config.host, () => {
      logger.info('Server started successfully', {
        port: config.port,
        host: config.host,
        urls: [
          `http://localhost:${config.port}`,
          `http://${config.host}:${config.port}`,
        ],
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);

      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Start the server
startServer();
