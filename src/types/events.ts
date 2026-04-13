export interface TokensPurchasedEvent {
  buyer: string;
  recipient: string;
  playerTokenIds: bigint[];
  amounts: bigint[];
  currencySpent: bigint[];
  newPrices: bigint[];
  feeAmounts: bigint[];
}

export interface CurrencyPurchaseEvent {
  buyer: string;
  recipient: string;
  playerTokenIds: bigint[];
  amounts: bigint[];
  currencyReceived: bigint[];
  newPrices: bigint[];
  feeAmounts: bigint[];
}

export interface LiquidityAddedEvent {
  provider: string;
  playerTokenIds: bigint[];
  tokenAmounts: bigint[];
  currencyAmounts: bigint[];
}

export interface BondingCurveBuyEvent {
  user: string;
  playerId: bigint;
  amount: bigint;
  currencySpent: bigint;
}

export interface BondingCurveSellEvent {
  user: string;
  playerId: bigint;
  amount: bigint;
  currencyReceived: bigint;
}

export interface GraduatedEvent {
  playerId: bigint;
  totalRaised: bigint;
}

export interface LaunchCreatedEvent {
  playerId: bigint;
  tokensForSale: bigint;
  tokensForLP: bigint;
  fundingTarget: bigint;
}

export interface ClaimedEvent {
  user: string;
  playerId: bigint;
  amount: bigint;
}

export interface StakedEvent {
  user: string;
  amount: bigint;
}

export interface UnstakedEvent {
  user: string;
  amount: bigint;
}

export interface RewardsClaimedEvent {
  user: string;
  amount: bigint;
}

export interface RewardsDistributedEvent {
  totalRewards: bigint;
  stakerRewards: bigint;
  opsRewards: bigint;
}

export interface TransferSingleEvent {
  operator: string;
  from: string;
  to: string;
  id: bigint;
  value: bigint;
}

export interface TransferBatchEvent {
  operator: string;
  from: string;
  to: string;
  ids: bigint[];
  values: bigint[];
}
