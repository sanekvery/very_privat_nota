/**
 * TON Service
 * Integration with TON blockchain for payments
 *
 * Responsibilities:
 * - Verify TON transactions
 * - Generate payment addresses
 * - Check transaction status
 * - Convert TON amounts
 *
 * TODO: Integrate with @ton/ton or tonweb library for production
 */

import { logger } from '@/lib/logger';
import { ExternalServiceError } from '@/lib/errors';
import type {
  TonWalletConfig,
  TonTransaction,
  TonPaymentVerification,
} from './payments.types';

// Environment variables
const TON_WALLET_ADDRESS = process.env.TON_WALLET_ADDRESS || '';
const TON_API_KEY = process.env.TON_API_KEY || '';
const TON_NETWORK =
  (process.env.TON_NETWORK as 'mainnet' | 'testnet') || 'testnet';
const TON_MOCK_MODE = process.env.TON_MOCK_MODE === 'true';

export class TonService {
  private readonly walletConfig: TonWalletConfig;

  constructor() {
    this.walletConfig = {
      address: TON_WALLET_ADDRESS,
      apiKey: TON_API_KEY,
      network: TON_NETWORK,
    };

    if (!TON_WALLET_ADDRESS && !TON_MOCK_MODE) {
      logger.warn('TON_WALLET_ADDRESS not configured');
    }

    logger.info('TON Service initialized', {
      network: TON_NETWORK,
      mockMode: TON_MOCK_MODE,
    });
  }

  /**
   * Convert nanoTON to TON
   * 1 TON = 1,000,000,000 nanoTON (1e9)
   */
  nanoToTon(nanoton: string | number): number {
    const nano = typeof nanoton === 'string' ? BigInt(nanoton) : BigInt(nanoton);
    return Number(nano) / 1e9;
  }

  /**
   * Convert TON to nanoTON
   */
  tonToNano(ton: number): string {
    const nano = Math.floor(ton * 1e9);
    return nano.toString();
  }

  /**
   * Get merchant wallet address
   */
  getMerchantAddress(): string {
    return this.walletConfig.address;
  }

  /**
   * Verify TON transaction
   * Check if transaction exists and matches expected amount
   */
  async verifyTransaction(
    transactionHash: string,
    expectedAmount: number,
    _expectedRecipient?: string
  ): Promise<TonPaymentVerification> {
    if (TON_MOCK_MODE) {
      return this.mockVerifyTransaction(transactionHash, expectedAmount);
    }

    try {
      // TODO: Integrate with TON API
      // Example with TON Center API:
      // const response = await fetch(
      //   `https://toncenter.com/api/v2/getTransactions?address=${this.walletConfig.address}&limit=100`,
      //   {
      //     headers: {
      //       'X-API-Key': this.walletConfig.apiKey,
      //     },
      //   }
      // );

      logger.warn('TON transaction verification not implemented yet', {
        transactionHash,
        expectedAmount,
      });

      throw new ExternalServiceError(
        'TON',
        'TON verification not implemented. Use TON_MOCK_MODE for development.'
      );
    } catch (error) {
      logger.error('TON transaction verification failed', {
        error: error instanceof Error ? error.message : 'Unknown',
        transactionHash,
      });

      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(
    transactionHash: string
  ): Promise<TonTransaction | null> {
    if (TON_MOCK_MODE) {
      return this.mockGetTransaction(transactionHash);
    }

    try {
      // TODO: Integrate with TON API
      logger.warn('TON getTransaction not implemented', { transactionHash });
      return null;
    } catch (error) {
      logger.error('Failed to get TON transaction', {
        error: error instanceof Error ? error.message : 'Unknown',
        transactionHash,
      });
      return null;
    }
  }

  /**
   * Get recent transactions to wallet
   * Used for webhook-less payment detection
   */
  async getRecentTransactions(limit = 10): Promise<TonTransaction[]> {
    if (TON_MOCK_MODE) {
      return this.mockGetRecentTransactions(limit);
    }

    try {
      // TODO: Integrate with TON API
      logger.warn('TON getRecentTransactions not implemented');
      return [];
    } catch (error) {
      logger.error('Failed to get recent TON transactions', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return [];
    }
  }

  /**
   * Check if wallet address is valid
   */
  isValidAddress(address: string): boolean {
    // TON addresses are 48 characters (base64 URL-safe)
    // Format: EQD... or UQD... (bounceable/non-bounceable)
    const regex = /^[A-Za-z0-9_-]{48}$/;
    return regex.test(address);
  }

  /**
   * Generate payment link for Telegram WebApp
   * Opens TON wallet with pre-filled amount and recipient
   */
  generatePaymentLink(
    amount: number,
    comment?: string
  ): string {
    const amountNano = this.tonToNano(amount);
    const recipient = this.getMerchantAddress();

    // TON payment URL scheme
    // ton://transfer/<address>?amount=<nanoton>&text=<comment>
    let url = `ton://transfer/${recipient}?amount=${amountNano}`;

    if (comment) {
      url += `&text=${encodeURIComponent(comment)}`;
    }

    return url;
  }

  // ==================
  // Mock methods for development
  // ==================

  private mockVerifyTransaction(
    transactionHash: string,
    expectedAmount: number
  ): TonPaymentVerification {
    logger.info('[MOCK] Verifying TON transaction', {
      transactionHash,
      expectedAmount,
    });

    // Simulate successful verification
    return {
      isValid: true,
      amount: expectedAmount,
      from: 'EQDMockSenderAddress123456789012345678901234567',
      to: this.getMerchantAddress(),
      transactionHash,
      timestamp: new Date(),
    };
  }

  private mockGetTransaction(transactionHash: string): TonTransaction {
    logger.info('[MOCK] Getting TON transaction', { transactionHash });

    return {
      hash: transactionHash,
      from: 'EQDMockSenderAddress123456789012345678901234567',
      to: this.getMerchantAddress(),
      amount: 5.0,
      fee: 0.01,
      timestamp: new Date(),
      comment: 'Payment for VPN subscription',
      isConfirmed: true,
    };
  }

  private mockGetRecentTransactions(limit: number): TonTransaction[] {
    logger.info('[MOCK] Getting recent TON transactions', { limit });

    // Return empty array in mock mode
    // In production, this would poll TON API
    return [];
  }
}

export const tonService = new TonService();
