/**
 * VPN Module Types
 * Domain types for VPN configuration and management
 */

import type { VpnServer, IpPool } from '@prisma/client';

// WireGuard Key Pair
export interface WireGuardKeyPair {
  privateKey: string;
  publicKey: string;
  presharedKey?: string;
}

// VPN Configuration
export interface VpnConfig {
  subscriptionId: string;
  serverId: string;

  // WireGuard keys
  privateKey: string;
  publicKey: string;
  presharedKey?: string;

  // Network configuration
  ipAddress: string;
  serverPublicKey: string;
  serverEndpoint: string;
  allowedIPs: string;
  dns: string;

  // Config file
  configText: string;
}

// Config generation options
export interface ConfigOptions {
  subscriptionId: string;
  serverId?: string;
  userId: string;
}

// Server with availability info
export interface ServerAvailability {
  server: VpnServer;
  availableIps: number;
  loadPercentage: number;
  isAvailable: boolean;
}

// IP allocation result
export interface IpAllocation {
  ip: IpPool;
  keys: WireGuardKeyPair;
}

// Config rotation result
export interface ConfigRotation {
  oldIpAddress: string;
  newConfig: VpnConfig;
}

// Agent request/response types
export interface AgentAddPeerRequest {
  publicKey: string;
  presharedKey?: string;
  allowedIPs: string;
}

export interface AgentRemovePeerRequest {
  publicKey: string;
}

export interface AgentResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Helper to format config text
export function formatWireGuardConfig(config: VpnConfig): string {
  return `[Interface]
PrivateKey = ${config.privateKey}
Address = ${config.ipAddress}/32
DNS = ${config.dns}

[Peer]
PublicKey = ${config.serverPublicKey}
${config.presharedKey ? `PresharedKey = ${config.presharedKey}\n` : ''}Endpoint = ${config.serverEndpoint}
AllowedIPs = ${config.allowedIPs}
PersistentKeepalive = 25`;
}
