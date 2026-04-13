import { ethers } from 'ethers';
import { TransactionResult } from '../types/common';

export class TokenContract {
  constructor(
    private contract: ethers.Contract,
    public readonly decimals: number
  ) {}

  get address(): string {
    return this.contract.target as string;
  }

  async balanceOf(account: string): Promise<bigint> {
    return this.contract.balanceOf(account);
  }

  async allowance(owner: string, spender: string): Promise<bigint> {
    return this.contract.allowance(owner, spender);
  }

  async approve(spender: string, amount: bigint): Promise<TransactionResult> {
    const tx = await this.contract.approve(spender, amount);
    const receipt = await tx.wait();
    return { hash: tx.hash, receipt };
  }

  async transfer(to: string, amount: bigint): Promise<TransactionResult> {
    const tx = await this.contract.transfer(to, amount);
    const receipt = await tx.wait();
    return { hash: tx.hash, receipt };
  }

  /** Ensure allowance is at least `amount`, approving if needed */
  async ensureAllowance(owner: string, spender: string, amount: bigint): Promise<TransactionResult | null> {
    const current = await this.allowance(owner, spender);
    if (current >= amount) return null;
    return this.approve(spender, amount);
  }

  /** Access the underlying ethers.Contract */
  get raw(): ethers.Contract {
    return this.contract;
  }
}
