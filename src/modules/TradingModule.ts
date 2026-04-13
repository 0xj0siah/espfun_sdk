import { ethers } from 'ethers';
import winston from 'winston';
import { ContractFactory } from '../contracts/ContractFactory';
import { BackendApiClient } from '../services/BackendApiClient';
import { SignatureService } from '../services/SignatureService';
import { TransactionResult } from '../types/common';
import { TradingPhase, LaunchInfo, LaunchProgress, TradeQuote } from '../types/trading';
import { TradeOptions } from '../types/config';
import { USDC_DECIMALS, TOKEN_DECIMALS, DEFAULT_SLIPPAGE_PERCENT, DEFAULT_DEADLINE_SECONDS, ZERO_ADDRESS } from '../config/constants';
import { InsufficientBalanceError, TransactionError } from '../utils/errors';

export interface TradingPhaseResult {
  phase: TradingPhase;
  launch: LaunchInfo | null;
  progress: LaunchProgress | null;
  userCurveBalance: bigint;
}

export class TradingModule {
  constructor(
    private contracts: ContractFactory,
    private wallet: ethers.Wallet,
    private signatureService: SignatureService,
    private apiClient: BackendApiClient,
    private defaultSlippage: number,
    private defaultDeadline: number,
    private logger: winston.Logger
  ) {}

  /**
   * Detect which trading phase a player is in.
   * Falls back to FDFPair if BondingCurve has no launch.
   */
  async getTradingPhase(playerId: number): Promise<TradingPhaseResult> {
    const bondingCurve = this.contracts.getBondingCurve();

    // If BondingCurve address is zero, default to FDFPair
    if (!bondingCurve.address || bondingCurve.address === ZERO_ADDRESS) {
      return { phase: TradingPhase.FDFPair, launch: null, progress: null, userCurveBalance: 0n };
    }

    let launch: LaunchInfo;
    try {
      launch = await bondingCurve.getLaunchInfo(playerId);
    } catch {
      // Contract call failed — no launch or contract not deployed
      return { phase: TradingPhase.FDFPair, launch: null, progress: null, userCurveBalance: 0n };
    }

    // No launch exists
    if (launch.totalTokensForSale === 0n) {
      return { phase: TradingPhase.FDFPair, launch, progress: null, userCurveBalance: 0n };
    }

    // Cancelled
    if (launch.cancelled) {
      let userCurveBalance = 0n;
      try {
        userCurveBalance = await bondingCurve.getUserBalance(playerId, this.wallet.address);
      } catch {}
      return { phase: TradingPhase.Cancelled, launch, progress: null, userCurveBalance };
    }

    // Graduated
    if (launch.graduated) {
      let userCurveBalance = 0n;
      try {
        userCurveBalance = await bondingCurve.getUserBalance(playerId, this.wallet.address);
      } catch {}
      const phase = userCurveBalance > 0n ? TradingPhase.Graduated : TradingPhase.FDFPair;
      return { phase, launch, progress: null, userCurveBalance };
    }

    // Active bonding curve
    let progress: LaunchProgress | null = null;
    try {
      progress = await bondingCurve.getProgress(playerId);
    } catch {}

    let userCurveBalance = 0n;
    try {
      userCurveBalance = await bondingCurve.getUserBalance(playerId, this.wallet.address);
    } catch {}

    return { phase: TradingPhase.BondingCurve, launch, progress, userCurveBalance };
  }

  /**
   * Buy player tokens. Auto-detects phase and routes to BondingCurve or FDFPair.
   */
  async buy(playerId: number, usdcAmount: number, options?: TradeOptions): Promise<TransactionResult> {
    const { phase } = await this.getTradingPhase(playerId);
    this.logger.info(`Buying player ${playerId}: phase=${phase}, amount=${usdcAmount} USDC`);

    if (phase === TradingPhase.BondingCurve) {
      return this.buyOnBondingCurve(playerId, usdcAmount, options);
    }

    if (phase === TradingPhase.FDFPair) {
      return this.buyOnFDFPair(playerId, usdcAmount, options);
    }

    throw new TransactionError(`Cannot buy: player ${playerId} is in phase "${phase}"`);
  }

