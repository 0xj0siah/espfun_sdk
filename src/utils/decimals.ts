import { ethers } from 'ethers';
import { USDC_DECIMALS, TOKEN_DECIMALS, ESP_DECIMALS } from '../config/constants';

/** Parse a human-readable USDC amount to contract units (6 decimals) */
export function parseUsdc(amount: number | string): bigint {
  return ethers.parseUnits(String(amount), USDC_DECIMALS);
}

/** Format contract USDC units to human-readable string */
export function formatUsdc(amount: bigint): string {
  return ethers.formatUnits(amount, USDC_DECIMALS);
}

/** Parse a human-readable token amount to contract units (18 decimals) */
export function parseTokens(amount: number | string): bigint {
  return ethers.parseUnits(String(amount), TOKEN_DECIMALS);
}

/** Format contract token units to human-readable string */
export function formatTokens(amount: bigint): string {
  return ethers.formatUnits(amount, TOKEN_DECIMALS);
}

/** Parse a human-readable ESP amount to contract units (18 decimals) */
export function parseEsp(amount: number | string): bigint {
  return ethers.parseUnits(String(amount), ESP_DECIMALS);
}

/** Format contract ESP units to human-readable string */
export function formatEsp(amount: bigint): string {
  return ethers.formatUnits(amount, ESP_DECIMALS);
}
