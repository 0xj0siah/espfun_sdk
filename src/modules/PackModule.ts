import winston from 'winston';
import { BackendApiClient } from '../services/BackendApiClient';
import { AuthService } from '../services/AuthService';
import { PackPurchaseResponse } from '../types/api';
import { AuthenticationError } from '../utils/errors';

export type PackType = 'PRO' | 'EPIC' | 'LEGENDARY';

export class PackModule {
  constructor(
    private apiClient: BackendApiClient,
    private authService: AuthService,
    private logger: winston.Logger
  ) {}

  /** Open a pack. Requires authentication. */
  async openPack(packType: PackType): Promise<PackPurchaseResponse> {
    await this.authService.ensureAuthenticated();
    this.logger.info(`Opening ${packType} pack...`);
    return this.apiClient.purchasePack(packType);
  }
}