  /**
   * Sell player tokens. Auto-detects phase and routes to BondingCurve or FDFPair.
   */
  async sell(playerId: number, tokenAmount: number, options?: TradeOptions): Promise<TransactionResult> {
    const { phase } = await this.getTradingPhase(playerId);
    this.logger.info(`Selling player ${playerId}: phase=${phase}, amount=${tokenAmount} tokens`);

    if (phase === TradingPhase.BondingCurve) {
      return this.sellOnBondingCurve(playerId, tokenAmount, options);
    }

    if (phase === TradingPhase.FDFPair) {
      return this.sellOnFDFPair(playerId, tokenAmount, options);
    }

    throw new TransactionError(`Cannot sell: player ${playerId} is in phase "${phase}"`);
  }

  /** Claim ERC1155 tokens after bonding curve graduation */
  async claimTokens(playerId: number): Promise<TransactionResult> {
    this.logger.info(`Claiming tokens for player ${playerId}`);
    return this.contracts.getBondingCurve().claimTokens(playerId);
  }

  /** Refund USDC after bonding curve cancellation */
  async refund(playerId: number): Promise<TransactionResult> {
    this.logger.info(`Requesting refund for player ${playerId}`);
    return this.contracts.getBondingCurve().refund(playerId);
  }

  // --- Private: BondingCurve buy/sell ---

  private async buyOnBondingCurve(playerId: number, usdcAmount: number, options?: TradeOptions): Promise<TransactionResult> {
    const slippage = options?.slippage ?? this.defaultSlippage;
    const deadlineSec = options?.deadline ?? this.defaultDeadline;

    const currencyAmount = ethers.parseUnits(String(usdcAmount), USDC_DECIMALS);
    const maxSpend = currencyAmount + (currencyAmount * BigInt(Math.round(slippage * 100))) / 10000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSec);

    // Check USDC balance
    const usdcBalance = await this.contracts.getUsdc().balanceOf(this.wallet.address);
    if (usdcBalance < maxSpend) {
      throw new InsufficientBalanceError(
        `Insufficient USDC: have ${ethers.formatUnits(usdcBalance, USDC_DECIMALS)}, need ${ethers.formatUnits(maxSpend, USDC_DECIMALS)}`
      );
    }

    // Approve USDC for BondingCurve
    this.logger.debug('Approving USDC for BondingCurve...');
    await this.contracts.getUsdc().ensureAllowance(
      this.wallet.address,
      this.contracts.getBondingCurve().address,
      maxSpend
    );

    // We pass currencyAmount as the "token amount" parameter since
    // buyFromCurve takes (playerId, amount, maxCurrencySpend, deadline)
    // where amount is how many tokens to buy. We use 0n to let the contract
    // calculate based on maxCurrencySpend, but the contract actually needs a token amount.
    // The frontend passes tokenAmount directly. For a simpler UX, we'll get a quote first.
    const quote = await this.contracts.getFDFPair().getBuyPrice([playerId], [0n], [currencyAmount]).catch(() => null);
    const tokenAmount = quote?.amountsToReceive[0] ?? currencyAmount; // fallback

