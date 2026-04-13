import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BackendApiClient', () => {
  let client: any;
  let mockAxiosInstance: any;

  const mockLogger = {
    debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { nonce: 5 } }),
      post: jest.fn().mockResolvedValue({ data: {} }),
      interceptors: { request: { use: jest.fn() } },
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    const { BackendApiClient } = await import('../src/services/BackendApiClient');
    client = new BackendApiClient('https://api.espfun.test', mockLogger);
  });

  describe('Buy nonce endpoint', () => {
    test('calls GET /api/buyTokens/nonce/{address} with address in path', async () => {
      await client.getBuyNonce('0xABCD');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/buyTokens/nonce/0xABCD');
    });
  });

  describe('Sell nonce endpoint', () => {
    test('calls GET /api/sell-tokens/nonce without address param', async () => {
      await client.getSellNonce();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/sell-tokens/nonce');
    });

    test('does NOT include address in the path', async () => {
      await client.getSellNonce();
      const callArg = mockAxiosInstance.get.mock.calls[0][0];
      expect(callArg).not.toContain('0x');
    });
  });

  describe('Auth endpoints', () => {
    test('getNonce calls POST /api/auth/nonce', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { nonce: 'abc', message: 'msg' } });
      await client.getNonce('0xABCD');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/nonce', { walletAddress: '0xABCD' });
    });

    test('login calls POST /api/auth/login', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { token: 'jwt123' } });
      await client.login('0xABCD', '0xSIG', 'message');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/login', {
        walletAddress: '0xABCD', signature: '0xSIG', message: 'message',
      });
    });
  });

  describe('Signature endpoints', () => {
    test('prepareBuySignature calls POST /api/buyTokens/prepare-signature', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { signature: '0x', nonce: 1, transactionId: 'tx1' } });
      await client.prepareBuySignature({ playerTokenIds: [1], amounts: ['100'], maxCurrencySpend: '50', deadline: 9999 });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/buyTokens/prepare-signature',
        { playerTokenIds: [1], amounts: ['100'], maxCurrencySpend: '50', deadline: 9999 }
      );
    });

    test('prepareSellSignature calls POST /api/sell-tokens/prepare-signature', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { signature: '0x', nonce: 1, transactionId: 'tx2' } });
      await client.prepareSellSignature({ playerTokenIds: [1], amounts: ['100'], minCurrencyToReceive: '40', deadline: 9999 });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/sell-tokens/prepare-signature',
        { playerTokenIds: [1], amounts: ['100'], minCurrencyToReceive: '40', deadline: 9999 }
      );
    });
  });

  describe('Confirm endpoints', () => {
    test('confirmBuyTransaction calls correct path', async () => {
      await client.confirmBuyTransaction('txId123', '0xhash');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/buyTokens/transaction/txId123/confirm', { txHash: '0xhash' }
      );
    });

    test('confirmSellTransaction calls correct path', async () => {
      await client.confirmSellTransaction('txId456', '0xhash');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/sell-tokens/transaction/txId456/confirm', { txHash: '0xhash' }
      );
    });
  });
});
