/**
 * WireGuard Service
 * Generates WireGuard keys using proper Curve25519 implementation
 */

import { generateKeyPairSync, randomBytes } from 'crypto';
import { logger } from '@/lib/logger';
import type { WireGuardKeyPair } from './vpn.types';

export class WireGuardService {
  /**
   * Generate WireGuard key pair (Curve25519)
   * Uses Node.js crypto for proper X25519 key generation
   */
  generateKeyPair(): WireGuardKeyPair {
    try {
      // Generate X25519 key pair (Curve25519)
      const { privateKey, publicKey } = generateKeyPairSync('x25519', {
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'der',
        },
        publicKeyEncoding: {
          type: 'spki',
          format: 'der',
        },
      });

      // Extract raw 32-byte keys from DER format
      // PKCS8 private key: last 32 bytes
      // SPKI public key: last 32 bytes
      const privateKeyRaw = privateKey.subarray(-32);
      const publicKeyRaw = publicKey.subarray(-32);

      // Convert to base64 (WireGuard format)
      const privateKeyBase64 = privateKeyRaw.toString('base64');
      const publicKeyBase64 = publicKeyRaw.toString('base64');

      logger.debug('WireGuard key pair generated');

      return {
        privateKey: privateKeyBase64,
        publicKey: publicKeyBase64,
      };
    } catch (error) {
      logger.error('Failed to generate WireGuard keys:', error);
      throw new Error('Failed to generate WireGuard keys');
    }
  }

  /**
   * Generate preshared key (optional, for additional security)
   */
  generatePresharedKey(): string {
    // Generate random 32 bytes and encode as base64
    const psk = randomBytes(32);
    return psk.toString('base64');
  }

  /**
   * Generate complete key set
   */
  generateKeys(withPresharedKey = false): WireGuardKeyPair {
    const keyPair = this.generateKeyPair();

    if (withPresharedKey) {
      keyPair.presharedKey = this.generatePresharedKey();
    }

    return keyPair;
  }

  /**
   * Validate WireGuard key format
   */
  isValidKey(key: string): boolean {
    // WireGuard keys are 32 bytes in base64 (44 characters with padding)
    const keyRegex = /^[A-Za-z0-9+/]{43}=$/;
    return keyRegex.test(key);
  }

  /**
   * Format allowed IPs for WireGuard config
   * Default: route all traffic through VPN
   */
  formatAllowedIPs(customIPs?: string[]): string {
    if (customIPs && customIPs.length > 0) {
      return customIPs.join(', ');
    }
    // Route all traffic
    return '0.0.0.0/0, ::/0';
  }

  /**
   * Format DNS servers
   */
  formatDNS(dnsServers?: string[]): string {
    if (dnsServers && dnsServers.length > 0) {
      return dnsServers.join(', ');
    }
    // Default: Cloudflare + Google
    return '1.1.1.1, 8.8.8.8';
  }
}

export const wireguardService = new WireGuardService();
