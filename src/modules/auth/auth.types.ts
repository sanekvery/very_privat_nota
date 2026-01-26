/**
 * AUTH Module Types
 * Domain types for authentication and authorization
 */

import type { User } from '@prisma/client';

// Telegram WebApp User Data
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

// Telegram Init Data (from WebApp)
export interface TelegramInitData {
  user?: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
  start_param?: string;
}

// Parsed and validated Telegram data
export interface ValidatedTelegramData {
  user: TelegramUser;
  authDate: Date;
  queryId?: string;
  startParam?: string;
}

// Session Data stored in Redis
export interface SessionData {
  userId: string;
  telegramId?: bigint;
  isAdmin: boolean;
  createdAt: Date;
  expiresAt: Date;
}

// Authentication Result
export interface AuthResult {
  user: AuthUser;
  sessionToken: string;
  expiresAt: Date;
}

// Public user data (no sensitive info)
export interface AuthUser {
  id: string;
  telegramId: bigint | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string;
  isAdmin: boolean;
  isBanned: boolean;
  referralCode: string;
  referralBalance: number;
  createdAt: Date;
}

// Admin login credentials
export interface AdminCredentials {
  secret: string;
  telegramId?: string;
}

// Auth context for requests
export interface AuthContext {
  user: AuthUser;
  session: SessionData;
}

// Helper to convert Prisma User to AuthUser
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    languageCode: user.languageCode,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    referralCode: user.referralCode,
    referralBalance: Number(user.referralBalance),
    createdAt: user.createdAt,
  };
}
