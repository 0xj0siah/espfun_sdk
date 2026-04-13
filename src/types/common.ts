import { ethers } from 'ethers';

export interface TransactionResult {
  /** Transaction hash */
  hash: string;
  /** Transaction receipt (available after confirmation) */
  receipt: ethers.TransactionReceipt;
  /** Backend transaction ID (if applicable) */
  transactionId?: string;
}

export interface PoolInfo {
  playerId: number;
  currencyReserve: bigint;
  playerTokenReserve: bigint;
  price: number;
}

export interface PriceImpact {
  currentPrice: number;
  newPrice: number;
  priceImpactPercent: number;
  effectivePrice: number;
}
