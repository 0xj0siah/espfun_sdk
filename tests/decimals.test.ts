import { parseUsdc, formatUsdc, parseTokens, formatTokens, parseEsp, formatEsp } from '../src/utils/decimals';

describe('USDC decimals (6)', () => {
  test('parseUsdc("10") returns 10_000_000n', () => {
    expect(parseUsdc('10')).toBe(10_000_000n);
  });

  test('parseUsdc(10) returns 10_000_000n', () => {
    expect(parseUsdc(10)).toBe(10_000_000n);
  });

  test('parseUsdc("0.5") returns 500_000n', () => {
    expect(parseUsdc('0.5')).toBe(500_000n);
  });

  test('parseUsdc("0") returns 0n', () => {
    expect(parseUsdc('0')).toBe(0n);
  });

  test('formatUsdc(10_000_000n) returns "10.0"', () => {
    expect(formatUsdc(10_000_000n)).toBe('10.0');
  });

  test('formatUsdc(500_000n) returns "0.5"', () => {
    expect(formatUsdc(500_000n)).toBe('0.5');
  });

  test('formatUsdc(0n) returns "0.0"', () => {
    expect(formatUsdc(0n)).toBe('0.0');
  });

  test('roundtrip: parseUsdc then formatUsdc', () => {
    expect(formatUsdc(parseUsdc('123.456'))).toBe('123.456');
  });
});

describe('Token decimals (18)', () => {
  test('parseTokens("1") returns 10^18', () => {
    expect(parseTokens('1')).toBe(1_000_000_000_000_000_000n);
  });

  test('parseTokens("0.5") returns 5 * 10^17', () => {
    expect(parseTokens('0.5')).toBe(500_000_000_000_000_000n);
  });

  test('formatTokens(10^18) returns "1.0"', () => {
    expect(formatTokens(1_000_000_000_000_000_000n)).toBe('1.0');
  });

  test('roundtrip: parseTokens then formatTokens', () => {
    expect(formatTokens(parseTokens('42.5'))).toBe('42.5');
  });
});

describe('ESP decimals (18)', () => {
  test('parseEsp("100") returns 100 * 10^18', () => {
    expect(parseEsp('100')).toBe(100_000_000_000_000_000_000n);
  });

  test('formatEsp(100 * 10^18) returns "100.0"', () => {
    expect(formatEsp(100_000_000_000_000_000_000n)).toBe('100.0');
  });
});
