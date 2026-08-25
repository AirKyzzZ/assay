import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { assetKey, parseAsset, type AssetRef } from "./prices.ts";

const FILE = process.env.ASSAY_HOLDINGS ?? resolve(process.cwd(), "data/holdings.json");

export type Holding = {
  asset: string;
  ref: AssetRef;
  amount: number;
  venue: string;
  updatedAt: string;
};

export async function readHoldings(): Promise<Holding[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Holding[];
  } catch {
    return [];
  }
}

export async function setHolding(
  asset: string,
  amount: number,
  venue: string
): Promise<Holding | null> {
  const ref = parseAsset(asset);
  if (!ref) return null;

  const holdings = await readHoldings();
  const key = assetKey(ref);
  const next: Holding = {
    asset: ref.kind === "major" ? ref.ticker : asset,
    ref,
    amount,
    venue,
    updatedAt: new Date().toISOString(),
  };

  const idx = holdings.findIndex((h) => assetKey(h.ref) === key);
  if (amount <= 0) {
    if (idx >= 0) holdings.splice(idx, 1);
  } else if (idx >= 0) {
    holdings[idx] = next;
  } else {
    holdings.push(next);
  }

  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(holdings, null, 2)}\n`, "utf8");
  return amount > 0 ? next : null;
}

export function holdingsPath(): string {
  return FILE;
}
