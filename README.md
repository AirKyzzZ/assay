# tradelog

Pre-trade safety checks, a trade journal, and edge analysis for manual memecoin trading.

Execution happens wherever you actually trade. This tool does the parts a trading app
won't: verifying a token before you enter, keeping a consistent record of every decision
including the ones you passed on, and telling you honestly whether any of it beat holding SOL.

No API keys, no build step, no runtime dependencies. Node 23+ runs the TypeScript directly.

## Commands

```
tradelog check <solana|base> <address>    run the seven checks
tradelog log <buy|sell|pass> [flags]      record an entry
tradelog review                           forward return on everything, passes included
tradelog stats                            edge summary vs holding SOL
tradelog callers                          hit rate by source
```

## Checks

Five are automated for Solana, fewer for Base. The rest print what to verify and where,
because a check that silently reports "unknown" as "fine" is worse than no check.

| Check | Automated | Source |
|---|---|---|
| Liquidity floor ($20k) | yes | DexScreener |
| 24h volume / market cap (30%) | yes | DexScreener |
| Mint authority revoked | Solana only | RPC `getAccountInfo` |
| Freeze authority revoked | Solana only | RPC `getAccountInfo` |
| Top 10 holder concentration (40%) | Solana only | RPC `getTokenLargestAccounts` |
| Contract powers | manual | verified source |
| Sellability | manual | test sell |
| Deployer history | manual | explorer |

Holder concentration includes LP and exchange accounts. Subtract the pool before judging it.

## Journal

A buy without `--exit` is refused. The ladder gets written before the entry, not after.

Every entry stores the SOL price at the time, so the benchmark is computed from what you
would have had rather than reconstructed later.

`review` prices your passes too. The tokens you declined that then ran are the most
informative data you generate, and nobody keeps them.

## Usage

```sh
npm install

node src/cli.ts check solana <address>

node src/cli.ts log buy \
  --chain solana --address <address> --source @handle --size 50 \
  --thesis "narrative rotation, 3rd cat token this week" \
  --exit "25% at 2x, 25% at 3x, 25% at 5x, trail rest 20%"

node src/cli.ts log pass \
  --chain base --address <address> --source @handle \
  --reason "top 10 hold 61%"

node src/cli.ts review
node src/cli.ts stats
node src/cli.ts callers
```

`data/` is gitignored. Your journal is yours.

## Config

| Variable | Default |
|---|---|
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` |
| `TRADELOG_FILE` | `./data/entries.jsonl` |

The public Solana RPC is rate-limited. Point `SOLANA_RPC_URL` at a Helius free-tier
endpoint if checks start timing out.
