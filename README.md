<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/png/lockup-dark@2x.png">
  <img alt="Assay" src="brand/png/lockup-light@2x.png" width="290">
</picture>

Pre-trade safety checks, a trade journal, and edge analysis for manual memecoin trading.

Execution happens wherever you actually trade. Assay does the parts a trading app won't:
verifying a token before you enter, keeping a consistent record of every decision including
the ones you passed on, and telling you honestly whether any of it beat holding SOL.

No API keys, no build step, no runtime dependencies. Node 23+ runs the TypeScript directly.

## Commands

```
assay check <solana|base> <address>   run the safety checks
assay log <buy|sell|pass> [flags]     record an entry
assay review                          forward return on everything, passes included
assay stats                           edge summary vs holding SOL
assay callers                         hit rate by source
assay market                          regime: fear/greed, BTC & SOL trend, DEX volume
assay scan [chain]                    trending pools, unvetted
```

## Checks

Automated where free public data allows. The rest print what to verify and where, because a
check that silently reports "unknown" as "fine" is worse than no check at all.

| Check | Automated | Source |
|---|---|---|
| Liquidity floor ($20k, all pairs) | yes | DexScreener |
| 24h volume / market cap (30%) | yes | DexScreener |
| Volume trend, 6h vs prior 6h | yes | GeckoTerminal OHLCV |
| Drawdown from 168h high | yes | GeckoTerminal OHLCV |
| Mint authority revoked | Solana only | RPC `getAccountInfo` |
| Freeze authority revoked | Solana only | RPC `getAccountInfo` |
| Top 10 holder concentration (40%) | Solana only | RPC `getTokenLargestAccounts` |
| Contract powers | manual | verified source |
| Sellability | manual | test sell |
| Deployer history | manual | explorer |

Holder concentration includes LP and exchange accounts. Subtract the pool before judging it.

## Journal

**A buy without `--exit` is refused.** The ladder gets written before the entry, not after.

Every entry stores the SOL price at that moment, so the benchmark is computed from what you
would actually have had rather than reconstructed later.

`review` prices your passes too. The tokens you declined that then ran are the most
informative data you generate, and nobody keeps them.

## Usage

```sh
npm install

assay check solana <address>

assay log buy \
  --chain solana --address <address> --source @handle --size 50 \
  --thesis "narrative rotation, third cat token this week" \
  --exit "25% at 2x, 25% at 3x, 25% at 5x, trail rest 20%"

assay log pass \
  --chain base --address <address> --source @handle \
  --reason "top 10 hold 61%"

assay review && assay stats && assay callers
```

`data/` is gitignored. Your journal is yours.

## Data sources

Every source is free and keyless. No account, no billing, nothing to leak.

| Source | Gives | Limit |
|---|---|---|
| DexScreener | price, liquidity, volume, pair age across all pairs | 60/min |
| GeckoTerminal | hourly OHLCV, trending pools | 10/min, throttled in client |
| Solana RPC | mint authority, freeze authority, holder concentration | public node rate-limits |
| Binance | BTC and SOL daily candles for regime | generous |
| alternative.me | fear & greed index | none stated |
| DefiLlama | Solana DEX volume | none stated |

## Config

| Variable | Default |
|---|---|
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` |
| `ASSAY_FILE` | `./data/entries.jsonl` |

The public Solana RPC rate-limits `getTokenLargestAccounts`. Point `SOLANA_RPC_URL` at a
Helius free-tier endpoint if holder concentration keeps coming back unavailable.

## Brand

Assets and the graphics chart live in [`brand/`](brand/).

---

Nothing here is financial advice, and nothing here is a call. Roughly 8 in 10 tokens in a
book like this go to zero. Size accordingly.
