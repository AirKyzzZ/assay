const BINANCE = "https://api.binance.com/api/v3";
const FNG = "https://api.alternative.me/fng";
const LLAMA = "https://api.llama.fi";

export type Regime = {
  fearGreed: number | null;
  fearGreedLabel: string | null;
  btcTrend: Trend | null;
  solTrend: Trend | null;
  solanaDexVolume24h: number | null;
  stance: "risk-on" | "neutral" | "risk-off";
};

export type Trend = {
  symbol: string;
  price: number;
  change7d: number;
  change30d: number;
  above50d: boolean;
};

async function json<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchTrend(symbol: string): Promise<Trend | null> {
  const rows = await json<unknown[][]>(
    `${BINANCE}/klines?symbol=${symbol}USDT&interval=1d&limit=51`
  );
  if (!rows || rows.length < 31) return null;

  const closes = rows.map((r) => Number(r[4])).filter(Number.isFinite);
  const price = closes.at(-1);
  const ago7 = closes.at(-8);
  const ago30 = closes.at(-31);
  if (price === undefined || ago7 === undefined || ago30 === undefined) return null;

  const ma50 = closes.reduce((s, c) => s + c, 0) / closes.length;

  return {
    symbol,
    price,
    change7d: ((price - ago7) / ago7) * 100,
    change30d: ((price - ago30) / ago30) * 100,
    above50d: price > ma50,
  };
}

export async function fetchRegime(): Promise<Regime> {
  const [fng, btcTrend, solTrend, dexVolume] = await Promise.all([
    json<{ data?: Array<{ value?: string; value_classification?: string }> }>(`${FNG}/?limit=1`),
    fetchTrend("BTC"),
    fetchTrend("SOL"),
    json<{ total24h?: number }>(`${LLAMA}/overview/dexs/solana?excludeTotalDataChart=true`),
  ]);

  const value = fng?.data?.[0]?.value;
  const fearGreed = value === undefined ? null : Number(value);

  const signals = [
    fearGreed === null ? 0 : fearGreed >= 60 ? 1 : fearGreed <= 35 ? -1 : 0,
    btcTrend === null ? 0 : btcTrend.above50d ? 1 : -1,
    solTrend === null ? 0 : solTrend.above50d ? 1 : -1,
  ];
  const score = signals.reduce((s, v) => s + v, 0);

  return {
    fearGreed,
    fearGreedLabel: fng?.data?.[0]?.value_classification ?? null,
    btcTrend,
    solTrend,
    solanaDexVolume24h: dexVolume?.total24h ?? null,
    stance: score >= 2 ? "risk-on" : score <= -2 ? "risk-off" : "neutral",
  };
}
