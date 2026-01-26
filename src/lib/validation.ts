/**
 * Validation Helpers
 * Common validation utilities using Zod
 */

import { z } from 'zod';

// UUID validation
export const uuidSchema = z.string().uuid();

// Email validation
export const emailSchema = z.string().email();

// Telegram ID validation (BigInt)
export const telegramIdSchema = z
  .union([z.string(), z.number(), z.bigint()])
  .transform((val) => BigInt(val));

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Date range validation
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// TON wallet address validation (basic)
export const tonWalletSchema = z
  .string()
  .regex(
    /^[UEk][Qf][a-zA-Z0-9_-]{46}$/,
    'Invalid TON wallet address'
  );

// Promo code validation
export const promoCodeSchema = z
  .string()
  .min(4)
  .max(32)
  .regex(/^[A-Z0-9_-]+$/, 'Promo code must contain only uppercase letters, numbers, hyphens and underscores');

// Referral code validation
export const referralCodeSchema = z
  .string()
  .length(8)
  .regex(/^[A-Z0-9]+$/, 'Referral code must contain only uppercase letters and numbers');

// IP address validation
export const ipAddressSchema = z
  .string()
  .ip({ version: 'v4' });

// CIDR subnet validation
export const cidrSubnetSchema = z
  .string()
  .regex(
    /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/,
    'Invalid CIDR notation'
  );

// Country code validation (ISO 3166-1 alpha-2)
export const countryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/, 'Country code must be 2 uppercase letters');

// Language code validation
export const languageCodeSchema = z.enum(['ru', 'en']);

// WireGuard key validation (base64, 44 chars)
export const wireguardKeySchema = z
  .string()
  .length(44)
  .regex(/^[A-Za-z0-9+/]{43}=$/, 'Invalid WireGuard key format');

// Helper to parse and validate request body
export async function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<T> {
  return schema.parseAsync(data);
}

// Helper to create paginated response
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
