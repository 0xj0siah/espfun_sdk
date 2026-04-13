/**
 * Tests that contract calls use the correct parameters.
 *
 * Source of truth:
 *   - Player.sol sellTokens: (uint256[], uint256[], uint256, uint256, bytes, uint256) — 6 params
 *   - FDFPair.sol buyTokens:  (uint256[], uint256[], uint256, uint256, address, bytes, uint256) — 7 params
 */

describe('PlayerContract.sellTokens', () => {
  test('calls contract with 6 parameters (no recipient)', async () => {
    const mockTx = { hash: '0xabc', wait: jest.fn().mockResolvedValue({}) };
    const mockContract = {
      sellTokens: jest.fn().mockResolvedValue(mockTx),
      target: '0xPlayer',
    };

    const { PlayerContract } = await import('../src/contracts/PlayerContract');
    const player = new PlayerContract(mockContract as any);

    await player.sellTokens(
      [1],                          // playerTokenIds
      [1000000000000000000n],       // amounts
      9000000n,                     // minCurrencyToReceive
      1700000000n,                  // deadline
      '0xSIGNATURE',               // signature
      2n                            // nonce
    );

    expect(mockContract.sellTokens).toHaveBeenCalledTimes(1);
    const args = mockContract.sellTokens.mock.calls[0];
    expect(args).toHaveLength(6);

    // Verify parameter types and order
    expect(args[0]).toEqual([1n]);                     // playerTokenIds (BigInt[])
    expect(args[1]).toEqual([1000000000000000000n]);   // amounts (bigint[])
    expect(args[2]).toBe(9000000n);                    // minCurrencyToReceive
    expect(args[3]).toBe(1700000000n);                 // deadline
    expect(args[4]).toBe('0xSIGNATURE');               // signature
    expect(args[5]).toBe(2n);                          // nonce
  });

  test('does NOT pass a recipient address', async () => {
    const mockTx = { hash: '0xabc', wait: jest.fn().mockResolvedValue({}) };
    const mockContract = {
      sellTokens: jest.fn().mockResolvedValue(mockTx),
      target: '0xPlayer',
    };

    const { PlayerContract } = await import('../src/contracts/PlayerContract');
    const player = new PlayerContract(mockContract as any);

    await player.sellTokens(
      [1], [1000000000000000000n], 9000000n, 1700000000n,
      '0xSIG', 2n
    );

    const args = mockContract.sellTokens.mock.calls[0];
    // No arg should be an Ethereum address (0x followed by 40 hex chars)
    for (const arg of args) {
      if (typeof arg === 'string' && arg !== '0xSIG') {
        expect(arg).not.toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    }
  });
});

describe('FDFPairContract.buyTokens', () => {
  test('calls contract with 7 parameters (includes recipient)', async () => {
    const mockTx = { hash: '0xdef', wait: jest.fn().mockResolvedValue({}) };
    const mockContract = {
      buyTokens: jest.fn().mockResolvedValue(mockTx),
      target: '0xFDFPair',
    };

    const { FDFPairContract } = await import('../src/contracts/FDFPairContract');
    const fdfPair = new FDFPairContract(mockContract as any);

    await fdfPair.buyTokens(
      [1],                          // playerTokenIds
      [1000000000000000000n],       // amounts
      10000000n,                    // maxCurrencySpend
      1700000000n,                  // deadline
      '0xRecipient',                // recipient
      '0xSIGNATURE',               // signature
      2n                            // nonce
    );

    const args = mockContract.buyTokens.mock.calls[0];
    expect(args).toHaveLength(7);
  });
});
