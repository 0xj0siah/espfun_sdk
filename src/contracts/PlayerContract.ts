import { ethers } from 'ethers';
import { TransactionResult } from '../types/common';
import { PlayerInfo } from '../types/player';

export class PlayerContract {
  constructor(private contract: ethers.Contract) {}

  get address(): string {
    return this.contract.target as string;
  }

  async balanceOf(owner: string, playerId: number): Promise<bigint> {
    return this.contract.balanceOf(owner, BigInt(playerId));
  }

  async balanceOfBatch(owner: string, playerIds: number[]): Promise<bigint[]> {
    const owners = playerIds.map(() => owner);
    return this.contract.balanceOfBatch(owners, playerIds.map(BigInt));
  }

  async getActivePlayerIds(): Promise<number[]> {
    const ids: bigint[] = await this.contract.getActivePlayerIds();
    return ids.map(Number);
  }

  async getAllPlayerIds(): Promise<number[]> {
    const ids: bigint[] = await this.contract.getAllPlayerIds();
    return ids.map(Number);
  }

  async isApprovedForAll(owner: string, operator: string): Promise<boolean> {
    return this.contract.isApprovedForAll(owner, operator);
  }

  async setApprovalForAll(operator: string, approved: boolean): Promise<TransactionResult> {
    const tx = await this.contract.setApprovalForAll(operator, approved);
    const receipt = await tx.wait();
    return { hash: tx.hash, receipt };
  }

  async getCurrentNonce(user: string): Promise<number> {
    const nonce: bigint = await this.contract.getCurrentNonce(user);
    return Number(nonce);
  }

  async sellTokens(
    playerTokenIds: number[],
    amounts: bigint[],
    minCurrencyToReceive: bigint,
    deadline: bigint,
    recipient: string,
    signature: string,
    nonce: bigint
  ): Promise<TransactionResult> {
    const tx = await this.contract.sellTokens(
      playerTokenIds.map(BigInt),
      amounts,
      minCurrencyToReceive,
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
