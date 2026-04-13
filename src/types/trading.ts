export enum TradingPhase {
  /** Active bonding curve launch */
  BondingCurve = 'bonding_curve',
  /** Graduated but user has unclaimed tokens */
  Graduated = 'graduated',
  /** Normal AMM trading via FDFPair */
  FDFPair = 'fdfpair',
  /** Launch was cancelled — refund available */
  Cancelled = 'cancelled',
  /** Unknown / loading */
  Unknown = 'unknown',
}

export enum FeeType {
  Normal = 0,
  FlashSale = 1,
  FeeTier = 2,
}

export interface TradeQuote {
  amountToReceive: bigint;
  feeAmount: bigint;
  feeRate: number;
  feeType: FeeType | null;
}

export interface LaunchInfo {
  playerId: bigint;
  totalTokensForSale: bigint;
  tokensSold: bigint;
  currencyCollected: bigint;
  tokensForLiquidity: bigint;
  fundingTarget: bigint;
  virtualTokenReserve: bigint;
  virtualCurrencyReserve: bigint;
  createdAt: bigint;
  deadline: bigint;
  graduated: boolean;
  cancelled: boolean;
}

export interface LaunchProgress {
  raised: bigint;
  target: bigint;
  percentComplete: number;
}

export interface FeeInfo {
  feeRate: number;
  feeType: FeeType;
  remainingTime?: number;
}
