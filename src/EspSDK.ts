import { ethers } from 'ethers';
import { SDKConfig, TradeOptions } from './types/config';
import { TransactionResult } from './types/common';
import { TradingPhase } from './types/trading';
import { ContractFactory } from './contracts/ContractFactory';
import { BackendApiClient } from './services/BackendApiClient';
import { AuthService } from './services/AuthService';
import { SignatureService } from './services/SignatureService';
import { TradingModule } from './modules/TradingModule';
import { PricingModule } from './modules/PricingModule';
import { StakingModule } from './modules/StakingModule';
import { PortfolioModule } from './modules/PortfolioModule';
import { PackModule } from './modules/PackModule';
import { PlayerManagementModule } from './modules/PlayerManagementModule';
import { EventModule } from './modules/EventModule';
import { getNetworkConfig } from './config/networks';
import { getAddresses } from './config/addresses';
import { DEFAULT_SLIPPAGE_PERCENT, DEFAULT_DEADLINE_SECONDS } from './config/constants';
import { createLogger } from './utils/logger';
import { ConfigurationError } from './utils/errors';

export class EspSDK {
  readonly trading: TradingModule;
  readonly pricing: PricingModule;
  readonly staking: StakingModule;
  readonly portfolio: PortfolioModule;
  readonly packs: PackModule;
  readonly players: PlayerManagementModule;
  readonly events: EventModule;
  readonly contracts: ContractFactory;
  readonly address: string;

  private authService: AuthService;
  private apiClient: BackendApiClient;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor(config: SDKConfig) {
    const logger = createLogger(config.logLevel ?? 'info');

    // Resolve network
    const networkInput = config.network ?? 'base-sepolia';
    const networkConfig = getNetworkConfig(networkInput);
    const rpcUrl = config.rpcUrl ?? networkConfig.rpcUrl;
    const chainId = networkConfig.chainId;

    // Set up provider + wallet
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (typeof config.wallet === 'string') {
      if (!config.wallet) throw new ConfigurationError('Wallet private key is required');
      this.wallet = new ethers.Wallet(config.wallet, this.provider);
    } else {
      this.wallet = config.wallet.connect(this.provider) as ethers.Wallet;
    }

    this.address = this.wallet.address;

    // Resolve contract addresses
    const addresses = getAddresses(chainId, config.contracts);

    // Core infrastructure
    this.contracts = new ContractFactory(this.provider, this.wallet, addresses);

    this.apiClient = new BackendApiClient(
      config.apiUrl ?? networkConfig.apiUrl,
      logger,
      config.apiKey
    );

    this.authService = new AuthService(this.wallet, this.apiClient, logger);

    const signatureService = new SignatureService(
      this.wallet,
      this.apiClient,
      chainId,
      addresses.FDFPair,
      addresses.Player,
      logger
    );

    const slippage = config.defaultSlippage ?? DEFAULT_SLIPPAGE_PERCENT;
    const deadline = config.defaultDeadline ?? DEFAULT_DEADLINE_SECONDS;

    // Initialize modules
    this.trading = new TradingModule(
      this.contracts, this.wallet, signatureService, this.apiClient,
      this.authService, slippage, deadline, logger
    );
    this.pricing = new PricingModule(this.contracts, logger);
    this.staking = new StakingModule(this.contracts, this.wallet, logger);
    this.portfolio = new PortfolioModule(this.contracts, this.wallet, logger);
    this.packs = new PackModule(this.apiClient, this.authService, logger);
    this.players = new PlayerManagementModule(this.apiClient, this.authService, logger);
    this.events = new EventModule(this.contracts, logger);

    logger.info(`EspSDK initialized: wallet=${this.address}, chain=${chainId}, rpc=${rpcUrl}`);
  }

  // --- Convenience shortcuts ---

  /** Buy player tokens (auto-detects BondingCurve vs FDFPair) */
  async buy(playerId: number, usdcAmount: number, options?: TradeOptions): Promise<TransactionResult> {
    return this.trading.buy(playerId, usdcAmount, options);
  }

  /** Sell player tokens (auto-detects BondingCurve vs FDFPair) */
  async sell(playerId: number, tokenAmount: number, options?: TradeOptions): Promise<TransactionResult> {
    return this.trading.sell(playerId, tokenAmount, options);
  }

  /** Stake ESP tokens */
  async stake(amount: number): Promise<TransactionResult> {
    return this.staking.stake(amount);
  }

  /** Unstake ESP tokens */
  async unstake(amount: number): Promise<TransactionResult> {
    return this.staking.unstake(amount);
  }

  /** Get current price of a player token in USDC */
  async getPrice(playerId: number): Promise<number> {
    return this.pricing.getPrice(playerId);
  }

  /** Get player token balance */
  async getBalance(playerId: number): Promise<bigint> {
    return this.portfolio.getPlayerBalance(playerId);
  }

  /** Authenticate with backend (required for FDFPair trades, packs, promotions) */
  async authenticate(): Promise<void> {
    await this.authService.authenticate();
  }

  /** Clean up event listeners and connections */
  async destroy(): Promise<void> {
    this.events.removeAllListeners();
    this.provider.destroy();
  }
}
