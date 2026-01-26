/**
 * Telegram Authentication Service
 * Validates Telegram WebApp initData
 */

import crypto from 'crypto';
import { MOCK_MODE } from '@/lib/constants';
import { UnauthorizedError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { TelegramInitData, ValidatedTelegramData } from './auth.types';
import { telegramInitDataSchema } from './auth.validation';

export class TelegramAuthService {
  private readonly botToken: string;
  private readonly isMockMode: boolean;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.isMockMode = MOCK_MODE.TELEGRAM;

    if (!this.botToken && !this.isMockMode) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }
  }

  /**
   * Validate Telegram WebApp initData
   * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   */
  async validateInitData(initDataString: string): Promise<ValidatedTelegramData> {
    if (this.isMockMode) {
      return this.mockValidation(initDataString);
    }

    try {
      // Parse initData query string
      const params = new URLSearchParams(initDataString);
      const hash = params.get('hash');

      if (!hash) {
        throw new UnauthorizedError('Missing hash in initData');
      }

      // Remove hash from params for validation
      params.delete('hash');

      // Sort params alphabetically and create data-check-string
      const sortedParams = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Validate signature
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(sortedParams)
        .digest('hex');

      if (calculatedHash !== hash) {
        throw new UnauthorizedError('Invalid initData hash');
      }

      // Parse and validate data
      const initData = this.parseInitData(params);
      const validated = telegramInitDataSchema.parse(initData);

      if (!validated.user) {
        throw new UnauthorizedError('User data not found in initData');
      }

      // Check auth_date is recent (within last hour)
      const authDate = new Date(validated.auth_date * 1000);
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      if (authDate < hourAgo) {
        throw new UnauthorizedError('initData is too old');
      }

      return {
        user: validated.user,
        authDate,
        queryId: validated.query_id,
        startParam: validated.start_param,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Failed to validate Telegram initData:', error);
      throw new UnauthorizedError('Invalid Telegram authentication data');
    }
  }

  /**
   * Parse URLSearchParams to TelegramInitData
   */
  private parseInitData(params: URLSearchParams): TelegramInitData {
    const userStr = params.get('user');
    const authDateStr = params.get('auth_date');
    const hash = params.get('hash');

    return {
      user: userStr ? JSON.parse(decodeURIComponent(userStr)) : undefined,
      auth_date: authDateStr ? parseInt(authDateStr, 10) : 0,
      hash: hash || '',
      query_id: params.get('query_id') || undefined,
      start_param: params.get('start_param') || undefined,
    };
  }

  /**
   * Mock validation for development
   */
  private mockValidation(initDataString: string): ValidatedTelegramData {
    logger.warn('Using mock Telegram authentication - FOR DEVELOPMENT ONLY');

    // Try to parse whatever data is provided, or use defaults
    try {
      const params = new URLSearchParams(initDataString);
      const userStr = params.get('user');

      if (userStr) {
        const user = JSON.parse(decodeURIComponent(userStr));
        return {
          user,
          authDate: new Date(),
          queryId: params.get('query_id') || undefined,
          startParam: params.get('start_param') || undefined,
        };
      }
    } catch {
      // Fallback to default mock user
    }

    // Default mock user for testing
    return {
      user: {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'ru',
      },
      authDate: new Date(),
    };
  }
}

export const telegramAuthService = new TelegramAuthService();
