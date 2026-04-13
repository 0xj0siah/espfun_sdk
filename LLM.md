# LLM.md - AI Agent Reference for @espfun/sdk

This file is optimized for AI agents and LLMs that need to programmatically interact with EspFun smart contracts. It contains every function signature, parameter type, return type, and behavioral constraint needed to generate correct SDK calls without reading source code.

## Setup

```typescript
import { EspSDK } from '@espfun/sdk';

const sdk = new EspSDK({
  wallet: process.env.PRIVATE_KEY!,     // Required: hex private key string or ethers.Wallet
  network: 'base-sepolia',              // 'base-sepolia' | 'monad-testnet' | { chainId: number, rpcUrl: string }
  apiUrl: process.env.API_URL,          // Required for: FDFPair trades, packs, promotions
  rpcUrl: process.env.RPC_URL,          // Optional: overrides network default
  defaultSlippage: 0.5,                 // Optional: percent, default 0.5
  defaultDeadline: 300,                 // Optional: seconds, default 300
  logLevel: 'info',                     // Optional: 'debug' | 'info' | 'warn' | 'error'
});
```

## Authentication Rules

Call `await sdk.authenticate()` **once** before using any of these:
- `sdk.buy()` / `sdk.sell()` when player is in FDFPair phase
- `sdk.packs.openPack()`
- `sdk.players.promotePlayer()` / `sdk.players.cutPlayer()`
- `sdk.players.getPromotionCost()` / `sdk.players.getCutValue()`

These do **NOT** require authentication:
- All pricing queries (`sdk.pricing.*`)
- All portfolio reads (`sdk.portfolio.*`)
- BondingCurve trades (buy/sell/claim/refund)
- Staking operations (`sdk.staking.*`)
- Event subscriptions (`sdk.events.*`)

## Decimal Conventions

| Token | Decimals | Human "10" = Raw |
|-------|----------|------------------|
| USDC (TUSDC) | 6 | `10_000_000n` |
| Player tokens | 18 | `10_000_000_000_000_000_000n` |
| ESP | 18 | `10_000_000_000_000_000_000n` |

SDK convenience methods accept **human-readable numbers** (e.g., `sdk.buy(1, 10)` = 10 USDC). Module methods that return `bigint` are in raw contract units.

## Trading Phases

Every player has a trading phase that determines which contract handles trades. The SDK auto-detects this.

| Phase | Enum Value | Meaning | Buy/Sell |
|-------|-----------|---------|----------|
| `BondingCurve` | `'bonding_curve'` | Active launch | Direct on-chain, no auth needed |
| `Graduated` | `'graduated'` | Launch complete, user has unclaimed tokens | Must claim first via `claimTokens()` |
| `FDFPair` | `'fdfpair'` | Normal AMM trading | Requires EIP-712 signature + auth |
| `Cancelled` | `'cancelled'` | Launch was cancelled | Refund via `refund()` |
| `Unknown` | `'unknown'` | Loading/error state | Cannot trade |

## Complete API Reference

### Top-Level Convenience Methods

```
sdk.buy(playerId: number, usdcAmount: number, options?: TradeOptions) → Promise<TransactionResult>
sdk.sell(playerId: number, tokenAmount: number, options?: TradeOptions) → Promise<TransactionResult>
sdk.stake(amount: number) → Promise<TransactionResult>
sdk.unstake(amount: number) → Promise<TransactionResult>
sdk.getPrice(playerId: number) → Promise<number>
sdk.getBalance(playerId: number) → Promise<bigint>
sdk.authenticate() → Promise<void>
sdk.destroy() → Promise<void>
```

### TradeOptions

```typescript
{
  slippage?: number;    // percent, e.g., 1.0 for 1%
  deadline?: number;    // seconds from now
  recipient?: string;   // defaults to wallet address
}
```

### TransactionResult

```typescript
{
  hash: string;                           // tx hash
  receipt: ethers.TransactionReceipt;     // confirmed receipt
  transactionId?: string;                 // backend tracking ID (FDFPair only)
}
```

---

### sdk.trading

