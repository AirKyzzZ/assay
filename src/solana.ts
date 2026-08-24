const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

const RATE_LIMITED =
  "Public RPC rate-limited this call. Set SOLANA_RPC_URL to a Helius free-tier endpoint.";

export type RpcResult<T> = { ok: true; value: T } | { ok: false; reason: string };

type RpcBody<T> = { result?: T; error?: { code: number; message: string } };

async function rpc<T>(method: string, params: unknown[]): Promise<RpcResult<T>> {
  let res: Response;
  try {
    res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
  } catch {
    return { ok: false, reason: "RPC unreachable." };
  }

  if (res.status === 429) return { ok: false, reason: RATE_LIMITED };
  if (!res.ok) return { ok: false, reason: `RPC returned ${res.status}.` };

  const body = (await res.json()) as RpcBody<T>;
  if (body.error) {
    const limited = body.error.code === 429 || /too many requests/i.test(body.error.message);
    return { ok: false, reason: limited ? RATE_LIMITED : body.error.message };
  }
  if (body.result === undefined) return { ok: false, reason: "RPC returned no result." };

  return { ok: true, value: body.result };
}

export type MintAuthorities = {
  mintAuthority: string | null;
  freezeAuthority: string | null;
};

type AccountInfo = {
  value?: {
    data?: {
      parsed?: { info?: { mintAuthority?: string | null; freezeAuthority?: string | null } };
    };
  } | null;
};

export async function fetchMintAuthorities(
  address: string
): Promise<RpcResult<MintAuthorities>> {
  const result = await rpc<AccountInfo>("getAccountInfo", [
    address,
    { encoding: "jsonParsed" },
  ]);
  if (!result.ok) return result;

  const info = result.value.value?.data?.parsed?.info;
  if (!info) return { ok: false, reason: "Address is not a parseable SPL mint." };

  return {
    ok: true,
    value: {
      mintAuthority: info.mintAuthority ?? null,
      freezeAuthority: info.freezeAuthority ?? null,
    },
  };
}

export type HolderConcentration = { topTenPercent: number };

export async function fetchHolderConcentration(
  address: string
): Promise<RpcResult<HolderConcentration>> {
  const largest = await rpc<{ value?: Array<{ uiAmount: number | null }> }>(
    "getTokenLargestAccounts",
    [address]
  );
  if (!largest.ok) return largest;

  const accounts = largest.value.value;
  if (!accounts?.length) return { ok: false, reason: "No token accounts returned." };

  const supply = await rpc<{ value?: { uiAmount: number | null } }>("getTokenSupply", [address]);
  if (!supply.ok) return supply;

  const total = supply.value.value?.uiAmount;
  if (!total) return { ok: false, reason: "Supply unavailable." };

  const topTen = accounts.slice(0, 10).reduce((sum, a) => sum + (a.uiAmount ?? 0), 0);

  return { ok: true, value: { topTenPercent: (topTen / total) * 100 } };
}
