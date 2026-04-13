export interface StakingGlobalInfo {
  totalStaked: bigint;
  stakerShareBps: number;
  totalRewardsDistributed: bigint;
  undistributedRewards: bigint;
}

export interface StakingUserInfo {
  stakedAmount: bigint;
  pendingRewards: bigint;
}
