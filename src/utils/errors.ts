import { ethers } from 'ethers';

export class EspSDKError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'EspSDKError';
    this.code = code;
  }
}

export class ConfigurationError extends EspSDKError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class AuthenticationError extends EspSDKError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class InsufficientBalanceError extends EspSDKError {
  constructor(message: string) {
    super(message, 'INSUFFICIENT_BALANCE');
    this.name = 'InsufficientBalanceError';
  }
}

export class InsufficientLiquidityError extends EspSDKError {
  constructor(playerId: number) {
    super(`Insufficient liquidity for player ${playerId}`, 'INSUFFICIENT_LIQUIDITY');
    this.name = 'InsufficientLiquidityError';
  }
}

export class SlippageExceededError extends EspSDKError {
  constructor(expected: string, actual: string) {
    super(`Slippage exceeded: expected ${expected}, got ${actual}`, 'SLIPPAGE_EXCEEDED');
    this.name = 'SlippageExceededError';
  }
}

export class TransactionError extends EspSDKError {
  txHash?: string;
  receipt?: ethers.TransactionReceipt;
  constructor(message: string, txHash?: string, receipt?: ethers.TransactionReceipt) {
    super(message, 'TRANSACTION_ERROR');
    this.name = 'TransactionError';
    this.txHash = txHash;
    this.receipt = receipt;
  }
}

export class SignatureError extends EspSDKError {
  constructor(message: string) {
    super(message, 'SIGNATURE_ERROR');
    this.name = 'SignatureError';
  }
}

export class RateLimitError extends EspSDKError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends EspSDKError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

/** Map known contract revert reasons to SDK errors */
export function parseContractError(error: any): EspSDKError {
  const msg = error?.message || error?.reason || String(error);
  if (msg.includes('InvalidSignature')) return new SignatureError('Invalid EIP-712 signature');
  if (msg.includes('InvalidNonce')) return new SignatureError('Nonce already used — retry with fresh nonce');
  if (msg.includes('DEADLINE_EXCEEDED')) return new TransactionError('Transaction deadline exceeded');
  if (msg.includes('MAX_CURRENCY_AMOUNT_EXCEEDED')) return new SlippageExceededError('max', 'exceeded');
  if (msg.includes('PlayerNotBuyable')) return new TransactionError('Player is not buyable');
  if (msg.includes('PlayerNotSellable')) return new TransactionError('Player is not sellable');
  if (msg.includes('INSUFFICIENT_CURRENCY_AMOUNT')) return new InsufficientBalanceError('Insufficient USDC for transaction');
  if (msg.includes('INSUFFICIENT_LIQUIDITY')) return new InsufficientLiquidityError(0);
  return new TransactionError(msg);
}
