/**
 * WireGuard Service
 * Manages WireGuard peers and configuration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../logger';
import { config } from '../config';
import type { CreatePeerRequest, PeerStatus } from '../types';

const execAsync = promisify(exec);

class WireGuardService {
  private readonly interface = config.wireguard.interface;

  /**
   * Add peer to WireGuard interface
   */
  async addPeer(request: CreatePeerRequest): Promise<void> {
    try {
      const { publicKey, presharedKey, allowedIPs } = request;

      // Build wg command
      let command = `wg set ${this.interface} peer ${publicKey} allowed-ips ${allowedIPs.join(',')}`;

      if (presharedKey) {
        command += ` preshared-key <(echo "${presharedKey}")`;
      }

      // Execute command
      await execAsync(command, { shell: '/bin/bash' });

      // Save configuration
      await this.saveConfig();

      logger.info('Peer added successfully', {
        publicKey,
        allowedIPs,
      });
    } catch (error) {
      logger.error('Failed to add peer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        publicKey: request.publicKey,
      });
      throw new Error(`Failed to add peer: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Remove peer from WireGuard interface
   */
  async removePeer(publicKey: string): Promise<void> {
    try {
      const command = `wg set ${this.interface} peer ${publicKey} remove`;
      await execAsync(command);

      // Save configuration
      await this.saveConfig();

      logger.info('Peer removed successfully', { publicKey });
    } catch (error) {
      logger.error('Failed to remove peer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        publicKey,
      });
      throw new Error(`Failed to remove peer: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Get peer status
   */
  async getPeerStatus(publicKey: string): Promise<PeerStatus | null> {
    try {
      const command = `wg show ${this.interface} dump`;
      const { stdout } = await execAsync(command);

      const lines = stdout.trim().split('\n');

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        const peerPublicKey = parts[0];

        if (peerPublicKey === publicKey) {
          return {
            publicKey: peerPublicKey,
            endpoint: parts[2] !== '(none)' ? parts[2] : undefined,
            latestHandshake: parseInt(parts[4], 10),
            transferRx: parseInt(parts[5], 10),
            transferTx: parseInt(parts[6], 10),
            allowedIPs: parts[3].split(','),
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to get peer status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        publicKey,
      });
      return null;
    }
  }

  /**
   * Get all peers status
   */
  async getAllPeers(): Promise<PeerStatus[]> {
    try {
      const command = `wg show ${this.interface} dump`;
      const { stdout } = await execAsync(command);

      const lines = stdout.trim().split('\n');
      const peers: PeerStatus[] = [];

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');

        peers.push({
          publicKey: parts[0],
          endpoint: parts[2] !== '(none)' ? parts[2] : undefined,
          latestHandshake: parseInt(parts[4], 10),
          transferRx: parseInt(parts[5], 10),
          transferTx: parseInt(parts[6], 10),
          allowedIPs: parts[3].split(','),
        });
      }

      return peers;
    } catch (error) {
      logger.error('Failed to get all peers', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Check if WireGuard interface is running
   */
  async isRunning(): Promise<boolean> {
    try {
      const command = `wg show ${this.interface}`;
      await execAsync(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Save WireGuard configuration
   */
  private async saveConfig(): Promise<void> {
    try {
      const command = `wg-quick save ${this.interface}`;
      await execAsync(command);

      logger.debug('Configuration saved', { interface: this.interface });
    } catch (error) {
      logger.warn('Failed to save configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - saving is optional
    }
  }

  /**
   * Get interface statistics
   */
  async getInterfaceStats(): Promise<{
    transferRx: number;
    transferTx: number;
    peers: number;
  }> {
    try {
      const peers = await this.getAllPeers();

      const stats = peers.reduce(
        (acc, peer) => ({
          transferRx: acc.transferRx + peer.transferRx,
          transferTx: acc.transferTx + peer.transferTx,
          peers: acc.peers + 1,
        }),
        { transferRx: 0, transferTx: 0, peers: 0 }
      );

      return stats;
    } catch (error) {
      logger.error('Failed to get interface stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { transferRx: 0, transferTx: 0, peers: 0 };
    }
  }
}

export const wireguardService = new WireGuardService();