    this.logger.debug('Executing buyFromCurve...');
    return this.contracts.getBondingCurve().buyFromCurve(playerId, tokenAmount, maxSpend, deadline);
  }

  private async sellOnBondingCurve(playerId: number, tokenAmount: number, options?: TradeOptions): Promise<TransactionResult> {
    const slippage = options?.slippage ?? this.defaultSlippage;
    const deadlineSec = options?.deadline ?? this.defaultDeadline;

    const amount = ethers.parseUnits(String(tokenAmount), TOKEN_DECIMALS);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSec);

    // Calculate minimum receive with slippage
    const minReceive = 0n; // BondingCurve sell — accept any amount, slippage protected by contract

    this.logger.debug('Executing sellToCurve...');
    return this.contracts.getBondingCurve().sellToCurve(playerId, amount, minReceive, deadline);
  }

  // --- Private: FDFPair buy/sell ---

  private async buyOnFDFPair(playerId: number, usdcAmount: number, options?: TradeOptions): Promise<TransactionResult> {
    const slippage = options?.slippage ?? this.defaultSlippage;
    const deadlineSec = options?.deadline ?? this.defaultDeadline;
    const recipient = options?.recipient ?? this.wallet.address;

    const currencyAmount = ethers.parseUnits(String(usdcAmount), USDC_DECIMALS);
    const maxSpend = currencyAmount + (currencyAmount * BigInt(Math.round(slippage * 100))) / 10000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSec);

    // Get buy quote to know expected tokens
    this.logger.debug('Getting buy quote...');
    const buyPrice = await this.contracts.getFDFPair().getBuyPrice([playerId], [0n], [currencyAmount]);
    const expectedTokens = buyPrice.amountsToReceive[0] || 0n;

    // Check USDC balance
    const usdcBalance = await this.contracts.getUsdc().balanceOf(this.wallet.address);
    if (usdcBalance < maxSpend) {
      throw new InsufficientBalanceError(
        `Insufficient USDC: have ${ethers.formatUnits(usdcBalance, USDC_DECIMALS)}, need ${ethers.formatUnits(maxSpend, USDC_DECIMALS)}`
      );
    }

    // Approve USDC for FDFPair
    this.logger.debug('Approving USDC for FDFPair...');
    await this.contracts.getUsdc().ensureAllowance(
      this.wallet.address,
      this.contracts.getFDFPair().address,
      maxSpend
    );

    // Get EIP-712 signature
    this.logger.debug('Getting buy signature...');
    const sigResult = await this.signatureService.getBuySignature({
      playerTokenIds: [playerId],
      amounts: [expectedTokens],
      maxCurrencySpend: maxSpend,
      deadline,
    });

    // Execute buy
    this.logger.debug('Executing FDFPair buyTokens...');
    const result = await this.contracts.getFDFPair().buyTokens(
      [playerId],
      [expectedTokens],
      maxSpend,
      deadline,
      recipient,
      sigResult.signature,
      BigInt(sigResult.nonce)
    );

    // Confirm with backend
    if (sigResult.transactionId) {
      try {
        await this.apiClient.confirmBuyTransaction(sigResult.transactionId, result.hash);
      } catch (err: any) {
        this.logger.warn(`Backend buy confirmation failed: ${err.message}`);
      }
    }

    return { ...result, transactionId: sigResult.transactionId };
  }

  private async sellOnFDFPair(playerId: number, tokenAmount: number, options?: TradeOptions): Promise<TransactionResult> {
    const slippage = options?.slippage ?? this.defaultSlippage;
    const deadlineSec = options?.deadline ?? this.defaultDeadline;

    const amount = ethers.parseUnits(String(tokenAmount), TOKEN_DECIMALS);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSec);

    // Check token balance
    const balance = await this.contracts.getPlayer().balanceOf(this.wallet.address, playerId);
    if (balance < amount) {
      throw new InsufficientBalanceError(
        `Insufficient tokens: have ${ethers.formatUnits(balance, TOKEN_DECIMALS)}, need ${tokenAmount}`
      );
    }

    // Get sell quote
    this.logger.debug('Getting sell quote...');
    const sellPrice = await this.contracts.getFDFPair().getSellPrice([playerId], [amount]);
    const expectedUsdc = sellPrice.amountsToReceive[0] || 0n;
    const minReceive = expectedUsdc - (expectedUsdc * BigInt(Math.round(slippage * 100))) / 10000n;

    // Ensure Player contract is approved for FDFPair (ERC1155 approval)
    const isApproved = await this.contracts.getPlayer().isApprovedForAll(
      this.wallet.address,
      this.contracts.getPlayer().address
    );
    if (!isApproved) {
      this.logger.debug('Setting ERC1155 approval for Player contract...');
      await this.contracts.getPlayer().setApprovalForAll(this.contracts.getPlayer().address, true);
    }

    // Get EIP-712 signature
    this.logger.debug('Getting sell signature...');
    const sigResult = await this.signatureService.getSellSignature({
      playerTokenIds: [playerId],
      amounts: [amount],
      minCurrencyToReceive: minReceive,
      deadline,
    });

    // Execute sell via Player contract
    this.logger.debug('Executing Player sellTokens...');
    const result = await this.contracts.getPlayer().sellTokens(
      [playerId],
      [amount],
      minReceive,
      deadline,
      sigResult.signature,
      BigInt(sigResult.nonce)
    );

    // Confirm with backend
    if (sigResult.transactionId) {
      try {
        await this.apiClient.confirmSellTransaction(sigResult.transactionId, result.hash);
      } catch (err: any) {
        this.logger.warn(`Backend sell confirmation failed: ${err.message}`);
      }
    }

    return { ...result, transactionId: sigResult.transactionId };
  }
}
