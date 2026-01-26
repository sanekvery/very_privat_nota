/**
 * AUTH Module Validation Schemas
 * Zod schemas for input validation
 */

import { z } from 'zod';

// Telegram authentication request
export const telegramAuthSchema = z.object({
  initData: z.string().min(1, 'initData is required'),
  startParam: z.string().optional(),
});

export type TelegramAuthInput = z.infer<typeof telegramAuthSchema>;

// Admin authentication request
export const adminAuthSchema = z.object({
  secret: z.string().min(32, 'Invalid admin secret'),
  telegramId: z.string().optional(),
});

export type AdminAuthInput = z.infer<typeof adminAuthSchema>;

// Session token validation
export const sessionTokenSchema = z.string().uuid();

// Telegram user schema (for parsing initData)
export const telegramUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
  is_premium: z.boolean().optional(),
  photo_url: z.string().url().optional(),
});

// Telegram init data schema (parsed from initData string)
export const telegramInitDataSchema = z.object({
  user: telegramUserSchema.optional(),
  auth_date: z.number(),
  hash: z.string(),
  query_id: z.string().optional(),
  start_param: z.string().optional(),
});
