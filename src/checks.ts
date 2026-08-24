import { fetchPairs, summarise } from "./dexscreener.ts";
import { fetchCandles, momentum, topPoolAddress } from "./geckoterminal.ts";
import { fetchHolderConcentration, fetchMintAuthorities } from "./solana.ts";
import type { Chain, Check, CheckReport, Verdict } from "./types.ts";

export const MIN_LIQUIDITY_USD = 20_000;
export const MAX_TOP_TEN_PERCENT = 40;
export const MIN_VOLUME_TO_MCAP = 0.3;

const EXPLORER: Record<Chain, string> = {
  solana: "https://solscan.io/token/",
  base: "https://basescan.org/token/",
};

export async function runChecks(chain: Chain, address: string): Promise<CheckReport> {
  const pairs = await fetchPairs(chain, address);
  const snapshot = summarise(pairs);
  const checks: Check[] = [];

  const priceUsd = snapshot?.priceUsd ?? null;
  const liqUsd = snapshot?.liqUsd ?? null;
  const vol24hUsd = snapshot?.vol24hUsd ?? null;
  const mcapUsd = snapshot?.mcapUsd ?? null;
  const pairAgeHours = snapshot?.pairAgeHours ?? null;

  if (!snapshot) {
    checks.push({
      name: "Liquidity",
      status: "fail",
      detail: "No DEX pair found. Token does not trade, or the address is wrong.",
    });
  } else if (liqUsd === null) {
    checks.push({ name: "Liquidity", status: "manual", detail: "Liquidity not reported." });
  } else {
    checks.push({
      name: "Liquidity",
      status: liqUsd >= MIN_LIQUIDITY_USD ? "pass" : "fail",
      detail: `$${fmt(liqUsd)} pooled across ${snapshot?.pairCount ?? 0} pair(s), floor $${fmt(MIN_LIQUIDITY_USD)}.`,
    });
  }

  if (vol24hUsd !== null && mcapUsd) {
    const ratio = vol24hUsd / mcapUsd;
    checks.push({
      name: "Volume / mcap",
      status: ratio >= MIN_VOLUME_TO_MCAP ? "pass" : "fail",
      detail: `${(ratio * 100).toFixed(0)}% of mcap traded in 24h (floor ${MIN_VOLUME_TO_MCAP * 100}%).`,
    });
  } else {
    checks.push({
      name: "Volume / mcap",
      status: "manual",
      detail: "Volume or market cap unavailable.",
    });
  }

  if (chain === "solana") {
    const authorities = await fetchMintAuthorities(address);
    if (!authorities.ok) {
      checks.push({ name: "Mint authority", status: "manual", detail: authorities.reason });
      checks.push({ name: "Freeze authority", status: "manual", detail: authorities.reason });
    } else {
      const { mintAuthority, freezeAuthority } = authorities.value;
      checks.push({
        name: "Mint authority",
        status: mintAuthority === null ? "pass" : "fail",
        detail:
          mintAuthority === null
            ? "Revoked."
            : `LIVE — ${mintAuthority} can print unlimited supply.`,
      });
      checks.push({
        name: "Freeze authority",
        status: freezeAuthority === null ? "pass" : "fail",
        detail:
          freezeAuthority === null
            ? "Revoked."
            : `LIVE — ${freezeAuthority} can freeze your balance. Honeypot risk.`,
      });
    }

    const holders = await fetchHolderConcentration(address);
    if (!holders.ok) {
      checks.push({ name: "Holder concentration", status: "manual", detail: holders.reason });
    } else {
      checks.push({
        name: "Holder concentration",
        status: holders.value.topTenPercent <= MAX_TOP_TEN_PERCENT ? "pass" : "fail",
        detail:
          `Top 10 accounts hold ${holders.value.topTenPercent.toFixed(1)}% (ceiling ${MAX_TOP_TEN_PERCENT}%). ` +
          `Includes LP and exchange accounts, so subtract the pool before judging.`,
      });
    }
  } else {
    checks.push({
      name: "Contract powers",
      status: "manual",
      detail: "EVM: read the verified source for setFee, blacklist, pause, mint, excludeFromFee.",
    });
  }

  checks.push({
    name: "Sellability",
    status: "manual",
    detail: "Buy the minimum, sell it immediately. Honeypots let you in, never out.",
  });

  checks.push({
    name: "Deployer history",
    status: "manual",
    detail: `Trace the deployer on ${EXPLORER[chain]}${address} — serial launchers repeat.`,
  });

  const pool = await topPoolAddress(chain, address);
  const candles = pool ? await fetchCandles(chain, pool) : [];
  const trend = momentum(candles);

  if (trend) {
    checks.push({
      name: "Volume trend (6h)",
      status: trend.volumeTrend > -40 ? "pass" : "fail",
      detail:
        `${trend.volumeTrend > 0 ? "+" : ""}${trend.volumeTrend.toFixed(0)}% versus the prior 6h. ` +
        (trend.volumeTrend < -40 ? "Interest is draining." : "Still trading."),
    });
    checks.push({
      name: "Drawdown from high",
      status: trend.drawdownFromHigh > -60 ? "pass" : "fail",
      detail:
        `${trend.drawdownFromHigh.toFixed(0)}% off the ${trend.candles}h high, set ${trend.hoursSinceHigh.toFixed(0)}h ago.`,
    });
  }

  return {
    chain,
    address,
    symbol: snapshot?.symbol ?? "?",
    priceUsd,
    mcapUsd,
    liqUsd,
    vol24hUsd,
    pairAgeHours,
    momentum: trend,
    checks,
    verdict: verdictOf(checks),
  };
}

function verdictOf(checks: Check[]): Verdict {
  if (checks.some((c) => c.status === "fail")) return "blocked";
  if (checks.some((c) => c.status === "manual")) return "needs-manual";
  return "clear";
}

export function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(2);
}
