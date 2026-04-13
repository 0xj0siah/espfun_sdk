import axios, { AxiosInstance } from 'axios';
import winston from 'winston';
import {
  AuthNonceResponse, AuthLoginResponse,
  BuySignatureRequest, SellSignatureRequest, SignatureResponse,
  UserPoints, PackPurchaseResponse,
} from '../types/api';

export class BackendApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private apiKey: string | null = null;

  constructor(private baseUrl: string, private logger: winston.Logger, apiKey?: string) {
    this.apiKey = apiKey ?? null;
    this.client = axios.create({ baseURL: baseUrl, timeout: 30000 });
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      if (this.apiKey) {
        config.headers['X-API-Key'] = this.apiKey;
      }
      return config;
    });
  }

  setAuthToken(token: string): void {
    this.token = token;
  }

  clearAuthToken(): void {
    this.token = null;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  // --- Auth ---

  async getNonce(address: string): Promise<AuthNonceResponse> {
    const { data } = await this.client.post('/api/auth/nonce', { walletAddress: address });
    return data;
  }

  async login(address: string, signature: string, message: string): Promise<AuthLoginResponse> {
    const { data } = await this.client.post('/api/auth/login', {
      walletAddress: address, signature, message,
    });
    return data;
  }

  // --- Buy Signatures ---

  async prepareBuySignature(request: BuySignatureRequest): Promise<SignatureResponse> {
    const { data } = await this.client.post('/api/buyTokens/prepare-signature', request);
    return data;
  }

  async getBuyNonce(address: string): Promise<number> {
    const { data } = await this.client.get(`/api/buyTokens/nonce/${address}`);
    return data.nextNonce ?? data.nonce ?? 0;
  }

  async confirmBuyTransaction(transactionId: string, txHash: string): Promise<void> {
    await this.client.post(`/api/buyTokens/transaction/${transactionId}/confirm`, { txHash });
  }

  // --- Sell Signatures ---

  async prepareSellSignature(request: SellSignatureRequest): Promise<SignatureResponse> {
    const { data } = await this.client.post('/api/sell-tokens/prepare-signature', request);
    return data;
  }

  async getSellNonce(address: string): Promise<number> {
    const { data } = await this.client.get(`/api/sell-tokens/nonce/${address}`);
    return data.nextNonce ?? data.nonce ?? 0;
  }

  async confirmSellTransaction(transactionId: string, txHash: string): Promise<void> {
    await this.client.post(`/api/sell-tokens/transaction/${transactionId}/confirm`, { txHash });
  }

  // --- Packs ---

  async purchasePack(packType: string): Promise<PackPurchaseResponse> {
    const { data } = await this.client.post(`/api/packs/${packType}/purchase`);
    return data;
  }

  // --- Players ---

  async promotePlayer(playerId: number, shares: number): Promise<any> {
    const { data } = await this.client.post('/api/players/promote', { playerId, shares });
    return data;
  }

  async cutPlayer(playerId: number, shares: number): Promise<any> {
    const { data } = await this.client.post('/api/players/cut', { playerId, shares });
    return data;
  }

  async getPromotionCost(playerIds: number[], shares: number[]): Promise<Record<string, number>> {
    const { data } = await this.client.post('/api/players/promotion-cost', { playerIds, shares });
    return data;
  }

  async getCutValue(playerIds: number[], shares: number[]): Promise<Record<string, number>> {
    const { data } = await this.client.post('/api/players/cut-value', { playerIds, shares });
    return data;
  }

  // --- Points ---

  async getPointsBalance(): Promise<UserPoints> {
    const { data } = await this.client.get('/api/points/balance');
    return data;
  }
}
