import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { WalletChain } from "./balances.ts";

const FILE = process.env.ASSAY_WALLETS ?? resolve(process.cwd(), "data/wallets.json");

export type Wallet = {
  id: string;
  chain: WalletChain;
  address: string;
  label: string;
  addedAt: string;
};

export async function readWallets(): Promise<Wallet[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Wallet[];
  } catch {
    return [];
  }
}

async function write(wallets: Wallet[]): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(wallets, null, 2)}\n`, "utf8");
}

export async function addWallet(
  chain: WalletChain,
  address: string,
  label: string | null
): Promise<Wallet> {
  const wallets = await readWallets();
  const id = `${chain}:${address.slice(0, 6)}`;

  const wallet: Wallet = {
    id,
    chain,
    address,
    label: label ?? id,
    addedAt: new Date().toISOString(),
  };

  const idx = wallets.findIndex((w) => w.chain === chain && w.address === address);
  if (idx >= 0) wallets[idx] = wallet;
  else wallets.push(wallet);

  await write(wallets);
  return wallet;
}

export async function removeWallet(needle: string): Promise<Wallet | null> {
  const wallets = await readWallets();
  const idx = wallets.findIndex(
    (w) => w.address === needle || w.label === needle || w.id === needle
  );
  if (idx < 0) return null;
  const [removed] = wallets.splice(idx, 1);
  await write(wallets);
  return removed ?? null;
}

export function walletsPath(): string {
  return FILE;
}
