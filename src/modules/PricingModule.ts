import winston from 'winston';
import { ContractFactory } from '../contracts/ContractFactory';
import { PoolInfo, PriceImpact } from '../types/common';
import { TradeQuote, LaunchInfo, LaunchProgress, FeeType } from '../types/trading';
import { formatUsdc, formatTokens } from '../utils/decimals';
import { USDC_DECIMALS, TOKEN_DECIMALS } from '../config/constants';

export class PricingModule {
  constructor(
    private contracts: ContractFactory,
    private logger: winston.Logger
  ) {}

  /** Get current price of a player token in USDC */
  async getPrice(playerId: number): Promise<number> {
    const prices = await this.contracts.getFDFPair().getPrices([playerId]);
    if (prices.length > 0 && prices[0] > 0n) {
      return parseFloat(formatUsdc(prices[0]));
    }
    return 0;
  }

  /** Get prices for multiple players */
  async getPrices(playerIds: number[]): Promise<Record<number, number>> {
    const prices = await this.contracts.getFDFPair().getPrices(playerIds);
    const result: Record<number, number> = {};
    playerIds.forEach((id, i) => {
      if (i < prices.length && prices[i] > 0n) {
        result[id] = parseFloat(formatUsdc(prices[i]));
      }
    });
    return result;
  }

  /** Get pool reserves for a player */
  async getPoolInfo(playerId: number): Promise<PoolInfo> {
    const { currencyReserves, playerTokenReserves } = await this.contracts.getFDFPair().getPoolInfo([playerId]);
    const currencyReserve = currencyReserves[0] || 0n;
    const playerTokenReserve = playerTokenReserves[0] || 0n;
    const price = playerTokenReserve > 0n
      ? Number(currencyReserve) / Math.pow(10, USDC_DECIMALS) / (Number(playerTokenReserve) / Math.pow(10, TOKEN_DECIMALS))
      : 0;
    return { playerId, currencyReserve, playerTokenReserve, price };
  }

  /** Get buy quote from FDFPair */
  async getBuyQuote(playerId: number, usdcAmount: number): Promise<TradeQuote> {
    const { ethers } = await import('ethers');
    const currencyAmount = ethers.parseUnits(String(usdcAmount), USDC_DECIMALS);
    const result = await this.contracts.getFDFPair().getBuyPrice([playerId], [0n], [currencyAmount]);
    return {
      amountToReceive: result.amountsToReceive[0] || 0n,
      feeAmount: result.feeAmounts[0] || 0n,
      feeRate: Number(result.feeRates[0] || 0n),
      feeType: (result.feeTypes[0] ?? null) as FeeType | null,
    };
  }

  /** Get sell quote from FDFPair */
  async getSellQuote(playerId: number, tokenAmount: number): Promise<TradeQuote> {
    const { ethers } = await import('ethers');
    const amount = ethers.parseUnits(String(tokenAmount), TOKEN_DECIMALS);
    const result = await this.contracts.getFDFPair().getSellPrice([playerId], [amount]);
    return {
      amountToReceive: result.amountsToReceive[0] || 0n,
      feeAmount: result.feeAmounts[0] || 0n,
      feeRate: Number(result.feeRates[0] || 0n),
      feeType: (result.feeTypes[0] ?? null) as FeeType | null,
    };
  }

  /** Calculate price impact for a trade */
  async calculatePriceImpact(playerId: number, usdcAmount: number, action: 'buy' | 'sell'): Promise<PriceImpact> {
    const pool = await this.getPoolInfo(playerId);
    if (pool.currencyReserve === 0n || pool.playerTokenReserve === 0n) {
      return { currentPrice: 0, newPrice: 0, priceImpactPercent: 0, effectivePrice: 0 };
    }

    const currentPrice = pool.price;
    const tradeValue = usdcAmount;
    const reserveValue = Number(pool.currencyReserve) / Math.pow(10, USDC_DECIMALS);
    const impactPercent = (tradeValue / reserveValue) * 100;
    const newPrice = action === 'buy'
      ? currentPrice * (1 + impactPercent / 100)
      : currentPrice * (1 - impactPercent / 100);

    return {
      currentPrice,
      newPrice,
      priceImpactPercent: Math.min(impactPercent, 100),
      effectivePrice: (currentPrice + newPrice) / 2,
    };
  }

  /** Get bonding curve launch info */
  async getLaunchInfo(playerId: number): Promise<LaunchInfo> {
    return this.contracts.getBondingCurve().getLaunchInfo(playerId);
  }

  /** Get bonding curve launch progress */
  async getLaunchProgress(playerId: number): Promise<LaunchProgress> {
    return this.contracts.getBondingCurve().getProgress(playerId);
  }
}
