/**
 * VPN Agent Client
 * Communicates with VPN Agent API (v3.1 HTTPS) on remote servers
 *
 * Agent API endpoints:
 * - GET  /health - health check
 * - POST /wg/addpeer - add WireGuard peer
 * - POST /wg/removepeer - remove WireGuard peer
 * - POST /exec - execute whitelisted command
 */

import https from 'https';
import { logger } from '@/lib/logger';
import { ExternalServiceError } from '@/lib/errors';
import type { VpnServer } from '@prisma/client';
import type { AgentAddPeerRequest, AgentRemovePeerRequest, AgentResponse } from './vpn.types';

// HTTPS agent that accepts self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Agent uses self-signed cert
});

export class AgentClient {
  private readonly baseUrl: string;
  private readonly bearerToken: string;
  private readonly serverId: string;

  constructor(server: VpnServer) {
    this.baseUrl = server.agentApiUrl;
    this.bearerToken = server.agentBearerToken;
    this.serverId = server.id;
  }

  /**
   * Health check - verify agent is running
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        // @ts-expect-error - Node.js fetch accepts agent option
        agent: httpsAgent,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        logger.warn('Agent health check failed', {
          serverId: this.serverId,
          status: response.status,
        });
        return false;
      }

      const data = await response.json();
      logger.debug('Agent health check OK', {
        serverId: this.serverId,
        version: data.version,
      });

      return data.status === 'ok';
    } catch (error) {
      logger.error('Agent health check error', {
        serverId: this.serverId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Add peer to WireGuard server
   * POST /wg/addpeer
   */
  async addPeer(request: AgentAddPeerRequest): Promise<AgentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/wg/addpeer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.bearerToken}`,
        },
        body: JSON.stringify({
          public_key: request.publicKey,
          allowed_ips: request.allowedIPs,
          preshared_key: request.presharedKey,
        }),
        // @ts-expect-error - Node.js fetch accepts agent option
        agent: httpsAgent,
        signal: AbortSignal.timeout(30000),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new ExternalServiceError(
          'Agent',
          `Failed to add peer: ${data.error || data.stderr || 'Unknown error'}`
        );
      }

      logger.info('Peer added to server', {
        serverId: this.serverId,
        allowedIPs: request.allowedIPs,
      });

      return {
        success: true,
        message: 'Peer added successfully',
      };
    } catch (error) {
      logger.error('Failed to add peer', {
        serverId: this.serverId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(
        'Agent',
        `Failed to communicate with VPN agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Remove peer from WireGuard server
   * POST /wg/removepeer
   */
  async removePeer(request: AgentRemovePeerRequest): Promise<AgentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/wg/removepeer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.bearerToken}`,
        },
        body: JSON.stringify({
          public_key: request.publicKey,
        }),
        // @ts-expect-error - Node.js fetch accepts agent option
        agent: httpsAgent,
        signal: AbortSignal.timeout(30000),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new ExternalServiceError(
          'Agent',
          `Failed to remove peer: ${data.error || data.stderr || 'Unknown error'}`
        );
      }

      logger.info('Peer removed from server', {
        serverId: this.serverId,
      });

      return {
        success: true,
        message: 'Peer removed successfully',
      };
    } catch (error) {
      logger.error('Failed to remove peer', {
        serverId: this.serverId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(
        'Agent',
        `Failed to communicate with VPN agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get server's public key
   * POST /exec with action: wg_server_pubkey
   */
  async getServerPublicKey(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.bearerToken}`,
        },
        body: JSON.stringify({
          action: 'wg_server_pubkey',
        }),
        // @ts-expect-error - Node.js fetch accepts agent option
        agent: httpsAgent,
        signal: AbortSignal.timeout(10000),
      });

      const data = await response.json();

      if (!response.ok || data.code !== 0) {
        throw new ExternalServiceError(
          'Agent',
          `Failed to get server public key: ${data.stderr || 'Unknown error'}`
        );
      }

      const publicKey = data.stdout?.trim();
      if (!publicKey || publicKey.length !== 44) {
        throw new ExternalServiceError(
          'Agent',
          'Invalid server public key format'
        );
      }

      logger.debug('Retrieved server public key', {
        serverId: this.serverId,
      });

      return publicKey;
    } catch (error) {
      logger.error('Failed to get server public key', {
        serverId: this.serverId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(
        'Agent',
        `Failed to communicate with VPN agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute whitelisted command on agent
   * POST /exec
   */
  async executeCommand(action: string, params?: Record<string, unknown>): Promise<{
    stdout: string;
    stderr: string;
    code: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.bearerToken}`,
        },
        body: JSON.stringify({
          action,
          ...params,
        }),
        // @ts-expect-error - Node.js fetch accepts agent option
        agent: httpsAgent,
        signal: AbortSignal.timeout(60000),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ExternalServiceError(
          'Agent',
          `Failed to execute command: ${data.error || 'Unknown error'}`
        );
      }

      logger.debug('Command executed on agent', {
        serverId: this.serverId,
        action,
        exitCode: data.code,
      });

      return {
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        code: data.code || 0,
      };
    } catch (error) {
      logger.error('Failed to execute command on agent', {
        serverId: this.serverId,
        action,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(
        'Agent',
        `Failed to communicate with VPN agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Factory function to create agent client
 */
export function createAgentClient(server: VpnServer): AgentClient {
  return new AgentClient(server);
}
