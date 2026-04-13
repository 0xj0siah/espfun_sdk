import { ethers } from 'ethers';
import winston from 'winston';
import { BackendApiClient } from './BackendApiClient';
import { SignatureError } from '../utils/errors';

/** EIP-712 type definitions for buy operations */
const BUY_TOKENS_TYPES = {
  BuyTokens: [
    { name: 'buyer', type: 'address' },
    { name: 'playerTokenIds', type: 'uint256[]' },
    { name: 'amounts', type: 'uint256[]' },
    { name: 'maxCurrencySpend', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
};

/** EIP-712 type definitions for sell operations */
const SELL_TOKENS_TYPES = {
  SellTokens: [
    { name: 'from', type: 'address' },
    { name: 'playerTokenIds', type: 'uint256[]' },
    { name: 'amounts', type: 'uint256[]' },
    { name: 'minCurrencyToReceive', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
};

export interface BuySignatureParams {
  playerTokenIds: number[];
  amounts: bigint[];
  maxCurrencySpend: bigint;
  deadline: bigint;
}

export interface SellSignatureParams {
  playerTokenIds: number[];
  amounts: bigint[];
  minCurrencyToReceive: bigint;
  deadline: bigint;
}

export interface SignatureResult {
  signature: string;
  nonce: number;
  transactionId?: string;
}

export class SignatureService {
  constructor(
    private wallet: ethers.Wallet,
    private apiClient: BackendApiClient,
    private chainId: number,
    private fdfPairAddress: string,
    private playerAddress: string,
    private logger: winston.Logger
  ) {}

  /** Get buy signature — tries backend first, falls back to local signing */
  async getBuySignature(params: BuySignatureParams): Promise<SignatureResult> {
    // Try backend first
    if (this.apiClient.isAuthenticated()) {
      try {
        this.logger.debug('Requesting buy signature from backend...');
        const response = await this.apiClient.prepareBuySignature({
          playerTokenIds: params.playerTokenIds,
          amounts: params.amounts.map(String),
          maxCurrencySpend: String(params.maxCurrencySpend),
          deadline: Number(params.deadline),
        });
        return {
          signature: response.signature,
          nonce: response.nonce,
          transactionId: response.transactionId,
        };
      } catch (error: any) {
        this.logger.warn(`Backend signature failed, falling back to local: ${error.message}`);
      }
    }

    // Local fallback
    return this.signBuyLocally(params);
  }

  /** Get sell signature — tries backend first, falls back to local signing */
  async getSellSignature(params: SellSignatureParams): Promise<SignatureResult> {
    if (this.apiClient.isAuthenticated()) {
      try {
        this.logger.debug('Requesting sell signature from backend...');
        const response = await this.apiClient.prepareSellSignature({
          playerTokenIds: params.playerTokenIds,
          amounts: params.amounts.map(String),
          minCurrencyToReceive: String(params.minCurrencyToReceive),
          deadline: Number(params.deadline),
        });
        return {
          signature: response.signature,
          nonce: response.nonce,
          transactionId: response.transactionId,
        };
      } catch (error: any) {
        this.logger.warn(`Backend sell signature failed, falling back to local: ${error.message}`);
      }
    }

    return this.signSellLocally(params);
  }

  private async signBuyLocally(params: BuySignatureParams): Promise<SignatureResult> {
    try {
      const domain = {
        name: 'FDF Pair',
        version: '1',
        chainId: this.chainId,
        verifyingContract: this.fdfPairAddress,
      };

      const nonce = await this.apiClient.getBuyNonce(this.wallet.address).catch(() => 0);

      const message = {
        buyer: this.wallet.address,
        playerTokenIds: params.playerTokenIds.map(id => BigInt(id)),
        amounts: params.amounts,
        maxCurrencySpend: params.maxCurrencySpend,
        deadline: params.deadline,
        nonce: BigInt(nonce),
      };

      const signature = await this.wallet.signTypedData(domain, BUY_TOKENS_TYPES, message);
      return { signature, nonce };
    } catch (error: any) {
      throw new SignatureError(`Local buy signature failed: ${error.message}`);
    }
  }

  private async signSellLocally(params: SellSignatureParams): Promise<SignatureResult> {
    try {
      const domain = {
        name: 'FDF Player',
        version: '1',
        chainId: this.chainId,
        verifyingContract: this.playerAddress,
      };

      const nonce = await this.apiClient.getSellNonce(this.wallet.address).catch(() => 0);

      const message = {
        from: this.wallet.address,
        playerTokenIds: params.playerTokenIds.map(id => BigInt(id)),
        amounts: params.amounts,
        minCurrencyToReceive: params.minCurrencyToReceive,
        deadline: params.deadline,
        nonce: BigInt(nonce),
      };

      const signature = await this.wallet.signTypedData(domain, SELL_TOKENS_TYPES, message);
      return { signature, nonce };
    } catch (error: any) {
      throw new SignatureError(`Local sell signature failed: ${error.message}`);
    }
  }
}