```
buy(playerId: number, usdcAmount: number, options?: TradeOptions) → Promise<TransactionResult>
sell(playerId: number, tokenAmount: number, options?: TradeOptions) → Promise<TransactionResult>
claimTokens(playerId: number) → Promise<TransactionResult>
refund(playerId: number) → Promise<TransactionResult>
getTradingPhase(playerId: number) → Promise<TradingPhaseResult>
```

`TradingPhaseResult`:
```typescript
{
  phase: TradingPhase;           // enum: 'bonding_curve' | 'graduated' | 'fdfpair' | 'cancelled' | 'unknown'
  launch: LaunchInfo | null;     // bonding curve launch data
  progress: LaunchProgress | null; // only set during active BondingCurve phase
  userCurveBalance: bigint;      // user's unclaimed tokens on the curve
}
```

**Decision tree for an agent:**
1. Call `getTradingPhase(playerId)`
2. If `phase === 'bonding_curve'` → `buy()` / `sell()` work directly
3. If `phase === 'graduated'` and `userCurveBalance > 0n` → call `claimTokens(playerId)` first, then trade on FDFPair
4. If `phase === 'fdfpair'` → ensure `authenticate()` was called, then `buy()` / `sell()`
5. If `phase === 'cancelled'` and `userCurveBalance > 0n` → call `refund(playerId)`

---

### sdk.pricing

```
getPrice(playerId: number) → Promise<number>                              // USDC price as float
getPrices(playerIds: number[]) → Promise<Record<number, number>>           // { playerId: price }
getBuyQuote(playerId: number, usdcAmount: number) → Promise<TradeQuote>
getSellQuote(playerId: number, tokenAmount: number) → Promise<TradeQuote>
getPoolInfo(playerId: number) → Promise<PoolInfo>
calculatePriceImpact(playerId: number, usdcAmount: number, action: 'buy' | 'sell') → Promise<PriceImpact>
getLaunchInfo(playerId: number) → Promise<LaunchInfo>
getLaunchProgress(playerId: number) → Promise<LaunchProgress>
```

`TradeQuote`:
```typescript
{
  amountToReceive: bigint;   // tokens (buy) or USDC (sell) in raw units
  feeAmount: bigint;         // fee in raw units
  feeRate: number;           // fee rate from contract
  feeType: FeeType | null;   // 0=Normal, 1=FlashSale, 2=FeeTier
}
```

`PoolInfo`:
```typescript
{
  playerId: number;
  currencyReserve: bigint;      // USDC in pool (6 decimals)
  playerTokenReserve: bigint;   // tokens in pool (18 decimals)
  price: number;                // derived price as float
}
```

`LaunchInfo`:
```typescript
{
  playerId: bigint;
  totalTokensForSale: bigint;
  tokensSold: bigint;
  currencyCollected: bigint;
  tokensForLiquidity: bigint;
  fundingTarget: bigint;
  virtualTokenReserve: bigint;
  virtualCurrencyReserve: bigint;
  createdAt: bigint;
  deadline: bigint;
  graduated: boolean;
  cancelled: boolean;
}
```

`LaunchProgress`:
```typescript
{
  raised: bigint;
  target: bigint;
  percentComplete: number;  // 0-100
}
```

---

### sdk.portfolio

```
getPlayerBalance(playerId: number) → Promise<bigint>
getPlayerBalances(playerIds: number[]) → Promise<Record<number, bigint>>
getAllActivePlayerIds() → Promise<number[]>
getAllPlayerIds() → Promise<number[]>
getUsdcBalance() → Promise<number>                    // formatted float
getUsdcBalanceRaw() → Promise<bigint>
getEspBalance() → Promise<number>                     // formatted float
getEspBalanceRaw() → Promise<bigint>
getBondingCurveBalance(playerId: number) → Promise<bigint>
getOwnedPlayers() → Promise<PlayerBalance[]>          // [{ playerId, balance }] where balance > 0
getPortfolioSummary() → Promise<{ usdc: number, esp: number, ownedPlayers: PlayerBalance[] }>
```

---

### sdk.staking

