// Main SDK
export { EspSDK } from './EspSDK';
export default EspSDK;
import { EspSDK } from './EspSDK';

// Types
export type { SDKConfig, TradeOptions } from './types/config';
export type { TransactionResult, PoolInfo, PriceImpact } from './types/common';
export { TradingPhase, FeeType } from './types/trading';
export type { TradeQuote, LaunchInfo, LaunchProgress, FeeInfo } from './types/trading';
export type { PlayerBalance, DevelopmentPlayer, PlayerInfo } from './types/player';
export type { StakingGlobalInfo, StakingUserInfo } from './types/staking';
export type {
  TokensPurchasedEvent, CurrencyPurchaseEvent, LiquidityAddedEvent,
  BondingCurveBuyEvent, BondingCurveSellEvent, GraduatedEvent,
  LaunchCreatedEvent, ClaimedEvent, StakedEvent, UnstakedEvent,
  RewardsClaimedEvent, RewardsDistributedEvent, TransferSingleEvent, TransferBatchEvent,
} from './types/events';
export type {
  AuthNonceResponse, AuthLoginResponse, BuySignatureRequest,
  SellSignatureRequest, SignatureResponse, UserPoints, PackPurchaseResponse,
} from './types/api';

// Modules (for selective import)
export { TradingModule } from './modules/TradingModule';
export type { TradingPhaseResult } from './modules/TradingModule';
export { PricingModule } from './modules/PricingModule';
export { StakingModule } from './modules/StakingModule';
export { PortfolioModule } from './modules/PortfolioModule';
export { PackModule } from './modules/PackModule';
export type { PackType } from './modules/PackModule';
export { PlayerManagementModule } from './modules/PlayerManagementModule';
export { EventModule } from './modules/EventModule';

// Contracts (for advanced usage)
export { ContractFactory } from './contracts/ContractFactory';
export { PlayerContract } from './contracts/PlayerContract';
export { FDFPairContract } from './contracts/FDFPairContract';
export { BondingCurveContract } from './contracts/BondingCurveContract';
export { ESPStakingContract } from './contracts/ESPStakingContract';
export { TokenContract } from './contracts/TokenContract';

// Config
export { NETWORKS, getNetworkConfig } from './config/networks';
export type { NetworkConfig } from './config/networks';
export { CONTRACT_ADDRESSES, getAddresses } from './config/addresses';
export type { ContractName } from './config/addresses';
export {
  USDC_DECIMALS, TOKEN_DECIMALS, ESP_DECIMALS,
  DEFAULT_SLIPPAGE_PERCENT, DEFAULT_DEADLINE_SECONDS,
  FEE_DENOMINATOR, BASIS_POINTS_DENOMINATOR, ZERO_ADDRESS,
} from './config/constants';

// Utils
export { parseUsdc, formatUsdc, parseTokens, formatTokens, parseEsp, formatEsp } from './utils/decimals';
export {
  EspSDKError, ConfigurationError, AuthenticationError,
  InsufficientBalanceError, InsufficientLiquidityError,
  SlippageExceededError, TransactionError, SignatureError,
  RateLimitError, NetworkError, parseContractError,
} from './utils/errors';
export { createLogger } from './utils/logger';
export { retryWithBackoff } from './utils/retry';
