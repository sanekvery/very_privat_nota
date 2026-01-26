/**
 * Global TypeScript Types
 * Shared types used across the application
 */

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

// API Error Response
export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: unknown;
}

// Authenticated User (without sensitive data)
export interface AuthUser {
  id: string;
  telegramId: bigint | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string;
  isAdmin: boolean;
  referralCode: string;
}

// Session data
export interface SessionData {
  userId: string;
  isAdmin: boolean;
  expiresAt: Date;
}

// Telegram WebApp InitData
export interface TelegramInitData {
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  };
  auth_date: number;
  hash: string;
  query_id?: string;
  start_param?: string;
}

// VPN Configuration
export interface VpnConfig {
  configText: string;
  qrCode?: string;
  server: {
    id: string;
    name: string;
    countryCode: string;
  };
}

// Subscription with details
export interface SubscriptionDetails {
  id: string;
  status: string;
  startDate: Date;
  endDate: Date;
  plan: {
    id: string;
    name: string;
    maxConfigs: number;
    price: number;
  };
  configs: VpnConfig[];
}

// Payment details
export interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  createdAt: Date;
  completedAt?: Date;
}

// Server with health status
export interface ServerWithHealth {
  id: string;
  name: string;
  countryCode: string;
  city: string | null;
  status: string;
  currentUsers: number;
  maxUsers: number;
  loadPercentage: number;
  isActive: boolean;
  lastHealthCheck: Date | null;
  healthStatus?: {
    isHealthy: boolean;
    cpuUsage?: number;
    memoryUsage?: number;
    activeConnections?: number;
  };
}

// Referral statistics
export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarned: number;
  availableBalance: number;
  canWithdraw: boolean;
  minWithdrawalAmount: number;
}

// Analytics data
export interface Analytics {
  users: {
    total: number;
    active: number;
    new: number;
  };
  subscriptions: {
    total: number;
    active: number;
    expiring: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
  };
  servers: {
    total: number;
    active: number;
    overloaded: number;
  };
}

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
