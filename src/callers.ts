import { fetchPrice } from "./dexscreener.ts";
import type { CallerScore, Entry } from "./types.ts";

export async function scoreCallers(entries: Entry[]): Promise<CallerScore[]> {
  const calls = entries.filter((e) => e.kind === "buy" || e.kind === "pass");

  const keys = [...new Set(calls.map((e) => `${e.chain}:${e.address}`))];
  const prices = new Map<string, number | null>();
  for (const key of keys) {
    const [chain, address] = key.split(":");
    prices.set(key, await fetchPrice(chain as Entry["chain"], address ?? ""));
  }

  const bySource = new Map<string, Entry[]>();
  for (const call of calls) {
    const list = bySource.get(call.source) ?? [];
    list.push(call);
    bySource.set(call.source, list);
  }

  const scores: CallerScore[] = [];

  for (const [source, list] of bySource) {
    const returns: number[] = [];
    for (const call of list) {
      const now = prices.get(`${call.chain}:${call.address}`);
      if (now == null || call.priceUsd <= 0) continue;
      returns.push((now / call.priceUsd - 1) * 100);
    }

    if (returns.length === 0) continue;

    scores.push({
      source,
      calls: list.length,
      taken: list.filter((e) => e.kind === "buy").length,
      passed: list.filter((e) => e.kind === "pass").length,
      hits: returns.filter((r) => r > 0).length,
      hitRate: (returns.filter((r) => r > 0).length / returns.length) * 100,
      medianReturn: median(returns),
      bestReturn: Math.max(...returns),
      worstReturn: Math.min(...returns),
    });
  }

  return scores.sort((a, b) => b.medianReturn - a.medianReturn);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}
