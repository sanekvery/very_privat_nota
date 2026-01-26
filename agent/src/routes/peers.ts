/**
 * Peers Routes
 * POST /peers - Add peer
 * DELETE /peers/:publicKey - Remove peer
 * GET /peers/:publicKey - Get peer status
 * GET /peers - Get all peers
 */

import { Router, Request, Response } from 'express';
import { wireguardService } from '../services/wireguard.service';
import { logger } from '../logger';
import { requireAuth } from '../middleware/auth';
import type { CreatePeerRequest, SuccessResponse } from '../types';

const router = Router();

// All peer routes require authentication
router.use(requireAuth);

/**
 * POST /peers
 * Add a new peer to WireGuard
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request = req.body as CreatePeerRequest;

    // Validate request
    if (!request.publicKey || !request.allowedIPs || request.allowedIPs.length === 0) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'publicKey and allowedIPs are required',
      });
      return;
    }

    // Add peer
    await wireguardService.addPeer(request);

    const response: SuccessResponse = {
      success: true,
      data: {
        publicKey: request.publicKey,
        allowedIPs: request.allowedIPs,
        message: 'Peer added successfully',
      },
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Failed to add peer via API', { error });

    res.status(500).json({
      error: 'PeerAddError',
      message: 'Failed to add peer',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /peers/:publicKey
 * Remove a peer from WireGuard
 */
router.delete('/:publicKey', async (req: Request, res: Response) => {
  try {
    const { publicKey } = req.params;

    if (!publicKey) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'publicKey is required',
      });
      return;
    }

    // Check if peer exists
    const peerStatus = await wireguardService.getPeerStatus(publicKey);
    if (!peerStatus) {
      res.status(404).json({
        error: 'NotFoundError',
        message: 'Peer not found',
      });
      return;
    }

    // Remove peer
    await wireguardService.removePeer(publicKey);

    const response: SuccessResponse = {
      success: true,
      data: {
        publicKey,
        message: 'Peer removed successfully',
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to remove peer via API', { error });

    res.status(500).json({
      error: 'PeerRemoveError',
      message: 'Failed to remove peer',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /peers/:publicKey
 * Get peer status
 */
router.get('/:publicKey', async (req: Request, res: Response) => {
  try {
    const { publicKey } = req.params;

    const peerStatus = await wireguardService.getPeerStatus(publicKey);

    if (!peerStatus) {
      res.status(404).json({
        error: 'NotFoundError',
        message: 'Peer not found',
      });
      return;
    }

    const response: SuccessResponse = {
      success: true,
      data: peerStatus,
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get peer status via API', { error });

    res.status(500).json({
      error: 'PeerStatusError',
      message: 'Failed to get peer status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /peers
 * Get all peers
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const peers = await wireguardService.getAllPeers();

    const response: SuccessResponse = {
      success: true,
      data: {
        peers,
        count: peers.length,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get all peers via API', { error });

    res.status(500).json({
      error: 'PeerListError',
      message: 'Failed to get peers',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
