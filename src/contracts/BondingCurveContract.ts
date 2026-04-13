import { ethers } from 'ethers';
import { TransactionResult } from '../types/common';
import { LaunchInfo, LaunchProgress } from '../types/trading';

export class BondingCurveContract {
  constructor(private contract: ethers.Contract) {}

  get address(): string {
    return this.contract.target as string;
  }

  async getLaunchInfo(playerId: number): Promise<LaunchInfo> {
    const r = await this.contract.getLaunchInfo(BigInt(playerId));
    return {
      playerId: r.playerId ?? r[0] ?? 0n,
      totalTokensForSale: r.totalTokensForSale ?? r[1] ?? 0n,
      tokensSold: r.tokensSold ?? r[2] ?? 0n,
      currencyCollected: r.currencyCollected ?? r[3] ?? 0n,
      tokensForLiquidity: r.tokensForLiquidity ?? r[4] ?? 0n,
      fundingTarget: r.fundingTarget ?? r[5] ?? 0n,
      virtualTokenReserve: r.virtualTokenReserve ?? r[6] ?? 0n,
      virtualCurrencyReserve: r.virtualCurrencyReserve ?? r[7] ?? 0n,
      createdAt: r.createdAt ?? r[8] ?? 0n,
      deadline: r.deadline ?? r[9] ?? 0n,
      graduated: r.graduated ?? r[10] ?? false,
      cancelled: r.cancelled ?? r[11] ?? false,
    };
  }

  async getProgress(playerId: number): Promise<LaunchProgress> {
    const [raised, target, percentComplete] = await this.contract.getProgress(BigInt(playerId));
    return { raised, target, percentComplete: Number(percentComplete) };
  }

  async getUserBalance(playerId: number, user: string): Promise<bigint> {
    return this.contract.getUserBalance(BigInt(playerId), user);
  }

  async getAllLaunchIds(): Promise<number[]> {
    const ids: bigint[] = await this.contract.getAllLaunchIds();
    return ids.map(Number);
  }

  async buyFromCurve(
    playerId: number,
    amount: bigint,
    maxCurrencySpend: bigint,
    deadline: bigint
  ): Promise<TransactionResult> {
    const tx = await this.contract.buyFromCurve(BigInt(playerId), amount, maxCurrencySpend, deadline);
    const receipt = await tx.wait();
    return { hash: tx.hash, receipt };
  }

  async sellToCurve(
    playerId: number,
    amount: bigint,
    minCurrencyToReceive: bigint,
    deadline: bigint
  ): Promise<TransactionResult> {
    const tx = await this.contract.sellToCurve(BigInt(playerId), amount, minCurrencyToReceive, deadline);
    const receipt = await tx.wait();
    return { hash: tx.hash, receipt };
  }

  async claimTokens(playerId: number): Promise<TransactionResult> {
    const tx = await this.contract.claimTokens(BigInt(playerId));
    const receipt = await tx.wait();
    return { hash: tx.hash, receipt };
  }

  async refund(playerId: number): Promise<TransactionResult> {
    const tx = await this.contract.refund(BigInt(playerId));
    const receipt = await tx.wait();
    return { hash: tx.hash, receipt };
  }

  /** Access the underlying ethers.Contract for event subscriptions */
  get raw(): ethers.Contract {
    return this.contract;
  }
}
