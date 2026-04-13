/**
 * Example: Full EspFun SDK Trading Flow
 *
 * Demonstrates the complete lifecycle:
 *   1. Initialize SDK
 *   2. Authenticate with backend
 *   3. Check balances and portfolio
 *   4. Get price quotes
 *   5. Execute a buy
 *   6. Execute a sell
 *   7. Check final portfolio
 *
 * Usage:
 *   PRIVATE_KEY=0x... API_URL=https://... PLAYER_ID=1 npx ts-node examples/trading-flow.ts
 *
 * Set DRY_RUN=false to skip actual transactions (default: true).
 */

import { EspSDK } from '../src';
import { formatUsdc, formatTokens } from '../src/utils/decimals';

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const apiUrl = process.env.API_URL;
  const playerId = parseInt(process.env.PLAYER_ID ?? '1', 10);
  const dryRun = process.env.DRY_RUN !== 'false';

  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable is required');
    console.error('Usage: PRIVATE_KEY=0x... API_URL=https://... PLAYER_ID=1 npx ts-node examples/trading-flow.ts');
    process.exit(1);
  }

  if (!apiUrl) {
    console.error('Error: API_URL environment variable is required');
    process.exit(1);
  }

  console.log('=== EspFun SDK Trading Flow Example ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no transactions)' : 'LIVE'}`);
  console.log(`Player ID: ${playerId}`);

  // 1. Initialize SDK
  console.log('\n--- Step 1: Initialize SDK ---');
  const sdk = new EspSDK({
    wallet: privateKey,
    network: 'base-sepolia',
    apiUrl,
    logLevel: 'info',
    defaultSlippage: 0.5,
  });
  console.log(`Wallet: ${sdk.address}`);

  // 2. Authenticate
  console.log('\n--- Step 2: Authenticate ---');
  await sdk.authenticate();
  console.log('Authentication successful');

  // 3. Check balances
  console.log('\n--- Step 3: Check Balances ---');
  const usdcBalance = await sdk.portfolio.getUsdcBalanceRaw();
  const tokenBalance = await sdk.portfolio.getPlayerBalance(playerId);
  console.log(`USDC balance: ${formatUsdc(usdcBalance)} USDC`);
  console.log(`Player ${playerId} token balance: ${formatTokens(tokenBalance)} tokens`);

  // 4. Get trading phase
  console.log('\n--- Step 4: Detect Trading Phase ---');
  const phaseResult = await sdk.trading.getTradingPhase(playerId);
  console.log(`Trading phase: ${phaseResult.phase}`);
  if (phaseResult.progress) {
    console.log(`Launch progress: ${phaseResult.progress.percentComplete}%`);
  }

  // 5. Get price quotes
  console.log('\n--- Step 5: Get Price Quotes ---');
  const price = await sdk.pricing.getPrice(playerId);
  console.log(`Current price: ${price} USDC`);

  const buyAmount = 10; // 10 USDC
  const buyQuote = await sdk.pricing.getBuyQuote(playerId, buyAmount);
  console.log(`Buy quote: ${buyAmount} USDC -> ${formatTokens(buyQuote.amountToReceive)} tokens (fee: ${formatUsdc(buyQuote.feeAmount)} USDC)`);

  if (tokenBalance > 0n) {
    const sellAmount = 1; // 1 token
    const sellQuote = await sdk.pricing.getSellQuote(playerId, sellAmount);
    console.log(`Sell quote: ${sellAmount} token -> ${formatUsdc(sellQuote.amountToReceive)} USDC (fee: ${formatUsdc(sellQuote.feeAmount)} USDC)`);
  }

  if (dryRun) {
    console.log('\n--- DRY RUN: Skipping transactions ---');
    console.log('Set DRY_RUN=false to execute real transactions.');
    await sdk.destroy();
    return;
  }

  // 6. Execute buy
  console.log('\n--- Step 6: Execute Buy ---');
  console.log(`Buying ${buyAmount} USDC worth of player ${playerId}...`);
  const buyResult = await sdk.buy(playerId, buyAmount);
  console.log(`Buy TX: ${buyResult.hash}`);

  // Check updated balance
  const newTokenBalance = await sdk.portfolio.getPlayerBalance(playerId);
  console.log(`New token balance: ${formatTokens(newTokenBalance)} tokens`);

  // 7. Execute sell (sell half of what we bought)
  if (newTokenBalance > 0n) {
    console.log('\n--- Step 7: Execute Sell ---');
    const sellTokens = 0.5; // sell 0.5 tokens
    console.log(`Selling ${sellTokens} tokens of player ${playerId}...`);
    const sellResult = await sdk.sell(playerId, sellTokens);
    console.log(`Sell TX: ${sellResult.hash}`);
  }

  // 8. Final portfolio
  console.log('\n--- Step 8: Final Portfolio ---');
  const finalUsdcBalance = await sdk.portfolio.getUsdcBalanceRaw();
  const finalTokenBalance = await sdk.portfolio.getPlayerBalance(playerId);
  console.log(`Final USDC: ${formatUsdc(finalUsdcBalance)} USDC`);
  console.log(`Final tokens: ${formatTokens(finalTokenBalance)} tokens`);

  console.log('\n=== Done ===');
  await sdk.destroy();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
