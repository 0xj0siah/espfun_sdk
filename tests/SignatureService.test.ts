import { SignatureService } from '../src/services/SignatureService';
import winston from 'winston';

// Silent logger for tests
const logger = winston.createLogger({ silent: true });

const CHAIN_ID = 84532;
const FDF_PAIR_ADDRESS = '0xFDFPairAddress000000000000000000000000001';
const PLAYER_ADDRESS = '0xPlayerAddress0000000000000000000000000001';
const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const FAKE_SIGNATURE = '0x' + 'ab'.repeat(65);

describe('SignatureService', () => {
  let capturedDomain: any;
  let capturedTypes: any;
  let capturedMessage: any;

  const mockWallet = {
    address: WALLET_ADDRESS,
    signTypedData: jest.fn(async (domain: any, types: any, message: any) => {
      capturedDomain = domain;
      capturedTypes = types;
      capturedMessage = message;
      return FAKE_SIGNATURE;
    }),
  } as any;

  const mockApiClient = {
    isAuthenticated: () => false,
    getBuyNonce: jest.fn(async () => 1),
    getSellNonce: jest.fn(async () => 1),
  } as any;

  let service: SignatureService;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedDomain = undefined;
    capturedTypes = undefined;
    capturedMessage = undefined;

    service = new SignatureService(
      mockWallet,
      mockApiClient,
      CHAIN_ID,
      FDF_PAIR_ADDRESS,
      PLAYER_ADDRESS,
      logger
    );
  });

  const buyParams = {
    playerTokenIds: [1, 2],
    amounts: [BigInt(10), BigInt(20)],
    maxCurrencySpend: BigInt(1000),
    deadline: BigInt(9999999999),
  };

  const sellParams = {
    playerTokenIds: [1, 2],
    amounts: [BigInt(10), BigInt(20)],
    minCurrencyToReceive: BigInt(500),
    deadline: BigInt(9999999999),
  };

  // ---------------------------------------------------------------------------
  // BUY signature tests (should already pass — regression guard)
  // ---------------------------------------------------------------------------
  describe('getBuySignature (local signing)', () => {
    beforeEach(async () => {
      await service.getBuySignature(buyParams);
    });

    it('domain name is "FDF Pair"', () => {
      expect(capturedDomain.name).toBe('FDF Pair');
    });

    it('domain version is "1"', () => {
      expect(capturedDomain.version).toBe('1');
    });

    it('domain chainId matches 84532', () => {
      expect(capturedDomain.chainId).toBe(CHAIN_ID);
    });

    it('domain verifyingContract is FDFPair address', () => {
      expect(capturedDomain.verifyingContract).toBe(FDF_PAIR_ADDRESS);
    });

    it('type has "buyer" field first', () => {
      expect(capturedTypes.BuyTokens[0].name).toBe('buyer');
    });

    it('type fields order: buyer, playerTokenIds, amounts, maxCurrencySpend, deadline, nonce', () => {
      const fields = capturedTypes.BuyTokens.map((f: any) => f.name);
      expect(fields).toEqual([
        'buyer',
        'playerTokenIds',
        'amounts',
        'maxCurrencySpend',
        'deadline',
        'nonce',
      ]);
    });

    it('message uses "buyer" key', () => {
      expect(capturedMessage).toHaveProperty('buyer', WALLET_ADDRESS);
    });
  });

  // ---------------------------------------------------------------------------
  // SELL signature tests (these should FAIL before the fix)
  // ---------------------------------------------------------------------------
  describe('getSellSignature (local signing)', () => {
    beforeEach(async () => {
      await service.getSellSignature(sellParams);
    });

    it('domain name is "FDF Player" (NOT "Player")', () => {
      expect(capturedDomain.name).toBe('FDF Player');
    });

    it('domain version is "1"', () => {
      expect(capturedDomain.version).toBe('1');
    });

    it('domain chainId matches 84532', () => {
      expect(capturedDomain.chainId).toBe(CHAIN_ID);
    });

    it('domain verifyingContract is Player address', () => {
      expect(capturedDomain.verifyingContract).toBe(PLAYER_ADDRESS);
    });

    it('type has "from" field first (NOT "seller")', () => {
      expect(capturedTypes.SellTokens[0].name).toBe('from');
    });

    it('type fields order: from, playerTokenIds, amounts, minCurrencyToReceive, deadline, nonce', () => {
      const fields = capturedTypes.SellTokens.map((f: any) => f.name);
      expect(fields).toEqual([
        'from',
        'playerTokenIds',
        'amounts',
        'minCurrencyToReceive',
        'deadline',
        'nonce',
      ]);
    });

    it('message uses "from" key (NOT "seller")', () => {
      expect(capturedMessage).toHaveProperty('from', WALLET_ADDRESS);
      expect(capturedMessage).not.toHaveProperty('seller');
    });
  });
});
