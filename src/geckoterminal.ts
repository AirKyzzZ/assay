import type { Chain } from "./types.ts";

const BASE_URL = "https://api.geckoterminal.com/api/v2";
const MIN_INTERVAL_MS = 6_500;

let lastCall = 0;

async function throttled<T>(path: string): Promise<T | null> {
  const wait = Math.max(0, lastCall + MIN_INTERVAL_MS - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { accept: "application/json;version=20230302" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type Candle = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type PoolList = { data?: Array<{ attributes?: { address?: string } }> };
type OhlcvResponse = { data?: { attributes?: { ohlcv_list?: number[][] } } };

export async function topPoolAddress(chain: Chain, token: string): Promise<string | null> {
  const body = await throttled<PoolList>(`/networks/${chain}/tokens/${token}/pools`);
  return body?.data?.[0]?.attributes?.address ?? null;
}

export async function fetchCandles(
  chain: Chain,
  pool: string,
  timeframe: "hour" | "day" = "hour",
  limit = 168
): Promise<Candle[]> {
  const body = await throttled<OhlcvResponse>(
    `/networks/${chain}/pools/${pool}/ohlcv/${timeframe}?limit=${limit}`
  );
  const rows = body?.data?.attributes?.ohlcv_list;
  if (!rows) return [];

  return rows
    .filter((r): r is number[] => Array.isArray(r) && r.length >= 6)
    .map((r) => ({
      ts: r[0] ?? 0,
      open: r[1] ?? 0,
      high: r[2] ?? 0,
      low: r[3] ?? 0,
      close: r[4] ?? 0,
      volume: r[5] ?? 0,
    }))
    .sort((a, b) => a.ts - b.ts);
}

export type Momentum = {
  drawdownFromHigh: number;
  volumeTrend: number;
  hoursSinceHigh: number;
  candles: number;
};

export function momentum(candles: Candle[]): Momentum | null {
  if (candles.length < 12) return null;

  const last = candles.at(-1);
  if (!last) return null;

  const high = Math.max(...candles.map((c) => c.high));
  const highCandle = candles.findLast((c) => c.high === high);
  const hoursSinceHigh = highCandle ? (last.ts - highCandle.ts) / 3600 : 0;

  const recent = candles.slice(-6).reduce((s, c) => s + c.volume, 0);
  const prior = candles.slice(-12, -6).reduce((s, c) => s + c.volume, 0);

  return {
    drawdownFromHigh: high > 0 ? ((last.close - high) / high) * 100 : 0,
    volumeTrend: prior > 0 ? ((recent - prior) / prior) * 100 : 0,
    hoursSinceHigh,
    candles: candles.length,
  };
}

export type TrendingPool = {
  name: string;
  address: string;
  tokenAddress: string;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
};

type TrendingResponse = {
  data?: Array<{
    attributes?: {
      name?: string;
      address?: string;
      price_change_percentage?: { h24?: string };
      volume_usd?: { h24?: string };
      reserve_in_usd?: string;
    };
    relationships?: { base_token?: { data?: { id?: string } } };
  }>;
};

export async function trendingPools(chain: Chain): Promise<TrendingPool[]> {
  const body = await throttled<TrendingResponse>(`/networks/${chain}/trending_pools`);
  if (!body?.data) return [];

  return body.data.flatMap((p) => {
    const a = p.attributes;
    const tokenId = p.relationships?.base_token?.data?.id ?? "";
    if (!a?.address) return [];
    return [
      {
        name: a.name ?? "?",
        address: a.address,
        tokenAddress: tokenId.split("_").at(-1) ?? "",
        priceChange24h: Number(a.price_change_percentage?.h24 ?? 0),
        volume24h: Number(a.volume_usd?.h24 ?? 0),
        liquidity: Number(a.reserve_in_usd ?? 0),
      },
    ];
  });
}
