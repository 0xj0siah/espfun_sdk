# @espfun/sdk

TypeScript SDK for interacting with [ESP.FUN](https://esp.fun) fantasy esports smart contracts on Base Sepolia. Enables automated trading, staking, portfolio management, and event monitoring for agents and bots.

## Installation

```bash
npm install @espfun/sdk
```

Or from source:

```bash
git clone https://github.com/0xj0siah/espfun_sdk.git
cd espfun_sdk
npm install
npm run build
```

## Quick Start

```typescript
import { EspSDK } from '@espfun/sdk';

const sdk = new EspSDK({
  wallet: process.env.PRIVATE_KEY!,
  network: 'base-sepolia',
});

// Get a player's price
const price = await sdk.getPrice(1);
console.log(`Player 1 price: $${price}`);

// Buy 10 USDC worth of player 1 tokens
await sdk.authenticate(); // required for FDFPair trades
const tx = await sdk.buy(1, 10);
console.log(`Bought! tx: ${tx.hash}`);

// Clean up when done
await sdk.destroy();
```

## Configuration

```typescript
const sdk = new EspSDK({
  // Required
  wallet: 'your_private_key',          // or an ethers.Wallet instance

  // Optional
  network: 'base-sepolia',             // 'base-sepolia' | 'monad-testnet' | { chainId, rpcUrl }
  apiUrl: 'https://api.esp.fun',       // defaults to https://api.esp.fun
  rpcUrl: 'https://sepolia.base.org',  // override network default RPC
  defaultSlippage: 0.5,                // percent (default: 0.5%)
  defaultDeadline: 300,                // seconds (default: 300 = 5 minutes)
  logLevel: 'info',                    // 'debug' | 'info' | 'warn' | 'error'
  apiKey: 'your_api_key',              // API key auth (alternative to wallet signature)
  contracts: {                         // override specific contract addresses
    Player: '0x...',
    FDFPair: '0x...',
  },
});
```

### Environment Variables

```
PRIVATE_KEY=your_wallet_private_key_here
RPC_URL=https://sepolia.base.org       # optional — override default RPC
API_URL=https://api.esp.fun            # optional — defaults to https://api.esp.fun
LOG_LEVEL=info                         # optional
```

## Authentication

Some operations require backend authentication (JWT). Call `authenticate()` once before using:

- FDFPair trading (buy/sell on the AMM)
- Pack opening
- Player promotions/cuts

```typescript
await sdk.authenticate();
```

BondingCurve trades, pricing queries, portfolio reads, staking, and event subscriptions do **not** require authentication.

## Modules

The SDK is organized into domain modules accessible as properties on the `EspSDK` instance. Top-level convenience methods (`sdk.buy()`, `sdk.sell()`, etc.) delegate to these modules.

### Trading

Handles buy/sell with automatic phase detection. Players go through lifecycle phases:

| Phase | Description | Buy/Sell via |
|-------|-------------|--------------|
| `BondingCurve` | Active token launch | BondingCurve contract (direct on-chain) |
| `Graduated` | Launch complete, unclaimed tokens | Claim tokens first, then FDFPair |
| `FDFPair` | Normal AMM trading | FDFPair contract (requires EIP-712 signature) |
| `Cancelled` | Launch cancelled | Refund available |

```typescript
// Auto-detects phase and routes accordingly
const buyTx = await sdk.trading.buy(playerId, 10);       // 10 USDC
const sellTx = await sdk.trading.sell(playerId, 100);     // 100 tokens

// With custom options
const tx = await sdk.trading.buy(playerId, 50, {
  slippage: 1.0,        // 1% slippage tolerance
  deadline: 600,         // 10 minute deadline
  recipient: '0x...',    // send tokens to a different address (buy only)
});

// Check trading phase
const { phase, launch, progress } = await sdk.trading.getTradingPhase(playerId);

// Post-graduation: claim ERC1155 tokens
await sdk.trading.claimTokens(playerId);

// Post-cancellation: refund USDC
await sdk.trading.refund(playerId);
```

### Pricing

```typescript
// Single price
const price = await sdk.pricing.getPrice(playerId);  // returns number (USDC)

// Multiple prices
const prices = await sdk.pricing.getPrices([1, 2, 3]);  // { 1: 0.50, 2: 1.20, 3: 0.08 }

// Buy/sell quotes (includes fee info)
const buyQuote = await sdk.pricing.getBuyQuote(playerId, 10);    // 10 USDC
const sellQuote = await sdk.pricing.getSellQuote(playerId, 100); // 100 tokens
// buyQuote = { amountToReceive: bigint, feeAmount: bigint, feeRate: number, feeType: FeeType }

// Pool reserves
const pool = await sdk.pricing.getPoolInfo(playerId);
// { playerId, currencyReserve, playerTokenReserve, price }

// Price impact estimation
const impact = await sdk.pricing.calculatePriceImpact(playerId, 100, 'buy');
// { currentPrice, newPrice, priceImpactPercent, effectivePrice }

// Bonding curve status
const launchInfo = await sdk.pricing.getLaunchInfo(playerId);
const progress = await sdk.pricing.getLaunchProgress(playerId);
```

### Portfolio

```typescript
// Player token balances
const balance = await sdk.portfolio.getPlayerBalance(playerId);       // bigint
const balances = await sdk.portfolio.getPlayerBalances([1, 2, 3]);    // { 1: bigint, 2: bigint, 3: bigint }

// All owned players (balance > 0)
const owned = await sdk.portfolio.getOwnedPlayers();
// [{ playerId: 1, balance: 1000000000000000000n }, ...]

// Currency balances
const usdc = await sdk.portfolio.getUsdcBalance();    // number (formatted)
const esp = await sdk.portfolio.getEspBalance();       // number (formatted)
const usdcRaw = await sdk.portfolio.getUsdcBalanceRaw(); // bigint

// Bonding curve balance (pre-graduation)
const curveBalance = await sdk.portfolio.getBondingCurveBalance(playerId);

// Full summary
const summary = await sdk.portfolio.getPortfolioSummary();
// { usdc: 150.5, esp: 1000, ownedPlayers: [...] }

// Player IDs
const activeIds = await sdk.portfolio.getAllActivePlayerIds();
const allIds = await sdk.portfolio.getAllPlayerIds();
```

### Staking

```typescript
// Stake ESP (handles approval automatically)
await sdk.staking.stake(100);      // stake 100 ESP
await sdk.staking.unstake(50);     // unstake 50 ESP
await sdk.staking.claimRewards();  // claim pending rewards

// Read staking data
const userInfo = await sdk.staking.getUserStakingInfo();
// { stakedAmount: bigint, pendingRewards: bigint }

const globalInfo = await sdk.staking.getStakingInfo();
// { totalStaked, stakerShareBps, totalRewardsDistributed, undistributedRewards }

const pending = await sdk.staking.getPendingRewards(); // bigint
```

### Packs

Requires authentication.

```typescript
await sdk.authenticate();
const result = await sdk.packs.openPack('PRO');  // 'PRO' | 'EPIC' | 'LEGENDARY'
// { success: true, playerIds: [5, 12], amounts: [1, 1], txHash: '0x...' }
```

### Player Management

Requires authentication.

```typescript
await sdk.authenticate();

await sdk.players.promotePlayer(playerId, 10);  // promote with 10 shares
await sdk.players.cutPlayer(playerId, 5);       // cut with 5 shares

const cost = await sdk.players.getPromotionCost([1, 2], [10, 10]);
const value = await sdk.players.getCutValue([1, 2], [5, 5]);
```

### Events

Subscribe to on-chain events. Each method returns an unsubscribe function.

```typescript
// FDFPair events
const unsub = sdk.events.onTokensPurchased((event) => {
  console.log(`${event.buyer} bought players ${event.playerTokenIds}`);
});

sdk.events.onCurrencyPurchase((event) => { /* sell occurred */ });
sdk.events.onLiquidityAdded((event) => { /* LP added */ });

// BondingCurve events
sdk.events.onBondingCurveBuy((event) => { /* curve buy */ });
sdk.events.onBondingCurveSell((event) => { /* curve sell */ });
sdk.events.onGraduated((event) => { console.log(`Player ${event.playerId} graduated!`); });
sdk.events.onLaunchCreated((event) => { /* new launch */ });
sdk.events.onClaimed((event) => { /* tokens claimed */ });

// Staking events
sdk.events.onStaked((event) => { /* user staked */ });
sdk.events.onUnstaked((event) => { /* user unstaked */ });
sdk.events.onRewardsClaimed((event) => { /* rewards claimed */ });
sdk.events.onRewardsDistributed((event) => { /* rewards distributed */ });

// Player (ERC1155) transfer events
sdk.events.onTransferSingle((event) => { /* single transfer */ });
sdk.events.onTransferBatch((event) => { /* batch transfer */ });

// Unsubscribe
unsub();

// Remove all listeners
sdk.events.removeAllListeners();
```

## Low-Level Contract Access

For advanced usage, access typed contract wrappers or raw ethers.Contract instances directly:

```typescript
// Typed wrappers
const playerContract = sdk.contracts.getPlayer();
const fdfPair = sdk.contracts.getFDFPair();
const bondingCurve = sdk.contracts.getBondingCurve();
const staking = sdk.contracts.getStaking();
const esp = sdk.contracts.getEsp();    // TokenContract
const usdc = sdk.contracts.getUsdc();  // TokenContract

// Raw ethers.Contract for anything not wrapped
const feeManager = sdk.contracts.getRawContract('FeeManager');
const result = await feeManager.someFunction();
```

## Error Handling

The SDK throws typed errors for common failure modes:

```typescript
import {
  InsufficientBalanceError,
  SlippageExceededError,
  TransactionError,
  SignatureError,
  AuthenticationError,
  ConfigurationError,
} from '@espfun/sdk';

try {
  await sdk.buy(1, 1000);
} catch (err) {
  if (err instanceof InsufficientBalanceError) {
    console.log('Not enough USDC');
  } else if (err instanceof SlippageExceededError) {
    console.log('Price moved too much, try higher slippage');
  } else if (err instanceof TransactionError) {
    console.log(`TX failed: ${err.message}`, err.txHash);
  }
}
```

## Utility Functions

```typescript
import { parseUsdc, formatUsdc, parseTokens, formatTokens, parseEsp, formatEsp } from '@espfun/sdk';

parseUsdc(10);                   // 10000000n  (6 decimals)
formatUsdc(10000000n);           // "10.0"
parseTokens(1);                  // 1000000000000000000n  (18 decimals)
formatTokens(1000000000000000000n); // "1.0"
```

## Network & API

| Network | Chain ID | RPC | API |
|---------|----------|-----|-----|
| Base Sepolia | 84532 | `https://sepolia.base.org` | `https://api.esp.fun` |
| Monad Testnet | 10143 | `https://testnet-rpc.monad.xyz` | `https://api.esp.fun` |

The SDK defaults to `https://api.esp.fun` for all networks. Override with `apiUrl` in config.

## Smart Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| Player | `0xb316...5460` | ERC1155 player tokens |
| FDFPair | `0xF41A...8d59` | AMM/DEX for post-graduation trading |
| BondingCurve | `0x20b8...274F` | Token launch via bonding curve |
| ESPStaking | `0x9c28...E845` | ESP token staking vault |
| ESP | `0x11AD...6CE7` | ESP ERC20 governance token |
| TUSDC | `0xEc25...08f8` | Test USDC ERC20 token |
| PlayerPack | `0x6351...F24A` | Pack minting |
| DevelopmentPlayers | `0xF57a...393c` | Development roster management |
| FeeManager | `0x5a35...448f` | Trading fee configuration |
| PlayerContracts | `0xB62d...9d2` | Player contract management |

## Examples

See [`examples/trading-flow.ts`](examples/trading-flow.ts) for a full end-to-end trading demonstration with DRY_RUN support.

```bash
PRIVATE_KEY=0x... PLAYER_ID=1 npx ts-node examples/trading-flow.ts
```

## License

MIT
