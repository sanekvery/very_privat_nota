/**
 * Session Management Service
 * Handles user sessions in Redis
 */

import { randomUUID } from 'crypto';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { UnauthorizedError, InvalidTokenError } from '@/lib/errors';
import type { SessionData } from './auth.types';

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export class SessionService {
  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    isAdmin: boolean,
    telegramId?: bigint
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);

    const sessionData: SessionData = {
      userId,
      telegramId,
      isAdmin,
      createdAt: now,
      expiresAt,
    };

    const key = this.getSessionKey(token);

    try {
      await redis.setex(
        key,
        SESSION_TTL,
        JSON.stringify(sessionData, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      );

      logger.info('Session created', { userId, token: token.substring(0, 8) });

      return { token, expiresAt };
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Get session by token
   */
  async getSession(token: string): Promise<SessionData> {
    const key = this.getSessionKey(token);

    try {
      const data = await redis.get(key);

      if (!data) {
        throw new InvalidTokenError('Session not found or expired');
      }

      const session = JSON.parse(data, (_, value) => {
        // Restore BigInt
        if (typeof value === 'string' && /^\d+$/.test(value)) {
          try {
            return BigInt(value);
          } catch {
            return value;
          }
        }
        // Restore Dates
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
          return new Date(value);
        }
        return value;
      }) as SessionData;

      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        await this.deleteSession(token);
        throw new InvalidTokenError('Session has expired');
      }

      return session;
    } catch (error) {
      if (
        error instanceof InvalidTokenError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      logger.error('Failed to get session:', error);
      throw new UnauthorizedError('Invalid session');
    }
  }

  /**
   * Refresh session TTL
   */
  async refreshSession(token: string): Promise<Date> {
    const session = await this.getSession(token);
    const key = this.getSessionKey(token);

    const newExpiresAt = new Date(Date.now() + SESSION_TTL * 1000);
    session.expiresAt = newExpiresAt;

    try {
      await redis.setex(
        key,
        SESSION_TTL,
        JSON.stringify(session, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      );

      logger.debug('Session refreshed', {
        userId: session.userId,
        token: token.substring(0, 8),
      });

      return newExpiresAt;
    } catch (error) {
      logger.error('Failed to refresh session:', error);
      throw new Error('Failed to refresh session');
    }
  }

  /**
   * Delete session (logout)
   */
  async deleteSession(token: string): Promise<void> {
    const key = this.getSessionKey(token);

    try {
      await redis.del(key);
      logger.info('Session deleted', { token: token.substring(0, 8) });
    } catch (error) {
      logger.error('Failed to delete session:', error);
      throw new Error('Failed to delete session');
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<void> {
    try {
      // Find all session keys for this user
      const pattern = `${SESSION_PREFIX}*`;
      const keys = await redis.keys(pattern);

      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const session = JSON.parse(data) as SessionData;
          if (session.userId === userId) {
            await redis.del(key);
          }
        }
      }

      logger.info('All user sessions deleted', { userId });
    } catch (error) {
      logger.error('Failed to delete user sessions:', error);
      throw new Error('Failed to delete user sessions');
    }
  }

  /**
   * Validate session token and return session data
   */
  async validateToken(token: string): Promise<SessionData> {
    if (!token) {
      throw new UnauthorizedError('No session token provided');
    }

    // Validate token format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      throw new InvalidTokenError('Invalid token format');
    }

    return this.getSession(token);
  }

  /**
   * Get session key for Redis
   */
  private getSessionKey(token: string): string {
    return `${SESSION_PREFIX}${token}`;
  }

  /**
   * Get active sessions count for a user
   */
  async getUserSessionsCount(userId: string): Promise<number> {
    try {
      const pattern = `${SESSION_PREFIX}*`;
      const keys = await redis.keys(pattern);

      let count = 0;
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const session = JSON.parse(data) as SessionData;
          if (session.userId === userId) {
            count++;
          }
        }
      }

      return count;
    } catch (error) {
      logger.error('Failed to count user sessions:', error);
      return 0;
    }
  }
}

export const sessionService = new SessionService();