```
stake(amount: number) → Promise<TransactionResult>          // handles ESP approval automatically
unstake(amount: number) → Promise<TransactionResult>
claimRewards() → Promise<TransactionResult>
distributeRewards() → Promise<TransactionResult>
getStakingInfo() → Promise<StakingGlobalInfo>
getUserStakingInfo() → Promise<StakingUserInfo>
getPendingRewards() → Promise<bigint>
```

`StakingGlobalInfo`:
```typescript
{
  totalStaked: bigint;
  stakerShareBps: number;              // basis points (e.g., 5000 = 50%)
  totalRewardsDistributed: bigint;
  undistributedRewards: bigint;
}
```

`StakingUserInfo`:
```typescript
{
  stakedAmount: bigint;
  pendingRewards: bigint;
}
```

---

### sdk.packs

```
openPack(packType: 'PRO' | 'EPIC' | 'LEGENDARY') → Promise<PackPurchaseResponse>
```

Returns: `{ success: boolean, playerIds?: number[], amounts?: number[], txHash?: string }`

**Requires authentication.**

---

### sdk.players

```
promotePlayer(playerId: number, shares: number) → Promise<any>
cutPlayer(playerId: number, shares: number) → Promise<any>
getPromotionCost(playerIds: number[], shares: number[]) → Promise<Record<string, number>>
getCutValue(playerIds: number[], shares: number[]) → Promise<Record<string, number>>
```

**All require authentication.**

---

### sdk.events

All return `() => void` (unsubscribe function). Subscribe to real-time on-chain events:

```
// FDFPair
onTokensPurchased(cb: (e: TokensPurchasedEvent) => void) → () => void
onCurrencyPurchase(cb: (e: CurrencyPurchaseEvent) => void) → () => void
onLiquidityAdded(cb: (e: LiquidityAddedEvent) => void) → () => void

// BondingCurve
onBondingCurveBuy(cb: (e: BondingCurveBuyEvent) => void) → () => void
onBondingCurveSell(cb: (e: BondingCurveSellEvent) => void) → () => void
onGraduated(cb: (e: GraduatedEvent) => void) → () => void
onLaunchCreated(cb: (e: LaunchCreatedEvent) => void) → () => void
onClaimed(cb: (e: ClaimedEvent) => void) → () => void

// Staking
onStaked(cb: (e: StakedEvent) => void) → () => void
onUnstaked(cb: (e: UnstakedEvent) => void) → () => void
onRewardsClaimed(cb: (e: RewardsClaimedEvent) => void) → () => void
onRewardsDistributed(cb: (e: RewardsDistributedEvent) => void) → () => void

// Player ERC1155
onTransferSingle(cb: (e: TransferSingleEvent) => void) → () => void
onTransferBatch(cb: (e: TransferBatchEvent) => void) → () => void

// Cleanup
removeAllListeners() → void
activeListenerCount → number
```

---

### sdk.contracts (Low-Level Access)

```
getPlayer() → PlayerContract
getFDFPair() → FDFPairContract
getBondingCurve() → BondingCurveContract
getStaking() → ESPStakingContract
getEsp() → TokenContract
getUsdc() → TokenContract
getAddress(name: ContractName) → string
getRawContract(name: ContractName) → ethers.Contract
```

`ContractName` = `'Player' | 'FDFPair' | 'BondingCurve' | 'ESPStaking' | 'PlayerPack' | 'DevelopmentPlayers' | 'FeeManager' | 'PlayerContracts' | 'ESP' | 'TUSDC'`

---

## Error Types

All extend `EspSDKError` which has `.code` and `.message`.

| Error Class | Code | When |
|-------------|------|------|
| `ConfigurationError` | `CONFIGURATION_ERROR` | Bad SDK config (missing key, unknown network) |
| `AuthenticationError` | `AUTHENTICATION_ERROR` | Backend auth failed |
| `InsufficientBalanceError` | `INSUFFICIENT_BALANCE` | Not enough USDC/tokens/ESP |
| `InsufficientLiquidityError` | `INSUFFICIENT_LIQUIDITY` | Pool has no liquidity |
| `SlippageExceededError` | `SLIPPAGE_EXCEEDED` | Price moved beyond tolerance |
| `TransactionError` | `TRANSACTION_ERROR` | On-chain tx reverted (has `.txHash`, `.receipt`) |
| `SignatureError` | `SIGNATURE_ERROR` | EIP-712 signing failed or invalid nonce |
| `RateLimitError` | `RATE_LIMIT` | RPC or API rate limit hit |
| `NetworkError` | `NETWORK_ERROR` | RPC connection issue |

