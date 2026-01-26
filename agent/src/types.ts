/**
 * Agent Types
 * Type definitions for VPN Server Agent
 */

// WireGuard peer configuration
export interface WireGuardPeer {
  publicKey: string;
  presharedKey?: string;
  allowedIPs: string[];
  endpoint?: string;
  persistentKeepalive?: number;
}

// Create peer request
export interface CreatePeerRequest {
  publicKey: string;
  presharedKey?: string;
  allowedIPs: string[];
}

// Peer status
export interface PeerStatus {
  publicKey: string;
  endpoint?: string;
  latestHandshake?: number;
  transferRx: number;
  transferTx: number;
  allowedIPs: string[];
}

// Server metrics
export interface ServerMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkStats: {
    bytesReceived: number;
    bytesSent: number;
  };
  wireguard: {
    activePeers: number;
    totalPeers: number;
    peers: PeerStatus[];
  };
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: number;
  uptime: number;
  wireguard: {
    running: boolean;
    interface: string;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

// Error response
export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}

// Success response
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}
