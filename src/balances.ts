export type WalletChain = "bitcoin" | "ethereum" | "base" | "solana";

export type Balance = {
  asset: string;
  symbol: string;
  amount: number;
};

export type BalanceResult =
  | { ok: true; balances: Balance[] }
  | { ok: false; reason: string };

const SOLANA_RPC = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const BLOCKSCOUT: Record<string, string> = {
  ethereum: "https://eth.blockscout.com",
  base: "https://base.blockscout.com",
};

export const NATIVE: Record<WalletChain, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  base: "ETH",
  solana: "SOL",
};

async function json<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function bitcoin(address: string): Promise<BalanceResult> {
  const body = await json<{
    chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
  }>(`https://blockstream.info/api/address/${address}`);

  const funded = body?.chain_stats?.funded_txo_sum;
  const spent = body?.chain_stats?.spent_txo_sum;
  if (funded === undefined || spent === undefined) {
    return { ok: false, reason: "block explorer unreachable" };
  }

  const btc = (funded - spent) / 1e8;
  return { ok: true, balances: btc > 0 ? [{ asset: "BTC", symbol: "BTC", amount: btc }] : [] };
}

async function evm(chain: "ethereum" | "base", address: string): Promise<BalanceResult> {
  const host = BLOCKSCOUT[chain];
  const out: Balance[] = [];

  const info = await json<{ coin_balance?: string }>(`${host}/api/v2/addresses/${address}`);
  if (info === null) return { ok: false, reason: "blockscout unreachable" };
  const wei = info?.coin_balance;
  if (wei) {
    const eth = Number(BigInt(wei)) / 1e18;
    if (eth > 0) out.push({ asset: "ETH", symbol: "ETH", amount: eth });
  }

  const tokens = await json<
    Array<{ token?: { address?: string; symbol?: string; decimals?: string }; value?: string }>
  >(`${host}/api/v2/addresses/${address}/token-balances`);

  for (const t of Array.isArray(tokens) ? tokens : []) {
    const raw = t.value;
    const decimals = Number(t.token?.decimals ?? 18);
    const mint = t.token?.address;
    if (!raw || !mint || !Number.isFinite(decimals)) continue;
    const amount = Number(BigInt(raw)) / 10 ** decimals;
    if (amount <= 0) continue;
    out.push({
      asset: `${chain === "base" ? "base" : "ethereum"}:${mint}`,
      symbol: t.token?.symbol ?? "?",
      amount,
    });
  }

  return { ok: true, balances: out };
}

async function solana(address: string): Promise<BalanceResult> {
  const out: Balance[] = [];

  const lamports = await json<{ result?: { value?: number } }>(SOLANA_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
  });
  if (lamports === null) return { ok: false, reason: "solana RPC unreachable" };
  const sol = (lamports?.result?.value ?? 0) / 1e9;
  if (sol > 0) out.push({ asset: "SOL", symbol: "SOL", amount: sol });

  for (const programId of [TOKEN_PROGRAM, TOKEN_2022]) {
    const body = await json<{
      result?: {
        value?: Array<{
          account?: {
            data?: {
              parsed?: {
                info?: { mint?: string; tokenAmount?: { uiAmount?: number | null } };
              };
            };
          };
        }>;
      };
    }>(SOLANA_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [address, { programId }, { encoding: "jsonParsed" }],
      }),
    });

    for (const acct of body?.result?.value ?? []) {
      const info = acct.account?.data?.parsed?.info;
      const mint = info?.mint;
      const amount = info?.tokenAmount?.uiAmount;
      if (!mint || !amount || amount <= 0) continue;
      out.push({ asset: `solana:${mint}`, symbol: mint.slice(0, 4), amount });
    }
  }

  return { ok: true, balances: out };
}

export async function fetchBalances(chain: WalletChain, address: string): Promise<BalanceResult> {
  switch (chain) {
    case "bitcoin":
      return bitcoin(address);
    case "ethereum":
      return evm("ethereum", address);
    case "base":
      return evm("base", address);
    case "solana":
      return solana(address);
  }
}

export function isWalletChain(value: unknown): value is WalletChain {
  return value === "bitcoin" || value === "ethereum" || value === "base" || value === "solana";
}
