export type Chain = "solana" | "base";

export type CheckStatus = "pass" | "fail" | "manual";

export type Check = {
  name: string;
  status: CheckStatus;
  detail: string;
};

export type Verdict = "clear" | "blocked" | "needs-manual";

export type CheckReport = {
  chain: Chain;
  address: string;
  symbol: string;
  priceUsd: number | null;
  mcapUsd: number | null;
  liqUsd: number | null;
  vol24hUsd: number | null;
  pairAgeHours: number | null;
  checks: Check[];
  verdict: Verdict;
};

export type EntryKind = "buy" | "sell" | "pass";

export type Entry = {
  id: string;
  ts: string;
  kind: EntryKind;
  chain: Chain;
  address: string;
  symbol: string;
  source: string;
  priceUsd: number;
  mcapUsd: number | null;
  liqUsd: number | null;
  solPriceUsd: number | null;
  sizeUsd: number | null;
  linkedTo: string | null;
  thesis: string | null;
  exitPlan: string | null;
  passReason: string | null;
  verdict: Verdict | null;
};

export type CallerScore = {
  source: string;
  calls: number;
  taken: number;
  passed: number;
  hits: number;
  hitRate: number;
  medianReturn: number;
  bestReturn: number;
  worstReturn: number;
};
