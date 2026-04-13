export interface AuthNonceResponse {
  nonce: string;
  message: string;
}

export interface AuthLoginResponse {
  token: string;
  user?: {
    id: string;
    walletAddress: string;
  };
}

export interface BuySignatureRequest {
  playerTokenIds: number[];
  amounts: string[];
  maxCurrencySpend: string;
  deadline: number;
}

export interface SellSignatureRequest {
  playerTokenIds: number[];
  amounts: string[];
  minCurrencyToReceive: string;
  deadline: number;
}

export interface SignatureResponse {
  signature: string;
  nonce: number;
  transactionId: string;
  txData?: any;
}

export interface UserPoints {
  tournamentPoints: number;
  skillPoints: number;
}

export interface PackPurchaseResponse {
  success: boolean;
  playerIds?: number[];
  amounts?: number[];
  txHash?: string;
}
