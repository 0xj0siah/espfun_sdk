import { ethers } from 'ethers';
import winston from 'winston';
import { BackendApiClient } from './BackendApiClient';
import { AuthenticationError } from '../utils/errors';

export class AuthService {
  private authenticated = false;

  constructor(
    private wallet: ethers.Wallet,
    private apiClient: BackendApiClient,
    private logger: winston.Logger
  ) {}

  /** Authenticate wallet with backend, store JWT */
  async authenticate(): Promise<string> {
    try {
      this.logger.info(`Authenticating wallet ${this.wallet.address}...`);

      // Step 1: Get nonce
      const { message } = await this.apiClient.getNonce(this.wallet.address);

      // Step 2: Sign the message
      const signature = await this.wallet.signMessage(message);

      // Step 3: Login
      const { token } = await this.apiClient.login(this.wallet.address, signature, message);

      // Step 4: Store token
      this.apiClient.setAuthToken(token);
      this.authenticated = true;
      this.logger.info('Authentication successful');
      return token;
    } catch (error: any) {
      this.authenticated = false;
      throw new AuthenticationError(`Authentication failed: ${error.message}`);
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  /** Re-authenticate if not already authenticated */
  async ensureAuthenticated(): Promise<void> {
    if (!this.authenticated) {
      await this.authenticate();
    }
  }
}
