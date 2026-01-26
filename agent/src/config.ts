/**
 * Agent Configuration
 * Environment-based configuration
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  // Security
  bearerToken: process.env.BEARER_TOKEN || '',

  // WireGuard configuration
  wireguard: {
    interface: process.env.WG_INTERFACE || 'wg0',
    configPath: process.env.WG_CONFIG_PATH || '/etc/wireguard/wg0.conf',
    port: parseInt(process.env.WG_PORT || '51820', 10),
    subnet: process.env.WG_SUBNET || '10.0.0.0/24',
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
};

// Validate required config
export function validateConfig(): void {
  if (!config.bearerToken && config.isProduction) {
    throw new Error('BEARER_TOKEN is required in production');
  }

  if (!config.wireguard.interface) {
    throw new Error('WG_INTERFACE is required');
  }
}
