/**
 * Redis Client
 * Singleton instance for caching and pub/sub
 */

import Redis from 'ioredis';
import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisClient {
  private static instance: Redis | null = null;

  static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          logger.error('Redis reconnecting on error:', err);
          return true;
        },
      });

      RedisClient.instance.on('connect', () => {
        logger.info('Redis connected');
      });

      RedisClient.instance.on('error', (err) => {
        logger.error('Redis error:', err);
      });

      RedisClient.instance.on('close', () => {
        logger.warn('Redis connection closed');
      });
    }

    return RedisClient.instance;
  }

  static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit();
      RedisClient.instance = null;
    }
  }
}

export const redis = RedisClient.getInstance();
export default redis;
