/**
 * VPN Module Validation Schemas
 * Zod schemas for VPN input validation
 */

import { z } from 'zod';
import {
  uuidSchema,
  wireguardKeySchema,
} from '@/lib/validation';

// Generate config request
export const generateConfigSchema = z.object({
  subscriptionId: uuidSchema,
  serverId: uuidSchema.optional(),
});

export type GenerateConfigInput = z.infer<typeof generateConfigSchema>;

// Rotate config request
export const rotateConfigSchema = z.object({
  subscriptionId: uuidSchema,
});

export type RotateConfigInput = z.infer<typeof rotateConfigSchema>;

// Delete config request
export const deleteConfigSchema = z.object({
  subscriptionId: uuidSchema,
});

export type DeleteConfigInput = z.infer<typeof deleteConfigSchema>;

// IP allocation schema
export const ipAllocationSchema = z.object({
  serverId: uuidSchema,
  subscriptionId: uuidSchema,
});

// WireGuard key validation
export const wireGuardKeyPairSchema = z.object({
  privateKey: wireguardKeySchema,
  publicKey: wireguardKeySchema,
  presharedKey: wireguardKeySchema.optional(),
});
