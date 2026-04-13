export interface PlayerBalance {
  playerId: number;
  /** On-chain ERC1155 balance (Player contract) */
  balance: bigint;
  /** Unclaimed tokens from graduated bonding curve (only populated when explicitly queried) */
  unclaimedBalance?: bigint;
}

export interface DevelopmentPlayer {
  playerId: number;
  lockedBalance: bigint;
}

export interface PlayerInfo {
  playerId: number;
  exists: boolean;
  isBuyable: boolean;
  isSellable: boolean;
}