---

## Common Agent Workflows

### 1. Monitor and Buy Cheap Players

```typescript
const sdk = new EspSDK({ wallet: KEY, apiUrl: API });
await sdk.authenticate();

const playerIds = await sdk.portfolio.getAllActivePlayerIds();
const prices = await sdk.pricing.getPrices(playerIds);

for (const [id, price] of Object.entries(prices)) {
  if (price < 0.10) {
    await sdk.buy(Number(id), 5); // buy $5 worth
  }
}
```

### 2. Portfolio Rebalancing

```typescript
const owned = await sdk.portfolio.getOwnedPlayers();
const prices = await sdk.pricing.getPrices(owned.map(p => p.playerId));

for (const player of owned) {
  const value = Number(player.balance) / 1e18 * prices[player.playerId];
  if (value > 100) {
    // Trim position: sell half
    const sellAmount = Number(player.balance) / 1e18 / 2;
    await sdk.sell(player.playerId, sellAmount);
  }
}
```

### 3. Bonding Curve Sniper

```typescript
sdk.events.onLaunchCreated(async (event) => {
  const playerId = Number(event.playerId);
  console.log(`New launch: player ${playerId}, target: ${event.fundingTarget}`);
  // Buy early on the curve
  await sdk.buy(playerId, 20);
});
```

### 4. Graduation Claimer

```typescript
sdk.events.onGraduated(async (event) => {
  const playerId = Number(event.playerId);
  const { userCurveBalance } = await sdk.trading.getTradingPhase(playerId);
  if (userCurveBalance > 0n) {
    await sdk.trading.claimTokens(playerId);
    console.log(`Claimed tokens for player ${playerId}`);
  }
});
```

### 5. Staking Compounder

```typescript
const pending = await sdk.staking.getPendingRewards();
if (pending > parseEsp(10)) { // only if > 10 ESP pending
  await sdk.staking.claimRewards();
  const espBalance = await sdk.portfolio.getEspBalanceRaw();
  await sdk.staking.stake(Number(formatEsp(espBalance)));
}
```

## Contract Addresses (Base Sepolia - chainId 84532)

```
Player:             0xb316ace8422975c644E723Cc391Db33e14c05460
FDFPair:            0xF41Ab3e0dE047E53e9D75ebCfc65D0ac727C7B59
BondingCurve:       0x20b8685651082943D7d8A2cceB41430664a5274F
ESPStaking:         0x9c288d1c0279a6b2404D483a0c0563C5981Ea845
PlayerPack:         0x6351A397a17718Ba614b1dffF183557aca55F24A
DevelopmentPlayers: 0xF57a67090fE0B6746c7285FEfE00cd188649393c
FeeManager:         0x5a354beb8ddA64A72D30b48980b56b989410448f
PlayerContracts:    0xB62dccd11348bfA2Ba29e0c50Da85b1804A6f9d2
ESP:                0x11AD735D35d9baD6e7489D8Bc2295F0E32d26CE7
TUSDC:              0xEc25C405ec25BB24Ad004198D1B3111e8de808f8
```

## Key Constraints for Agents

1. **Always check phase before trading.** `buy()`/`sell()` do this internally, but if you need to branch logic, call `getTradingPhase()` first.
2. **Authenticate once, not per-call.** JWT is stored in memory for the session.
3. **USDC amounts are human-readable floats** in top-level methods. Module-level bigint values are raw (6 or 18 decimals).
4. **Slippage default is 0.5%.** For volatile players or large orders, increase to 1-2%.
5. **Deadline default is 5 minutes.** Transactions revert if not mined within the deadline.
6. **Call `sdk.destroy()`** when shutting down to clean up WebSocket connections and event listeners.
7. **`TransactionResult.receipt`** is already confirmed (1 block). No need to wait for additional confirmations.
8. **Batch reads are efficient.** `getPlayerBalances([...])` and `getPrices([...])` use single RPC calls. Prefer them over loops.
