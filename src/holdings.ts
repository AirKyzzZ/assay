import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { assetKey, parseAsset, type AssetRef } from "./prices.ts";

const FILE = process.env.ASSAY_HOLDINGS ?? resolve(process.cwd(), "data/holdings.json");

export type Holding = {
  asset: string;
  ref: AssetRef;
  amount: number;
  costUsd: number | null;
  venue: string;
  updatedAt: string;
};

export async function readHoldings(): Promise<Holding[]> {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as Holding[];
    return parsed.map((h) => ({ ...h, costUsd: h.costUsd ?? null }));
  } catch {
    return [];
  }
}

async function write(holdings: Holding[]): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(holdings, null, 2)}\n`, "utf8");
}

export type HoldInput = {
  asset: string;
  amount: number;
  costUsd: number | null;
  venue: string | null;
};

export async function setHolding(input: HoldInput): Promise<Holding | null> {
  const ref = parseAsset(input.asset);
  if (!ref) return null;

  const holdings = await readHoldings();
  const key = assetKey(ref);
  const idx = holdings.findIndex((h) => assetKey(h.ref) === key);

  if (input.amount <= 0) {
    if (idx >= 0) holdings.splice(idx, 1);
    await write(holdings);
    return null;
  }

  const next: Holding = {
    asset: ref.kind === "major" ? ref.ticker : input.asset,
    ref,
    amount: input.amount,
    costUsd: input.costUsd,
    venue: input.venue ?? holdings[idx]?.venue ?? "ledger",
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) holdings[idx] = next;
  else holdings.push(next);

  await write(holdings);
  return next;
}

export async function addToHolding(input: HoldInput): Promise<Holding | null> {
  const ref = parseAsset(input.asset);
  if (!ref) return null;

  const holdings = await readHoldings();
  const key = assetKey(ref);
  const existing = holdings.find((h) => assetKey(h.ref) === key);

  if (!existing) {
    return setHolding(input);
  }

  const amount = existing.amount + input.amount;
  const costUsd =
    existing.costUsd === null || input.costUsd === null
      ? null
      : existing.costUsd + input.costUsd;

  existing.amount = amount;
  existing.costUsd = costUsd;
  existing.venue = input.venue ?? existing.venue;
  existing.updatedAt = new Date().toISOString();

  await write(holdings);
  return existing;
}

export function holdingsPath(): string {
  return FILE;
}
