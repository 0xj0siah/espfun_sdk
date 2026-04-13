import { ethers } from 'ethers';
import { TransactionResult } from '../types/common';

export interface BuyPriceResult {
  amountsToReceive: bigint[];
  feeAmounts: bigint[];
  feeRates: bigint[];
  feeTypes: number[];
}

export interface SellPriceResult {
  amountsToReceive: bigint[];
  feeAmounts: bigint[];
  feeRates: bigint[];
  feeTypes: number[];
}

export class FDFPairContract {
  constructor(private contract: ethers.Contract) {}

  get address(): string {
    return this.contract.target as string;
  }

  async getPrices(playerIds: number[]): Promise<bigint[]> {
    return this.contract.getPrices(playerIds.map(BigInt));
  }

  async getPoolInfo(playerIds: number[]): Promise<{ currencyReserves: bigint[]; playerTokenReserves: bigint[] }> {
    const [currencyReserves, playerTokenReserves] = await this.contract.getPoolInfo(playerIds.map(BigInt));
    return { currencyReserves, playerTokenReserves };
  }

  async getBuyPrice(
    playerIds: number[],
    tokenAmounts: bigint[],
    currencyAmounts: bigint[]
  ): Promise<BuyPriceResult> {
    const [amountsToReceive, feeAmounts, feeRates, feeTypes] = await this.contract.getBuyPrice(
      playerIds.map(BigInt), tokenAmounts, currencyAmounts
    );
    return { amountsToReceive, feeAmounts, feeRates, feeTypes: feeTypes.map(Number) };
  }

  async getSellPrice(playerIds: number[], tokenAmounts: bigint[]): Promise<SellPriceResult> {
    const [amountsToReceive, feeAmounts, feeRates, feeTypes] = await this.contract.getSellPrice(
      playerIds.map(BigInt), tokenAmounts
    );
    return { amountsToReceive, feeAmounts, feeRates, feeTypes: feeTypes.map(Number) };
  }

  async getCurrentNonce(user: string): Promise<number> {
    const nonce: bigint = await this.contract.getCurrentNonce(user);
    return Number(nonce);
  }

  async getCurrencyInfo(): Promise<string> {
    return this.contract.getCurrencyInfo();
  }

  async getAllPlayerIds(): Promise<number[]> {
    const ids: bigint[] = await this.contract.getAllPlayerIds();
    return ids.map(Number);
  }

  async buyTokens(
    playerTokenIds: number[],
    amounts: bigint[],
    maxCurrencySpend: bigint,
    deadline: bigint,
    recipient: string,
    signature: string,
    nonce: bigint
  ): Promise<TransactionResult> {
    const tx = await this.contract.buyTokens(
      playerTokenIds.map(BigInt),
      amounts,
      maxCurrencySpend,
      deadline,
      recipient,
      signature,
      nonce
    );
    const receipt = await tx.wait();
    return { hash: tx.hash, receipt };
  }

  /** Access the underlying ethers.Contract for event subscriptions */
  get raw(): ethers.Contract {
    return this.contract;
  }
}
