import { fetchPrice, fetchSolPrice } from "./dexscreener.ts";
import type { Entry } from "./types.ts";

export const ROUND_TRIP_FEE = 0.01;

export type Position = {
  buy: Entry;
  sells: Entry[];
  currentPriceUsd: number | null;
  realizedUsd: number;
  unrealizedUsd: number;
  multiple: number | null;
  closed: boolean;
};

export type Summary = {
  positions: Position[];
  buys: number;
  passes: number;
  closed: number;
  open: number;
  wins: number;
  hitRate: number;
  deployedUsd: number;
  realizedUsd: number;
  unrealizedUsd: number;
  feesUsd: number;
  netUsd: number;
  netPercent: number;
  benchmarkUsd: number;
  benchmarkPercent: number;
  edgeVsBenchmark: number;
};

export async function buildSummary(entries: Entry[]): Promise<Summary> {
  const buys = entries.filter((e) => e.kind === "buy");
  const sells = entries.filter((e) => e.kind === "sell");
  const passes = entries.filter((e) => e.kind === "pass");

  const addresses = [...new Set(buys.map((b) => `${b.chain}:${b.address}`))];
  const prices = new Map<string, number | null>();
  for (const key of addresses) {
    const [chain, address] = key.split(":");
    prices.set(key, await fetchPrice(chain as Entry["chain"], address ?? ""));
  }

  const solNow = await fetchSolPrice();

  const positions: Position[] = buys.map((buy) => {
    const linked = sells.filter((s) => s.linkedTo === buy.id);
    const size = buy.sizeUsd ?? 0;
    const tokens = buy.priceUsd > 0 ? size / buy.priceUsd : 0;

    const realizedUsd = linked.reduce((sum, s) => sum + (s.sizeUsd ?? 0), 0);
    const soldTokens = linked.reduce(
      (sum, s) => sum + (s.priceUsd > 0 ? (s.sizeUsd ?? 0) / s.priceUsd : 0),
      0
    );

    const current = prices.get(`${buy.chain}:${buy.address}`) ?? null;
    const remaining = Math.max(tokens - soldTokens, 0);
    const unrealizedUsd = current === null ? 0 : remaining * current;
    const closed = remaining / (tokens || 1) < 0.02;

    const total = realizedUsd + unrealizedUsd;

    return {
      buy,
      sells: linked,
      currentPriceUsd: current,
      realizedUsd,
      unrealizedUsd,
      multiple: size > 0 ? total / size : null,
      closed,
    };
  });

  const deployedUsd = positions.reduce((sum, p) => sum + (p.buy.sizeUsd ?? 0), 0);
  const realizedUsd = positions.reduce((sum, p) => sum + p.realizedUsd, 0);
  const unrealizedUsd = positions.reduce((sum, p) => sum + p.unrealizedUsd, 0);
  const feesUsd = deployedUsd * ROUND_TRIP_FEE;
  const netUsd = realizedUsd + unrealizedUsd - deployedUsd - feesUsd;

  const wins = positions.filter((p) => (p.multiple ?? 0) > 1).length;

  let benchmarkUsd = 0;
  for (const p of positions) {
    const size = p.buy.sizeUsd ?? 0;
    if (solNow && p.buy.solPriceUsd) benchmarkUsd += size * (solNow / p.buy.solPriceUsd);
    else benchmarkUsd += size;
  }

  const netPercent = deployedUsd > 0 ? (netUsd / deployedUsd) * 100 : 0;
  const benchmarkPercent =
    deployedUsd > 0 ? ((benchmarkUsd - deployedUsd) / deployedUsd) * 100 : 0;

  return {
    positions,
    buys: buys.length,
    passes: passes.length,
    closed: positions.filter((p) => p.closed).length,
    open: positions.filter((p) => !p.closed).length,
    wins,
    hitRate: positions.length > 0 ? (wins / positions.length) * 100 : 0,
    deployedUsd,
    realizedUsd,
    unrealizedUsd,
    feesUsd,
    netUsd,
    netPercent,
    benchmarkUsd,
    benchmarkPercent,
    edgeVsBenchmark: netPercent - benchmarkPercent,
  };
}
