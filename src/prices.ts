import { fetchPairs, fetchTokensBatch, summarise } from "./dexscreener.ts";
import type { Chain } from "./types.ts";

const BINANCE = "https://api.binance.com/api/v3";

export type AssetRef =
  | { kind: "major"; ticker: string }
  | { kind: "token"; chain: Chain; address: string };

export type Quote = {
  ref: AssetRef;
  label: string;
  priceUsd: number | null;
  change24h: number | null;
};

export function parseAsset(input: string): AssetRef | null {
  const trimmed = input.trim();
  if (trimmed.includes(":")) {
    const [chain, address] = trimmed.split(":");
    if ((chain === "solana" || chain === "base") && address) {
      return { kind: "token", chain, address };
    }
    return null;
  }
  if (/^[A-Za-z0-9]{2,10}$/.test(trimmed)) {
    return { kind: "major", ticker: trimmed.toUpperCase() };
  }
  return null;
}

export function assetKey(ref: AssetRef): string {
  return ref.kind === "major" ? ref.ticker : `${ref.chain}:${ref.address}`;
}

const STABLES = new Set(["USDT", "USDC", "DAI", "USD"]);

async function binance24h(ticker: string): Promise<Quote> {
  const ref: AssetRef = { kind: "major", ticker };
  if (STABLES.has(ticker)) {
    return { ref, label: ticker, priceUsd: 1, change24h: 0 };
  }
  try {
    const res = await fetch(`${BINANCE}/ticker/24hr?symbol=${ticker}USDT`);
    if (!res.ok) return { ref, label: ticker, priceUsd: null, change24h: null };
    const body = (await res.json()) as { lastPrice?: string; priceChangePercent?: string };
    const price = Number(body.lastPrice);
    const change = Number(body.priceChangePercent);
    return {
      ref,
      label: ticker,
      priceUsd: Number.isFinite(price) ? price : null,
      change24h: Number.isFinite(change) ? change : null,
    };
  } catch {
    return { ref, label: ticker, priceUsd: null, change24h: null };
  }
}

export async function quote(ref: AssetRef): Promise<Quote> {
  if (ref.kind === "major") return binance24h(ref.ticker);

  const snap = summarise(await fetchPairs(ref.chain, ref.address));
  return {
    ref,
    label: snap?.symbol ?? ref.address.slice(0, 6),
    priceUsd: snap?.priceUsd ?? null,
    change24h: snap?.change24h ?? null,
  };
}

export async function quoteAll(refs: AssetRef[]): Promise<Map<string, Quote>> {
  const unique = new Map<string, AssetRef>();
  for (const ref of refs) unique.set(assetKey(ref), ref);

  const out = new Map<string, Quote>();
  const byChain = new Map<Chain, string[]>();
  const majors: AssetRef[] = [];

  for (const ref of unique.values()) {
    if (ref.kind === "major") majors.push(ref);
    else byChain.set(ref.chain, [...(byChain.get(ref.chain) ?? []), ref.address]);
  }

  const majorQuotes = await Promise.all(majors.map(quote));
  for (const q of majorQuotes) out.set(assetKey(q.ref), q);

  for (const [chain, addresses] of byChain) {
    const snaps = await fetchTokensBatch(chain, addresses);
    for (const address of addresses) {
      const ref: AssetRef = { kind: "token", chain, address };
      const snap = snaps.get(address);
      out.set(assetKey(ref), {
        ref,
        label: snap?.symbol ?? address.slice(0, 6),
        priceUsd: snap?.priceUsd ?? null,
        change24h: snap?.change24h ?? null,
      });
    }
  }

  return out;
}
