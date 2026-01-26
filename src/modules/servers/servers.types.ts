/**
 * Servers Module Types
 * Domain types for VPN server management
 */

import type { VpnServer } from '@prisma/client';

// Server status enum
export type ServerStatus = 'active' | 'maintenance' | 'offline';

// Server with statistics
export interface ServerWithStats extends VpnServer {
  stats?: {
    activeConfigs: number;
    totalConfigs: number;
    capacityUsed: number; // Percentage (0-100)
    lastHealthCheck?: Date;
    isHealthy: boolean;
  };
}

// Create server input
export interface CreateServerInput {
  name: string;
  host: string;
  port?: number;
  publicKey: string;
  endpoint: string;
  city?: string;
  countryCode: string;
  listenPort?: number;
  subnet: string; // CIDR notation, e.g. "10.0.1.0/24"
  maxUsers?: number;
  agentApiUrl: string;
  agentBearerToken: string;
  dns?: string;
  priority?: number;
  isActive?: boolean;
}

// Update server input
export interface UpdateServerInput {
  serverId: string;
  name?: string;
  host?: string;
  port?: number;
  publicKey?: string;
  endpoint?: string;
  city?: string;
  countryCode?: string;
  listenPort?: number;
  subnet?: string;
  maxUsers?: number;
  agentApiUrl?: string;
  agentBearerToken?: string;
  dns?: string;
  priority?: number;
  isActive?: boolean;
  status?: ServerStatus;
}

// Health check result
export interface HealthCheckResult {
  serverId: string;
  isHealthy: boolean;
  responseTime?: number; // ms
  lastChecked: Date;
  error?: string;
  details?: {
    agentReachable: boolean;
    diskSpace?: number; // percentage
    memoryUsage?: number; // percentage
    cpuUsage?: number; // percentage
  };
}

// Server load metrics
export interface ServerLoadMetrics {
  serverId: string;
  activeUsers: number;
  maxUsers: number;
  capacityUsed: number; // Percentage (0-100)
  availableIps: number;
  totalIps: number;
  bandwidth?: {
    upload: number; // Mbps
    download: number; // Mbps
  };
}

// Server selection criteria
export interface ServerSelectionCriteria {
  preferredCountry?: string;
  maxCapacity?: number; // Max acceptable capacity percentage
  requireActive?: boolean;
  excludeServerIds?: string[];
}

// Optimal server result
export interface OptimalServerResult {
  server: VpnServer;
  score: number; // Selection score (higher is better)
  reason: string;
  metrics: ServerLoadMetrics;
}

// Server statistics (admin)
export interface ServerStatistics {
  totalServers: number;
  activeServers: number;
  maintenanceServers: number;
  offlineServers: number;
  totalCapacity: number;
  usedCapacity: number;
  averageLoad: number;
  serversByCountry: Array<{
    countryCode: string;
    count: number;
  }>;
}

// Server capacity info
export interface ServerCapacityInfo {
  serverId: string;
  maxUsers: number;
  currentUsers: number;
  availableSlots: number;
  capacityPercentage: number;
  ipPoolSize: number;
  ipPoolUsed: number;
  ipPoolAvailable: number;
}
