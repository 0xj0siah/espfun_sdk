import { ethers } from 'ethers';
import { ContractName } from '../config/addresses';

export interface SDKConfig {
  /** Wallet private key or ethers.Wallet instance */
  wallet: string | ethers.Wallet;
  /** Network: preset name or custom config */
  network?: 'base-sepolia' | 'monad-testnet' | { chainId: number; rpcUrl: string };
  /** Backend API base URL (defaults to https://api.esp.fun) */
  apiUrl?: string;
  /** Custom RPC URL override (takes precedence over network preset) */
  rpcUrl?: string;
  /** Default slippage in percent (default: 0.5) */
  defaultSlippage?: number;
  /** Transaction deadline in seconds (default: 300) */
  defaultDeadline?: number;
  /** Log level (default: 'info') */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** API key for backend authentication (alternative to wallet signature auth) */
  apiKey?: string;
  /** Contract address overrides */
  contracts?: Partial<Record<ContractName, string>>;
}

export interface TradeOptions {
  /** Slippage tolerance in percent (e.g., 0.5 for 0.5%) */
  slippage?: number;
  /** Transaction deadline in seconds */
  deadline?: number;
  /** Recipient address (defaults to wallet address) */
  recipient?: string;
}
