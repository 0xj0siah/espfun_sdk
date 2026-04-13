import winston from 'winston';
import { BackendApiClient } from '../services/BackendApiClient';
import { AuthService } from '../services/AuthService';

export class PlayerManagementModule {
  constructor(
    private apiClient: BackendApiClient,
    private authService: AuthService,
    private logger: winston.Logger
  ) {}

  /** Promote a development player. Requires authentication. */
  async promotePlayer(playerId: number, shares: number): Promise<any> {
    await this.authService.ensureAuthenticated();
    this.logger.info(`Promoting player ${playerId} with ${shares} shares`);
    return this.apiClient.promotePlayer(playerId, shares);
  }

  /** Cut a development player. Requires authentication. */
  async cutPlayer(playerId: number, shares: number): Promise<any> {
    await this.authService.ensureAuthenticated();
    this.logger.info(`Cutting player ${playerId} with ${shares} shares`);
    return this.apiClient.cutPlayer(playerId, shares);
  }

  /** Get the cost to promote players */
  async getPromotionCost(playerIds: number[], shares: number[]): Promise<Record<string, number>> {
    await this.authService.ensureAuthenticated();
    return this.apiClient.getPromotionCost(playerIds, shares);
  }

  /** Get the value received from cutting players */
  async getCutValue(playerIds: number[], shares: number[]): Promise<Record<string, number>> {
    await this.authService.ensureAuthenticated();
    return this.apiClient.getCutValue(playerIds, shares);
  }
}
