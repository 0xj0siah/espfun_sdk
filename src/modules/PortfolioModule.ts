import { ethers } from 'ethers';
import winston from 'winston';
import { ContractFactory } from '../contracts/ContractFactory';
import { USDC_DECIMALS, ESP_DECIMALS, TOKEN_DECIMALS } from '../config/constants';
import { PlayerBalance, DevelopmentPlayer } from '../types/player';

export class PortfolioModule {
  constructor(
    private contracts: ContractFactory,
    private wallet: ethers.Wallet,
    private logger: winston.Logger
  ) {}

  /** Get ERC1155 balance for a single player */
  async getPlayerBalance(playerId: number): Promise<bigint> {
    return this.contracts.getPlayer().balanceOf(this.wallet.address, playerId);
  }

  /** Get ERC1155 balances for multiple players in a single call */
  async getPlayerBalances(playerIds: number[]): Promise<Record<number, bigint>> {
    const balances = await this.contracts.getPlayer().balanceOfBatch(this.wallet.address, playerIds);
    const result: Record<number, bigint> = {};
    playerIds.forEach((id, i) => {
      result[id] = balances[i] ?? 0n;
    });
    return result;
  }

  /** Get all active player IDs from the Player contract */
  async getAllActivePlayerIds(): Promise<number[]> {
    return this.contracts.getPlayer().getActivePlayerIds();
  }

  /** Get all player IDs (including inactive) */
  async getAllPlayerIds(): Promise<number[]> {
    return this.contracts.getPlayer().getAllPlayerIds();
  }

  /** Get USDC balance (formatted as number) */
  async getUsdcBalance(): Promise<number> {
    const balance = await this.contracts.getUsdc().balanceOf(this.wallet.address);
    return parseFloat(ethers.formatUnits(balance, USDC_DECIMALS));
  }

  /** Get raw USDC balance as bigint */
  async getUsdcBalanceRaw(): Promise<bigint> {
    return this.contracts.getUsdc().balanceOf(this.wallet.address);
  }

  /** Get ESP balance (formatted as number) */
  async getEspBalance(): Promise<number> {
    const balance = await this.contracts.getEsp().balanceOf(this.wallet.address);
    return parseFloat(ethers.formatUnits(balance, ESP_DECIMALS));
  }

  /** Get raw ESP balance as bigint */
  async getEspBalanceRaw(): Promise<bigint> {
    return this.contracts.getEsp().balanceOf(this.wallet.address);
  }

  /** Get user's bonding curve balance for a player (pre-graduation tokens) */
  async getBondingCurveBalance(playerId: number): Promise<bigint> {
    return this.contracts.getBondingCurve().getUserBalance(playerId, this.wallet.address);
  }

  /** Get all owned players with balances > 0 */
  async getOwnedPlayers(): Promise<PlayerBalance[]> {
    const activeIds = await this.getAllActivePlayerIds();
    if (activeIds.length === 0) return [];

    const balances = await this.contracts.getPlayer().balanceOfBatch(this.wallet.address, activeIds);
    const owned: PlayerBalance[] = [];

    activeIds.forEach((id, i) => {
      if (balances[i] > 0n) {
        owned.push({ playerId: id, balance: balances[i] });
      }
    });

    return owned;
  }

  /** Get summary of all balances */
  async getPortfolioSummary(): Promise<{
    usdc: number;
    esp: number;
    ownedPlayers: PlayerBalance[];
  }> {
    const [usdc, esp, ownedPlayers] = await Promise.all([
      this.getUsdcBalance(),
      this.getEspBalance(),
      this.getOwnedPlayers(),
    ]);
    return { usdc, esp, ownedPlayers };
  }
}
