import { ethers } from 'ethers';
import { ContractName } from '../config/addresses';
import { PlayerContract } from './PlayerContract';
import { FDFPairContract } from './FDFPairContract';
import { BondingCurveContract } from './BondingCurveContract';
import { ESPStakingContract } from './ESPStakingContract';
import { TokenContract } from './TokenContract';

import PlayerABI from '../abis/Player.json';
import FDFPairABI from '../abis/FDFPair.json';
import BondingCurveABI from '../abis/BondingCurve.json';
import ESPStakingABI from '../abis/ESPStaking.json';
import ESPABI from '../abis/ESP.json';
import TUSDCABI from '../abis/TUSDC.json';
import DevelopmentPlayersABI from '../abis/DevelopmentPlayers.json';
import FeeManagerABI from '../abis/FeeManager.json';
import PlayerPackABI from '../abis/PlayerPack.json';
import PlayerContractsABI from '../abis/PlayerContracts.json';

const ABI_MAP: Record<ContractName, any[]> = {
  Player: PlayerABI,
  FDFPair: FDFPairABI,
  BondingCurve: BondingCurveABI,
  ESPStaking: ESPStakingABI,
  ESP: ESPABI,
  TUSDC: TUSDCABI,
  DevelopmentPlayers: DevelopmentPlayersABI,
  FeeManager: FeeManagerABI,
  PlayerPack: PlayerPackABI,
  PlayerContracts: PlayerContractsABI,
};

export class ContractFactory {
  private instances = new Map<string, ethers.Contract>();

  constructor(
    private provider: ethers.JsonRpcProvider,
    private signer: ethers.Wallet,
    private addresses: Record<ContractName, string>
  ) {}

  /** Get typed Player contract wrapper */
  getPlayer(): PlayerContract {
    return new PlayerContract(this.getRawContract('Player'));
  }

  /** Get typed FDFPair contract wrapper */
  getFDFPair(): FDFPairContract {
    return new FDFPairContract(this.getRawContract('FDFPair'));
  }

  /** Get typed BondingCurve contract wrapper */
  getBondingCurve(): BondingCurveContract {
    return new BondingCurveContract(this.getRawContract('BondingCurve'));
  }

  /** Get typed ESPStaking contract wrapper */
  getStaking(): ESPStakingContract {
    return new ESPStakingContract(this.getRawContract('ESPStaking'));
  }

  /** Get typed ESP token wrapper */
  getEsp(): TokenContract {
    return new TokenContract(this.getRawContract('ESP'), 18);
  }

  /** Get typed TUSDC token wrapper */
  getUsdc(): TokenContract {
    return new TokenContract(this.getRawContract('TUSDC'), 6);
  }

  /** Get the address for a contract */
  getAddress(name: ContractName): string {
    return this.addresses[name];
  }

  /** Get a raw ethers.Contract instance for advanced usage */
  getRawContract(name: ContractName): ethers.Contract {
    const key = name;
    if (!this.instances.has(key)) {
      const address = this.addresses[name];
      const abi = ABI_MAP[name];
      if (!address || !abi) throw new Error(`Unknown contract: ${name}`);
      this.instances.set(key, new ethers.Contract(address, abi, this.signer));
    }
    return this.instances.get(key)!;
  }
}
