import { ethers } from 'ethers';
import winston from 'winston';
import { ContractFactory } from '../contracts/ContractFactory';
import { TransactionResult } from '../types/common';
import { StakingGlobalInfo, StakingUserInfo } from '../types/staking';
import { ESP_DECIMALS } from '../config/constants';
import { InsufficientBalanceError } from '../utils/errors';

export class StakingModule {
  constructor(
    private contracts: ContractFactory,
    private wallet: ethers.Wallet,
    private logger: winston.Logger
  ) {}

  /** Stake ESP tokens. Handles approval automatically. */
  async stake(amount: number): Promise<TransactionResult> {
    const stakeAmount = ethers.parseUnits(String(amount), ESP_DECIMALS);

    // Check ESP balance
    const balance = await this.contracts.getEsp().balanceOf(this.wallet.address);
    if (balance < stakeAmount) {
      throw new InsufficientBalanceError(
        `Insufficient ESP: have ${ethers.formatUnits(balance, ESP_DECIMALS)}, need ${amount}`
      );
    }

    // Approve ESP for staking contract
    this.logger.debug('Ensuring ESP allowance for staking...');
    await this.contracts.getEsp().ensureAllowance(
      this.wallet.address,
      this.contracts.getStaking().address,
      stakeAmount
    );

    this.logger.info(`Staking ${amount} ESP...`);
    return this.contracts.getStaking().stake(stakeAmount);
  }

  /** Unstake ESP tokens */
  async unstake(amount: number): Promise<TransactionResult> {
    const unstakeAmount = ethers.parseUnits(String(amount), ESP_DECIMALS);
    this.logger.info(`Unstaking ${amount} ESP...`);
    return this.contracts.getStaking().unstake(unstakeAmount);
  }

  /** Claim pending staking rewards */
  async claimRewards(): Promise<TransactionResult> {
    this.logger.info('Claiming staking rewards...');
    return this.contracts.getStaking().claimRewards();
  }

  /** Distribute accumulated rewards to stakers */
  async distributeRewards(): Promise<TransactionResult> {
    this.logger.info('Distributing rewards...');
    return this.contracts.getStaking().distributeRewards();
  }

  /** Get global staking statistics */
  async getStakingInfo(): Promise<StakingGlobalInfo> {
    return this.contracts.getStaking().getGlobalInfo();
  }

  /** Get staking info for the current wallet */
  async getUserStakingInfo(): Promise<StakingUserInfo> {
    return this.contracts.getStaking().getUserInfo(this.wallet.address);
  }

  /** Get pending rewards for the current wallet */
  async getPendingRewards(): Promise<bigint> {
    return this.contracts.getStaking().pendingReward(this.wallet.address);
  }
}
