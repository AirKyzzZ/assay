import type { Chain } from "./types.ts";

const BASE_URL = "https://api.dexscreener.com";
const TIMEOUT_MS = 10_000;
const BATCH = 30;

export type Pair = {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h1?: number; h6?: number; h24?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
};

export const CHAIN_IDS: Record<Chain, string> = {
  solana: "solana",
  base: "base",
};

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchPairs(chain: Chain, address: string): Promise<Pair[]> {
  const pairs = await get<Pair[]>(`/token-pairs/v1/${CHAIN_IDS[chain]}/${address}`);
  if (!Array.isArray(pairs)) return [];
  return pairs;
}

export function deepestPair(pairs: Pair[]): Pair | null {
  if (pairs.length === 0) return null;
  return pairs.reduce((best, p) =>
    (p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? p : best
  );
}

export type TokenSnapshot = {
  symbol: string;
  priceUsd: number | null;
  mcapUsd: number | null;
  liqUsd: number | null;
  vol24hUsd: number | null;
  change24h: number | null;
  pairAgeHours: number | null;
  pairCount: number;
};

export function summarise(pairs: Pair[]): TokenSnapshot | null {
  const deepest = deepestPair(pairs);
  if (!deepest) return null;

  const liqUsd = pairs.reduce((sum, p) => sum + (p.liquidity?.usd ?? 0), 0);
  const vol24hUsd = pairs.reduce((sum, p) => sum + (p.volume?.h24 ?? 0), 0);

  const created = pairs
    .map((p) => p.pairCreatedAt)
    .filter((t): t is number => typeof t === "number");
  const oldest = created.length > 0 ? Math.min(...created) : null;

  const price = deepest.priceUsd ? Number(deepest.priceUsd) : null;

  return {
    symbol: deepest.baseToken.symbol,
    priceUsd: price !== null && Number.isFinite(price) ? price : null,
    mcapUsd: deepest.marketCap ?? deepest.fdv ?? null,
    liqUsd: liqUsd > 0 ? liqUsd : null,
    vol24hUsd: vol24hUsd > 0 ? vol24hUsd : null,
    change24h: deepest.priceChange?.h24 ?? null,
    pairAgeHours: oldest === null ? null : (Date.now() - oldest) / 3_600_000,
    pairCount: pairs.length,
  };
}

export async function fetchPrice(chain: Chain, address: string): Promise<number | null> {
  const pair = deepestPair(await fetchPairs(chain, address));
  if (!pair?.priceUsd) return null;
  const price = Number(pair.priceUsd);
  return Number.isFinite(price) ? price : null;
}

export async function fetchSolPrice(): Promise<number | null> {
  return fetchPrice("solana", "So11111111111111111111111111111111111111112");
}

export async function fetchTokensBatch(
  chain: Chain,
  addresses: string[]
): Promise<Map<string, TokenSnapshot>> {
  const out = new Map<string, TokenSnapshot>();
  const unique = [...new Set(addresses)];

  for (let i = 0; i < unique.length; i += BATCH) {
    const slice = unique.slice(i, i + BATCH);
    const pairs = await get<Pair[]>(`/tokens/v1/${CHAIN_IDS[chain]}/${slice.join(",")}`);
    if (!Array.isArray(pairs)) continue;

    const byToken = new Map<string, Pair[]>();
    for (const pair of pairs) {
      const key = pair.baseToken?.address;
      if (!key) continue;
      const list = byToken.get(key) ?? [];
      list.push(pair);
      byToken.set(key, list);
    }

    for (const [address, list] of byToken) {
      const snap = summarise(list);
      if (snap) out.set(address, snap);
    }
  }

  return out;
}
