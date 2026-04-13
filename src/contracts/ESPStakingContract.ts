import { ethers } from 'ethers';
import { TransactionResult } from '../types/common';
import { StakingGlobalInfo, StakingUserInfo } from '../types/staking';

export class ESPStakingContract {
  constructor(private contract: ethers.Contract) {}

  get address(): string {
    return this.contract.target as string;
  }

  async getUserInfo(user: string): Promise<StakingUserInfo> {
    const [stakedAmount, pendingRewards] = await this.contract.getUserInfo(user);
    return { stakedAmount, pendingRewards };
  }

  async pendingReward(user: string): Promise<bigint> {
    return this.contract.pendingReward(user);
  }

  async totalStaked(): Promise<bigint> {
    return this.contract.totalStaked();
  }

  async stakerShareBps(): Promise<number> {
    const bps: bigint = await this.contract.stakerShareBps();
    return Number(bps);
  }

  async totalRewardsDistributed(): Promise<bigint> {
    return this.contract.totalRewardsDistributed();
  }

  async undistributedRewards(): Promise<bigint> {
    return this.contract.undistributedRewards();
  }

  async getGlobalInfo(): Promise<StakingGlobalInfo> {
    const [total, shareBps, distributed, undistributed] = await Promise.all([
      this.totalStaked(),
      this.stakerShareBps(),
      this.totalRewardsDistributed(),
      this.undistributedRewards(),
    ]);
    return {
      totalStaked: total,
      stakerShareBps: shareBps,
      totalRewardsDistributed: distributed,
      undistributedRewards: undistributed,
    };
  }

  async stake(amount: bigint): Promise<TransactionResult> {
    const tx = await this.contract.stake(amount);
    const receipt = await tx.wait();
    return { hash: tx.hash, receipt };
  }

  async unstake(amount: bigint): Promise<TransactionResult> {
    const tx = await this.contract.unstake(amount);
    const receipt = await tx.wait();
    return { hash: tx.hash, receipt };
  }

  async claimRewards(): Promise<TransactionResult> {
    const tx = await this.contract.claimRewards();
    const receipt = await tx.wait();
    return { hash: tx.hash, receipt };
  }

  async distributeRewards(): Promise<TransactionResult> {
    const tx = await this.contract.distributeRewards();
    const receipt = await tx.wait();
    return { hash: tx.hash, receipt };
  }

  /** Access the underlying ethers.Contract for event subscriptions */
  get raw(): ethers.Contract {
    return this.contract;
  }
}
