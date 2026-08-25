<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/png/lockup-dark@2x.png">
  <img alt="Assay" src="brand/png/lockup-light@2x.png" width="320">
</picture>

### Instrumented crypto trading. Code, checks, and numbers — losses included.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](tsconfig.json)
[![Node](https://img.shields.io/badge/Node-23%2B-5FA04E?style=flat-square&logo=node.js&logoColor=white)](package.json)
[![Runtime deps](https://img.shields.io/badge/runtime%20deps-0-B8873F?style=flat-square)](package.json)
[![API keys](https://img.shields.io/badge/API%20keys-none-B8873F?style=flat-square)](#data-sources)
[![Build step](https://img.shields.io/badge/build%20step-none-7A7570?style=flat-square)](#install)
[![License](https://img.shields.io/badge/license-MIT-7A7570?style=flat-square)](LICENSE)

</div>

---

Assay verifies a token before you buy it, remembers the exit plan you wrote while you were
calm, and tells you honestly whether any of it beat holding SOL.

It does not place trades. Execution happens wherever you already trade — this handles the
parts a trading app has no incentive to build: **pre-trade verification, an honest record,
and a benchmark you cannot argue with.**

Six free data sources, no API keys, no build step, no runtime dependencies. Node 23+ runs
the TypeScript directly.

## Install

```sh
git clone https://github.com/AirKyzzZ/assay.git && cd assay
npm install
node src/cli.ts watch
```

## Commands

| Command | Does |
|---|---|
| `assay watch` | Daily screen — portfolio, open positions, what needs a decision |
| `assay check <chain> <address>` | Ten safety checks before you enter |
| `assay hold <asset> <amount>` | Record what you own, with cost basis |
| `assay log <buy\|sell\|pass>` | Journal an entry, including the ones you passed on |
| `assay review` | Forward return on everything, passes included |
| `assay stats` | Edge summary versus holding SOL |
| `assay callers` | Hit rate by source — who is actually right |
| `assay market` | Regime: fear & greed, BTC and SOL trend, DEX volume |
| `assay scan [chain]` | Trending pools, unvetted |

## Holdings

```sh
assay hold BTC 0.0121795 --cost 1100      # total USD paid
assay hold ETH 0.191233 --avg 2600        # or average per unit
assay hold SOL --add 0.25 --cost 22       # DCA: weighted average recomputed
assay hold solana:<address> 1200 --cost 60
```

Cost basis is optional. Holdings without it still show value and 24h change; they are just
excluded from P&L, and the header says how many were left out so the total never quietly
lies to you.

## Watch

The one command worth running daily.

```
Portfolio   $1539.82   cost $1659.21   -$155.10 (-9.3%)  · 1 without basis

  asset          amount      value   alloc     24h         p&l
  BTC         0.0121795    $965.84   62.7%   +1.9%    -$134.16   -12.2%
  ETH          0.191233    $473.72   30.8%   +0.1%     -$23.48    -4.7%
  SOL          0.648167     $64.54    4.2%   +5.0%      +$2.54    +4.1%
  ATOM          23.0268     $35.71    2.3%   -1.7%           —        —

Open positions

  id    token         mult   value  held
  0001  CYBERLEEK    2.40x    $120    30h   SELL 25% — past 2x

  Action needed

  · CYBERLEEK is at 2.40x — your ladder says sell 25% now.
```

The `--exit` ladder you wrote at entry is parsed and checked against live price. Partial
sells are accounted for, so a position at 3.6x with 25% already out is told to sell 25%,
not 50%. Time stops fire too: flat after 24h, or held past 72h regardless of price.

**When nothing needs a decision it says so.** That is the point — the tool exists to stop
you staring at charts looking for a reason to act.

## Check

```
$ assay check solana ApZuxdpzMrbEYTGEzeY9afh5pj9d6qPRJCTgQYiipbKg

CYBERLEEK  $20.88M mcap · $2.71M liq · age 205h

  PASS    Liquidity            $2.71M across 30 pairs, floor $20.0k
  PASS    Volume / mcap        191% of mcap traded in 24h
  PASS    Mint authority       Revoked.
  PASS    Freeze authority     Revoked.
  PASS    Volume trend (6h)    -4% versus prior 6h. Still trading.
  PASS    Drawdown from high   -20% off the 168h high, set 21h ago.
  MANUAL  Holder concentration Public RPC rate-limited. Set SOLANA_RPC_URL.
  MANUAL  Sellability          Buy the minimum, sell it immediately.
  MANUAL  Deployer history     Trace the deployer — serial launchers repeat.
```

| Check | Automated | Source |
|---|---|---|
| Liquidity floor, summed across every pair | ✅ | DexScreener |
| 24h volume / market cap | ✅ | DexScreener |
| Volume trend, 6h versus prior 6h | ✅ | GeckoTerminal |
| Drawdown from 168h high | ✅ | GeckoTerminal |
| Mint authority revoked | Solana | RPC |
| Freeze authority revoked | Solana | RPC |
| Top 10 holder concentration | Solana | RPC |
| Contract powers | manual | verified source |
| Sellability | manual | test sell |
| Deployer history | manual | explorer |

A check that silently reports *unknown* as *fine* is worse than no check, so anything it
cannot verify says `MANUAL` and names what to look at.

> Holder concentration counts LP and exchange accounts. Subtract the pool before judging it.

## Journal

**A buy without `--exit` is refused.** The ladder gets written before the entry, not after.

```sh
assay log buy \
  --chain solana --address <address> --source @handle --size 50 \
  --thesis "narrative rotation, third cat token this week" \
  --exit "25% at 2x, 25% at 3x, 25% at 5x, trail rest 20%"

assay log pass \
  --chain base --address <address> --source @handle \
  --reason "top 10 hold 61%"
```

Every entry stores the SOL price at that moment, so the benchmark is computed from what you
would actually have had rather than reconstructed later.

`review` prices your passes too. **The tokens you declined that then ran are the most
informative data you generate**, and nobody keeps them.

## Data sources

Every source is free and keyless. No account, no billing, nothing to leak.

| Source | Gives | Limit |
|---|---|---|
| [DexScreener](https://docs.dexscreener.com/api/reference) | price, liquidity, volume, pair age across all pairs | 60/min |
| [GeckoTerminal](https://www.geckoterminal.com/dex-api) | hourly OHLCV, trending pools | 10/min, throttled in client |
| Solana RPC | mint authority, freeze authority, holder concentration | public node rate-limits |
| Binance | majors pricing, BTC and SOL daily candles | generous |
| alternative.me | fear & greed index | none stated |
| [DefiLlama](https://defillama.com/docs/api) | Solana DEX volume | none stated |

## Config

| Variable | Default |
|---|---|
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` |
| `ASSAY_FILE` | `./data/entries.jsonl` |
| `ASSAY_HOLDINGS` | `./data/holdings.json` |

The public Solana RPC rate-limits `getTokenLargestAccounts`. Point `SOLANA_RPC_URL` at a
Helius free-tier endpoint if holder concentration keeps coming back unavailable.

`data/` is gitignored. Your journal and holdings never leave your machine.

## Roadmap

- [x] Cost basis on holdings, so the portfolio shows real P&L
- [ ] `check` for majors — trend, drawdown from ATH, position in range
- [ ] More free sources: CoinPaprika, GeckoTerminal new-pools, on-chain balance import
- [ ] Read-only portfolio import instead of manual `hold`
- [ ] Wallet scoring — rank the ~6% of wallets profitable over 90 days

## Brand

Assets and the graphics chart live in [`brand/`](brand/).

---

<div align="center">

**Nothing here is financial advice, and nothing here is a call.**

Roughly 8 in 10 tokens in a book like this go to zero. Around 6% of Solana wallets finish
90 days ahead, and 88% of those made under $100. Size accordingly.

</div>
