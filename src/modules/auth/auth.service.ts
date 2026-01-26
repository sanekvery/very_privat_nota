/**
 * Authentication Service
 * Main authentication logic and user management
 */

import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ADMIN_SECRET } from '@/lib/constants';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors';
import { telegramAuthService } from './telegram.service';
import { sessionService } from './session.service';
import type {
  AuthResult,
  AuthUser,
  AdminCredentials,
} from './auth.types';

class AuthService {
  /**
   * Authenticate user via Telegram WebApp
   */
  async authenticateWithTelegram(
    initData: string,
    startParam?: string
  ): Promise<AuthResult> {
    // Validate Telegram initData
    const validatedData = await telegramAuthService.validateInitData(initData);

    const telegramUser = validatedData.user;
    const telegramId = BigInt(telegramUser.id);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      // Create new user
      const referralCode = this.generateReferralCode();
      const referredBy = startParam || undefined;

      user = await prisma.user.create({
        data: {
          telegramId,
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          languageCode: telegramUser.language_code || 'ru',
          referralCode,
          referredBy,
        },
      });

      logger.info('New user created via Telegram', {
        userId: user.id,
        telegramId: user.telegramId?.toString(),
      });
    } else {
      // Update existing user info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          languageCode: telegramUser.language_code || user.languageCode,
          lastLoginAt: new Date(),
        },
      });

      logger.info('User logged in via Telegram', {
        userId: user.id,
        telegramId: user.telegramId?.toString(),
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      throw new ForbiddenError(
        `User is banned${user.banReason ? `: ${user.banReason}` : ''}`
      );
    }

    // Create session
    const { token, expiresAt } = await sessionService.createSession(
      user.id,
      user.isAdmin,
      user.telegramId || undefined
    );

    const authUser = (await import('./auth.types')).toAuthUser(user);

    return {
      user: authUser,
      sessionToken: token,
      expiresAt,
    };
  }

  /**
   * Authenticate admin
   */
  async authenticateAdmin(credentials: AdminCredentials): Promise<AuthResult> {
    // Validate admin secret
    if (credentials.secret !== ADMIN_SECRET) {
      logger.warn('Invalid admin secret attempt');
      throw new UnauthorizedError('Invalid admin credentials');
    }

    if (!ADMIN_SECRET) {
      throw new Error('ADMIN_SECRET not configured');
    }

    // If telegramId provided, find specific admin
    let user;
    if (credentials.telegramId) {
      const telegramId = BigInt(credentials.telegramId);
      user = await prisma.user.findFirst({
        where: {
          telegramId,
          isAdmin: true,
        },
      });

      if (!user) {
        throw new NotFoundError('Admin user', credentials.telegramId);
      }
    } else {
      // Find any admin or use default
      user = await prisma.user.findFirst({
        where: { isAdmin: true },
      });

      if (!user) {
        throw new UnauthorizedError('No admin users found');
      }
    }

    // Update last login
    user = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info('Admin logged in', { userId: user.id });

    // Create session
    const { token, expiresAt } = await sessionService.createSession(
      user.id,
      true,
      user.telegramId || undefined
    );

    const authUser = (await import('./auth.types')).toAuthUser(user);

    return {
      user: authUser,
      sessionToken: token,
      expiresAt,
    };
  }

  /**
   * Get current user by session token
   */
  async getCurrentUser(token: string): Promise<AuthUser> {
    const session = await sessionService.validateToken(token);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      throw new NotFoundError('User', session.userId);
    }

    if (user.isBanned) {
      await sessionService.deleteSession(token);
      throw new ForbiddenError('User is banned');
    }

    // Refresh session
    await sessionService.refreshSession(token);

    return (await import('./auth.types')).toAuthUser(user);
  }

  /**
   * Logout user
   */
  async logout(token: string): Promise<void> {
    await sessionService.deleteSession(token);
    logger.info('User logged out');
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await sessionService.deleteUserSessions(userId);
    logger.info('User logged out from all devices', { userId });
  }

  /**
   * Validate session and return user
   */
  async validateSession(token: string): Promise<AuthUser> {
    return this.getCurrentUser(token);
  }

  /**
   * Generate unique referral code
   */
  private generateReferralCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    return user?.isAdmin || false;
  }

  /**
   * Ban user
   */
  async banUser(
    userId: string,
    reason?: string,
    adminId?: string
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        banReason: reason,
      },
    });

    // Delete all user sessions
    await sessionService.deleteUserSessions(userId);

    logger.info('User banned', { userId, reason, adminId });
  }

  /**
   * Unban user
   */
  async unbanUser(userId: string, adminId?: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        banReason: null,
      },
    });

    logger.info('User unbanned', { userId, adminId });
  }
}

export const authService = new AuthService();
