import winston from 'winston';
import { ContractFactory } from '../contracts/ContractFactory';
import {
  TokensPurchasedEvent,
  CurrencyPurchaseEvent,
  LiquidityAddedEvent,
  BondingCurveBuyEvent,
  BondingCurveSellEvent,
  GraduatedEvent,
  LaunchCreatedEvent,
  ClaimedEvent,
  StakedEvent,
  UnstakedEvent,
  RewardsClaimedEvent,
  RewardsDistributedEvent,
  TransferSingleEvent,
  TransferBatchEvent,
} from '../types/events';

type UnsubscribeFn = () => void;

export class EventModule {
  private listeners: Array<{ contract: string; event: string; unsub: UnsubscribeFn }> = [];

  constructor(
    private contracts: ContractFactory,
    private logger: winston.Logger
  ) {}

  // --- FDFPair Events ---

  onTokensPurchased(callback: (event: TokensPurchasedEvent) => void): UnsubscribeFn {
    return this.subscribe('FDFPair', 'TokensPurchased', callback, (args: any[]) => ({
      buyer: args[0],
      recipient: args[1],
      playerTokenIds: args[2],
      amounts: args[3],
      currencySpent: args[4],
      newPrices: args[5],
      feeAmounts: args[6],
    }));
  }

  onCurrencyPurchase(callback: (event: CurrencyPurchaseEvent) => void): UnsubscribeFn {
    return this.subscribe('FDFPair', 'CurrencyPurchase', callback, (args: any[]) => ({
      buyer: args[0],
      recipient: args[1],
      playerTokenIds: args[2],
      amounts: args[3],
      currencyReceived: args[4],
      newPrices: args[5],
      feeAmounts: args[6],
    }));
  }

  onLiquidityAdded(callback: (event: LiquidityAddedEvent) => void): UnsubscribeFn {
    return this.subscribe('FDFPair', 'LiquidityAdded', callback, (args: any[]) => ({
      provider: args[0],
      playerTokenIds: args[1],
      tokenAmounts: args[2],
      currencyAmounts: args[3],
    }));
  }

  // --- BondingCurve Events ---

  onBondingCurveBuy(callback: (event: BondingCurveBuyEvent) => void): UnsubscribeFn {
    return this.subscribe('BondingCurve', 'Bought', callback, (args: any[]) => ({
      user: args[0],
      playerId: args[1],
      amount: args[2],
      currencySpent: args[3],
    }));
  }

  onBondingCurveSell(callback: (event: BondingCurveSellEvent) => void): UnsubscribeFn {
    return this.subscribe('BondingCurve', 'Sold', callback, (args: any[]) => ({
      user: args[0],
      playerId: args[1],
      amount: args[2],
      currencyReceived: args[3],
    }));
  }

  onGraduated(callback: (event: GraduatedEvent) => void): UnsubscribeFn {
    return this.subscribe('BondingCurve', 'Graduated', callback, (args: any[]) => ({
      playerId: args[0],
      totalRaised: args[1],
    }));
  }

  onLaunchCreated(callback: (event: LaunchCreatedEvent) => void): UnsubscribeFn {
    return this.subscribe('BondingCurve', 'LaunchCreated', callback, (args: any[]) => ({
      playerId: args[0],
      tokensForSale: args[1],
      tokensForLP: args[2],
      fundingTarget: args[3],
    }));
  }

  onClaimed(callback: (event: ClaimedEvent) => void): UnsubscribeFn {
    return this.subscribe('BondingCurve', 'Claimed', callback, (args: any[]) => ({
      user: args[0],
      playerId: args[1],
      amount: args[2],
    }));
  }

  // --- ESPStaking Events ---

  onStaked(callback: (event: StakedEvent) => void): UnsubscribeFn {
    return this.subscribe('ESPStaking', 'Staked', callback, (args: any[]) => ({
      user: args[0],
      amount: args[1],
    }));
  }

  onUnstaked(callback: (event: UnstakedEvent) => void): UnsubscribeFn {
    return this.subscribe('ESPStaking', 'Unstaked', callback, (args: any[]) => ({
      user: args[0],
      amount: args[1],
    }));
  }

  onRewardsClaimed(callback: (event: RewardsClaimedEvent) => void): UnsubscribeFn {
    return this.subscribe('ESPStaking', 'RewardsClaimed', callback, (args: any[]) => ({
      user: args[0],
      amount: args[1],
    }));
  }

  onRewardsDistributed(callback: (event: RewardsDistributedEvent) => void): UnsubscribeFn {
    return this.subscribe('ESPStaking', 'RewardsDistributed', callback, (args: any[]) => ({
      totalRewards: args[0],
      stakerRewards: args[1],
      opsRewards: args[2],
    }));
  }

  // --- Player (ERC1155) Events ---

  onTransferSingle(callback: (event: TransferSingleEvent) => void): UnsubscribeFn {
    return this.subscribe('Player', 'TransferSingle', callback, (args: any[]) => ({
      operator: args[0],
      from: args[1],
      to: args[2],
      id: args[3],
      value: args[4],
    }));
  }

  onTransferBatch(callback: (event: TransferBatchEvent) => void): UnsubscribeFn {
    return this.subscribe('Player', 'TransferBatch', callback, (args: any[]) => ({
      operator: args[0],
      from: args[1],
      to: args[2],
      ids: args[3],
      values: args[4],
    }));
  }

  /** Remove all event listeners */
  removeAllListeners(): void {
    for (const listener of this.listeners) {
      listener.unsub();
    }
    this.listeners = [];
    this.logger.debug('Removed all event listeners');
  }

  /** Get count of active listeners */
  get activeListenerCount(): number {
    return this.listeners.length;
  }

  // --- Internal ---

  private subscribe<T>(
    contractName: string,
    eventName: string,
    callback: (event: T) => void,
    parser: (args: any[]) => T
  ): UnsubscribeFn {
    const contract = this.contracts.getRawContract(contractName as any);

    const handler = (...args: any[]) => {
      try {
        // ethers v6: last arg is the event log object, preceding args are event params
        const eventArgs = args.slice(0, -1);
        const parsed = parser(eventArgs);
        callback(parsed);
      } catch (err: any) {
        this.logger.error(`Error processing ${contractName}.${eventName} event: ${err.message}`);
      }
    };

    contract.on(eventName, handler);
    this.logger.debug(`Subscribed to ${contractName}.${eventName}`);

    const unsub = () => {
      contract.off(eventName, handler);
      this.listeners = this.listeners.filter(l => l.unsub !== unsub);
      this.logger.debug(`Unsubscribed from ${contractName}.${eventName}`);
    };

    this.listeners.push({ contract: contractName, event: eventName, unsub });
    return unsub;
  }
}
