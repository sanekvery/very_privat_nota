/**
 * Application Constants
 * Centralized configuration values
 */

// Feature Flags
export const FEATURES = {
  REFERRALS: process.env.FEATURE_REFERRALS === 'true',
  WITHDRAWALS: process.env.FEATURE_WITHDRAWALS === 'true',
  PROMO_CODES: process.env.FEATURE_PROMO_CODES === 'true',
  NEWS: process.env.FEATURE_NEWS === 'true',
} as const;

// Mock Modes
export const MOCK_MODE = {
  TELEGRAM: process.env.TELEGRAM_MOCK_MODE === 'true',
  TON: process.env.TON_MOCK_MODE === 'true',
  VPN_AGENT: process.env.VPN_AGENT_MOCK === 'true',
} as const;

// Referral Settings
export const REFERRAL = {
  FIRST_PAYMENT_PERCENTAGE:
    Number(process.env.DEFAULT_REFERRAL_FIRST_PAYMENT_PERCENT) || 20,
  RECURRING_PERCENTAGE:
    Number(process.env.DEFAULT_REFERRAL_RECURRING_PERCENT) || 10,
  MIN_WITHDRAWAL_AMOUNT:
    Number(process.env.DEFAULT_MIN_WITHDRAWAL_AMOUNT) || 1,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Cache TTL (seconds)
export const CACHE_TTL = {
  USER: 300, // 5 minutes
  SUBSCRIPTION: 180, // 3 minutes
  SERVER: 60, // 1 minute
  PLAN: 3600, // 1 hour
} as const;

// Rate Limiting
export const RATE_LIMIT = {
  USER_REQUESTS_PER_MINUTE: 100,
  ADMIN_REQUESTS_PER_MINUTE: 1000,
  WINDOW_MS: 60000, // 1 minute
} as const;

// Subscriptions
export const SUBSCRIPTION = {
  EXPIRY_WARNING_DAYS:
    Number(process.env.NOTIFICATION_EXPIRY_DAYS_BEFORE) || 3,
  AUTO_CANCEL_AFTER_DAYS: 7,
} as const;

// VPN
export const VPN = {
  DEFAULT_DNS: '1.1.1.1,8.8.8.8',
  DEFAULT_LISTEN_PORT: 51820,
  AGENT_PORT: Number(process.env.DEFAULT_AGENT_PORT) || 51821,
  AGENT_SECRET_LENGTH: Number(process.env.AGENT_SECRET_LENGTH) || 64,
} as const;

// Monitoring
export const MONITORING = {
  HEALTH_CHECK_INTERVAL:
    Number(process.env.HEALTH_CHECK_INTERVAL) || 300, // 5 minutes
  SERVER_OVERLOAD_THRESHOLD: 0.9, // 90% capacity
} as const;

// Locales
export const LOCALES = {
  DEFAULT: (process.env.DEFAULT_LOCALE as 'ru' | 'en') || 'ru',
  SUPPORTED: (process.env.SUPPORTED_LOCALES?.split(',') || ['ru', 'en']) as ReadonlyArray<
    'ru' | 'en'
  >,
} as const;

// Admin
export const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
