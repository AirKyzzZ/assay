#!/usr/bin/env node
import { parseArgs } from "node:util";
import { scoreCallers } from "./callers.ts";
import { fmt, runChecks } from "./checks.ts";
import { fetchPairs, fetchSolPrice, summarise } from "./dexscreener.ts";
import { trendingPools } from "./geckoterminal.ts";
import { fetchRegime } from "./market.ts";
import { addToHolding, holdingsPath, readHoldings, setHolding } from "./holdings.ts";
import { describe, ladderState, parseLadder } from "./ladder.ts";
import { assetKey, parseAsset, quoteAll, type AssetRef } from "./prices.ts";
import { append, dataPath, nextId, readAll } from "./store.ts";
import { buildSummary } from "./stats.ts";
import type { Chain, Entry, EntryKind } from "./types.ts";

const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

const USAGE = `
${BOLD}assay${RESET} — pre-trade checks, journal and edge analysis

  ${BOLD}check${RESET} <chain> <address>       run the safety checks
  ${BOLD}log${RESET} <buy|sell|pass> [flags]   record an entry
  ${BOLD}review${RESET}                        forward return on everything, including passes
  ${BOLD}stats${RESET}                         edge summary vs holding SOL
  ${BOLD}callers${RESET}                       hit rate by source
  ${BOLD}market${RESET}                        regime: fear/greed, BTC & SOL trend, DEX volume
  ${BOLD}scan${RESET} [chain]                  trending pools, unvetted
  ${BOLD}hold${RESET} <asset> [amount]          record what you own (BTC, or solana:<addr>)
    --cost N      total USD paid       --avg N    average USD per unit
    --add N       add to the position  --venue X  where it lives
  ${BOLD}watch${RESET}                         daily screen: what needs action right now

  chains: solana | base

  log flags:
    --chain     solana | base            (required)
    --address   token address            (required)
    --source    caller handle, or self   (default: self)
    --size      position size in USD     (buy/sell)
    --linked    buy id this sell closes  (sell)
    --thesis    why you are taking it
    --exit      exits, written before entry
    --reason    why you passed
`;

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "check":
      return cmdCheck(rest);
    case "log":
      return cmdLog(rest);
    case "review":
      return cmdReview();
    case "stats":
      return cmdStats();
    case "callers":
      return cmdCallers();
    case "market":
      return cmdMarket();
    case "scan":
      return cmdScan(rest);
    case "hold":
      return cmdHold(rest);
    case "watch":
      return cmdWatch();
    default:
      console.log(USAGE);
  }
}

async function cmdMarket(): Promise<void> {
  const r = await fetchRegime();
  const sign = (n: number) => (n > 0 ? "+" : "");
  const color = (n: number) => (n > 0 ? GREEN : n < 0 ? RED : DIM);

  const stance =
    r.stance === "risk-on"
      ? `${GREEN}RISK-ON${RESET}`
      : r.stance === "risk-off"
        ? `${RED}RISK-OFF${RESET}`
        : `${YELLOW}NEUTRAL${RESET}`;

  console.log(`\n${BOLD}Regime${RESET}  ${stance}\n`);

  if (r.fearGreed !== null) {
    console.log(`  fear & greed   ${r.fearGreed} ${DIM}${r.fearGreedLabel ?? ""}${RESET}`);
  }

  for (const t of [r.btcTrend, r.solTrend]) {
    if (!t) continue;
    console.log(
      `  ${t.symbol.padEnd(14)} $${t.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}` +
        `  ${color(t.change7d)}${sign(t.change7d)}${t.change7d.toFixed(1)}% 7d${RESET}` +
        `  ${color(t.change30d)}${sign(t.change30d)}${t.change30d.toFixed(1)}% 30d${RESET}` +
        `  ${t.above50d ? `${GREEN}above 50d${RESET}` : `${RED}below 50d${RESET}`}`
    );
  }

  if (r.solanaDexVolume24h !== null) {
    console.log(`  solana dex     $${fmt(r.solanaDexVolume24h)} 24h volume`);
  }

  if (r.stance === "risk-off") {
    console.log(
      `\n  ${YELLOW}Memecoins are pure beta to this. Risk-off is when the book bleeds fastest.${RESET}`
    );
  }
  console.log();
}

async function cmdScan(args: string[]): Promise<void> {
  const chain = args[0] ?? "solana";
  if (!isChain(chain)) {
    console.error("usage: assay scan [solana|base]");
    process.exitCode = 1;
    return;
  }

  const pools = await trendingPools(chain);
  if (pools.length === 0) {
    console.log("No trending pools returned.");
    return;
  }

  console.log(`\n${BOLD}Trending on ${chain}${RESET} ${DIM}(unvetted — run check before acting)${RESET}\n`);
  console.log(
    `  ${DIM}${"pair".padEnd(24)}${"24h".padStart(9)}${"volume".padStart(12)}${"liquidity".padStart(12)}${RESET}`
  );

  for (const p of pools.slice(0, 15)) {
    const c = p.priceChange24h > 0 ? GREEN : RED;
    console.log(
      `  ${p.name.slice(0, 23).padEnd(24)}` +
        `${c}${`${p.priceChange24h > 0 ? "+" : ""}${p.priceChange24h.toFixed(0)}%`.padStart(9)}${RESET}` +
        `${`$${fmt(p.volume24h)}`.padStart(12)}${`$${fmt(p.liquidity)}`.padStart(12)}`
    );
  }

  console.log(
    `\n  ${DIM}Trending means already discovered. Treat this as a watchlist, not a signal.${RESET}\n`
  );
}

async function cmdCheck(args: string[]): Promise<void> {
  const [chain, address] = args;
  if (!isChain(chain) || !address) {
    console.error("usage: assay check <solana|base> <address>");
    process.exitCode = 1;
    return;
  }

  const report = await runChecks(chain, address);

  console.log(`\n${BOLD}${report.symbol}${RESET} ${DIM}${address}${RESET}`);
  console.log(
    `${DIM}price${RESET} ${report.priceUsd === null ? "?" : `$${report.priceUsd.toPrecision(4)}`}` +
      `  ${DIM}mcap${RESET} ${report.mcapUsd === null ? "?" : `$${fmt(report.mcapUsd)}`}` +
      `  ${DIM}liq${RESET} ${report.liqUsd === null ? "?" : `$${fmt(report.liqUsd)}`}` +
      `  ${DIM}age${RESET} ${report.pairAgeHours === null ? "?" : `${report.pairAgeHours.toFixed(0)}h`}\n`
  );

  for (const check of report.checks) {
    const mark =
      check.status === "pass"
        ? `${GREEN}PASS${RESET}`
        : check.status === "fail"
          ? `${RED}FAIL${RESET}`
          : `${YELLOW}MANUAL${RESET}`;
    console.log(`  ${mark.padEnd(16)} ${check.name.padEnd(22)} ${DIM}${check.detail}${RESET}`);
  }

  const verdict =
    report.verdict === "clear"
      ? `${GREEN}CLEAR${RESET}`
      : report.verdict === "blocked"
        ? `${RED}BLOCKED — do not enter${RESET}`
        : `${YELLOW}NEEDS MANUAL CHECKS${RESET}`;

  console.log(`\n  verdict: ${verdict}\n`);
}

async function cmdLog(args: string[]): Promise<void> {
  const kind = args[0] as EntryKind;
  if (kind !== "buy" && kind !== "sell" && kind !== "pass") {
    console.error("usage: assay log <buy|sell|pass> --chain <c> --address <a> [flags]");
    process.exitCode = 1;
    return;
  }

  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      chain: { type: "string" },
      address: { type: "string" },
      source: { type: "string", default: "self" },
      size: { type: "string" },
      linked: { type: "string" },
      thesis: { type: "string" },
      exit: { type: "string" },
      reason: { type: "string" },
    },
    allowPositionals: false,
  });

  if (!isChain(values.chain) || !values.address) {
    console.error("--chain and --address are required");
    process.exitCode = 1;
    return;
  }

  if (kind === "buy" && !values.exit) {
    console.error(
      `${RED}Refused.${RESET} A buy needs --exit. Write the ladder before you enter, not after.`
    );
    process.exitCode = 1;
    return;
  }

  const snapshot = summarise(await fetchPairs(values.chain, values.address));
  if (snapshot?.priceUsd == null) {
    console.error("No DEX pair found for that address — nothing to price the entry against.");
    process.exitCode = 1;
    return;
  }

  const existing = await readAll();
  const entry: Entry = {
    id: nextId(existing),
    ts: new Date().toISOString(),
    kind,
    chain: values.chain,
    address: values.address,
    symbol: snapshot.symbol,
    source: values.source ?? "self",
    priceUsd: snapshot.priceUsd,
    mcapUsd: snapshot.mcapUsd,
    liqUsd: snapshot.liqUsd,
    solPriceUsd: await fetchSolPrice(),
    sizeUsd: values.size ? Number(values.size) : null,
    linkedTo: values.linked ?? null,
    thesis: values.thesis ?? null,
    exitPlan: values.exit ?? null,
    passReason: values.reason ?? null,
    verdict: null,
  };

  await append(entry);
  console.log(
    `${GREEN}logged${RESET} ${entry.id}  ${kind} ${entry.symbol} @ $${entry.priceUsd.toPrecision(4)}` +
      `${entry.sizeUsd ? ` — $${entry.sizeUsd}` : ""}  ${DIM}${dataPath()}${RESET}`
  );
}

async function cmdReview(): Promise<void> {
  const entries = await readAll();
  const calls = entries.filter((e) => e.kind === "buy" || e.kind === "pass");

  if (calls.length === 0) {
    console.log("Nothing logged yet.");
    return;
  }

  console.log(`\n${BOLD}Forward return since logged${RESET}\n`);
  console.log(
    `  ${DIM}${"id".padEnd(6)}${"kind".padEnd(6)}${"symbol".padEnd(12)}${"source".padEnd(18)}${"return".padStart(10)}${RESET}`
  );

  const { fetchPrice } = await import("./dexscreener.ts");
  const cache = new Map<string, number | null>();

  for (const call of calls) {
    const key = `${call.chain}:${call.address}`;
    if (!cache.has(key)) cache.set(key, await fetchPrice(call.chain, call.address));
    const now = cache.get(key) ?? null;
    const ret = now && call.priceUsd > 0 ? (now / call.priceUsd - 1) * 100 : null;
    const color = ret === null ? DIM : ret > 0 ? GREEN : RED;
    const text = ret === null ? "—" : `${ret > 0 ? "+" : ""}${ret.toFixed(1)}%`;

    console.log(
      `  ${call.id.padEnd(6)}${call.kind.padEnd(6)}${call.symbol.slice(0, 11).padEnd(12)}` +
        `${call.source.slice(0, 17).padEnd(18)}${color}${text.padStart(10)}${RESET}`
    );
  }

  const missed = calls.filter((c) => c.kind === "pass");
  if (missed.length > 0) {
    console.log(
      `\n  ${DIM}${missed.length} pass${missed.length === 1 ? "" : "es"} above. The ones that ran are your most expensive data.${RESET}\n`
    );
  }
}

async function cmdStats(): Promise<void> {
  const entries = await readAll();
  if (entries.length === 0) {
    console.log("Nothing logged yet.");
    return;
  }

  const s = await buildSummary(entries);
  const sign = (n: number) => (n > 0 ? "+" : "");
  const color = (n: number) => (n > 0 ? GREEN : n < 0 ? RED : DIM);

  console.log(`\n${BOLD}Book${RESET}\n`);
  console.log(`  positions      ${s.buys} taken, ${s.passes} passed`);
  console.log(`  status         ${s.closed} closed, ${s.open} open`);
  console.log(`  hit rate       ${s.hitRate.toFixed(0)}% (${s.wins}/${s.buys} above entry)`);

  console.log(`\n${BOLD}Money${RESET}\n`);
  console.log(`  deployed       $${s.deployedUsd.toFixed(2)}`);
  console.log(`  realized       $${s.realizedUsd.toFixed(2)}`);
  console.log(`  unrealized     $${s.unrealizedUsd.toFixed(2)}`);
  console.log(`  fees (1%)      ${RED}-$${s.feesUsd.toFixed(2)}${RESET}`);
  console.log(
    `  ${BOLD}net${RESET}            ${color(s.netUsd)}${sign(s.netUsd)}$${s.netUsd.toFixed(2)} (${sign(s.netPercent)}${s.netPercent.toFixed(1)}%)${RESET}`
  );

  console.log(`\n${BOLD}Versus holding SOL${RESET}\n`);
  console.log(
    `  same capital   $${s.benchmarkUsd.toFixed(2)} (${sign(s.benchmarkPercent)}${s.benchmarkPercent.toFixed(1)}%)`
  );
  console.log(
    `  ${BOLD}edge${RESET}           ${color(s.edgeVsBenchmark)}${sign(s.edgeVsBenchmark)}${s.edgeVsBenchmark.toFixed(1)} points${RESET}`
  );

  if (s.edgeVsBenchmark <= 0 && s.closed >= 5) {
    console.log(
      `\n  ${YELLOW}You are behind the benchmark. That is the finding, not a reason to size up.${RESET}`
    );
  }
  console.log();
}

async function cmdCallers(): Promise<void> {
  const entries = await readAll();
  const scores = await scoreCallers(entries);

  if (scores.length === 0) {
    console.log("No scored calls yet — log some entries with --source.");
    return;
  }

  console.log(`\n${BOLD}Caller scores${RESET} ${DIM}(ranked by median return)${RESET}\n`);
  console.log(
    `  ${DIM}${"source".padEnd(20)}${"calls".padStart(6)}${"taken".padStart(7)}${"hit%".padStart(7)}${"median".padStart(10)}${"best".padStart(10)}${RESET}`
  );

  for (const s of scores) {
    const color = s.medianReturn > 0 ? GREEN : RED;
    console.log(
      `  ${s.source.slice(0, 19).padEnd(20)}${String(s.calls).padStart(6)}${String(s.taken).padStart(7)}` +
        `${s.hitRate.toFixed(0).padStart(7)}${color}${`${s.medianReturn > 0 ? "+" : ""}${s.medianReturn.toFixed(0)}%`.padStart(10)}${RESET}` +
        `${`+${s.bestReturn.toFixed(0)}%`.padStart(10)}`
    );
  }

  console.log(
    `\n  ${DIM}Under ~20 calls this is noise. Keep logging before you act on it.${RESET}\n`
  );
}


async function cmdHold(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      cost: { type: "string" },
      avg: { type: "string" },
      add: { type: "string" },
      venue: { type: "string" },
    },
    allowPositionals: true,
  });

  const asset = positionals[0];

  if (!asset) {
    const holdings = await readHoldings();
    if (holdings.length === 0) {
      console.log("Nothing held yet. usage: assay hold <BTC|solana:ADDR> <amount> [--cost N]");
      return;
    }
    console.log(`\n${BOLD}Holdings${RESET} ${DIM}${holdingsPath()}${RESET}\n`);
    for (const h of holdings) {
      const basis = h.costUsd === null ? `${DIM}no cost basis${RESET}` : `$${h.costUsd.toFixed(2)}`;
      console.log(
        `  ${h.asset.slice(0, 18).padEnd(19)}${String(h.amount).padStart(14)}` +
          `${basis.padStart(24)}  ${DIM}${h.venue}${RESET}`
      );
    }
    console.log();
    return;
  }

  if (!parseAsset(asset)) {
    console.error(`Cannot parse "${asset}". Use a ticker like BTC, or solana:<address>.`);
    process.exitCode = 1;
    return;
  }

  const adding = values.add !== undefined;
  const amount = Number(adding ? values.add : positionals[1]);
  if (!Number.isFinite(amount)) {
    console.error(adding ? "--add needs a number" : "amount must be a number");
    process.exitCode = 1;
    return;
  }

  if (values.cost !== undefined && values.avg !== undefined) {
    console.error("Use --cost (total paid) or --avg (per unit), not both.");
    process.exitCode = 1;
    return;
  }

  let costUsd: number | null = null;
  if (values.cost !== undefined) costUsd = Number(values.cost);
  else if (values.avg !== undefined) costUsd = Number(values.avg) * amount;
  if (costUsd !== null && !Number.isFinite(costUsd)) {
    console.error("cost must be a number");
    process.exitCode = 1;
    return;
  }

  const input = { asset, amount, costUsd, venue: values.venue ?? null };
  const saved = adding ? await addToHolding(input) : await setHolding(input);

  if (!saved) {
    console.log(`${YELLOW}removed${RESET} ${asset}`);
    return;
  }

  const avg = saved.costUsd === null ? null : saved.costUsd / saved.amount;
  console.log(
    `${GREEN}${adding ? "added" : "held"}${RESET} ${saved.asset} ${saved.amount}` +
      (avg === null
        ? `  ${DIM}no cost basis${RESET}`
        : `  ${DIM}avg $${avg.toPrecision(6)} · basis $${saved.costUsd?.toFixed(2)}${RESET}`)
  );
}

async function cmdWatch(): Promise<void> {
  const [entries, holdings] = await Promise.all([readAll(), readHoldings()]);
  const buys = entries.filter((e) => e.kind === "buy");
  const sells = entries.filter((e) => e.kind === "sell");

  const refs: AssetRef[] = holdings.map((h) => h.ref);
  for (const b of buys) refs.push({ kind: "token", chain: b.chain, address: b.address });
  if (refs.length === 0) {
    console.log("Nothing to watch. Add holdings with `assay hold`, or log a buy.");
    return;
  }

  const quotes = await quoteAll(refs);
  const actions: string[] = [];

  if (holdings.length > 0) {
    const rows = holdings.map((h) => {
      const q = quotes.get(assetKey(h.ref));
      const value = q?.priceUsd == null ? null : q.priceUsd * h.amount;
      const pnl = value === null || h.costUsd === null ? null : value - h.costUsd;
      return { h, q, value, pnl };
    });

    const total = rows.reduce((sum, r) => sum + (r.value ?? 0), 0);
    const priced = rows.filter((r) => r.pnl !== null);
    const cost = priced.reduce((sum, r) => sum + (r.h.costUsd ?? 0), 0);
    const pnl = priced.reduce((sum, r) => sum + (r.pnl ?? 0), 0);

    let head = `\n${BOLD}Portfolio${RESET}   ${BOLD}$${total.toFixed(2)}${RESET}`;
    if (priced.length > 0 && cost > 0) {
      const pct = (pnl / cost) * 100;
      const col = pnl >= 0 ? GREEN : RED;
      head +=
        `   ${DIM}cost $${cost.toFixed(2)}${RESET}   ` +
        `${col}${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toFixed(2)} ` +
        `(${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)${RESET}`;
      if (priced.length < rows.length) {
        head += `  ${DIM}· ${rows.length - priced.length} without basis${RESET}`;
      }
    }
    console.log(`${head}\n`);

    console.log(
      `  ${DIM}${"asset".padEnd(13)}${"amount".padStart(13)}${"value".padStart(11)}` +
        `${"alloc".padStart(8)}${"24h".padStart(8)}${"p&l".padStart(12)}${"".padStart(9)}${RESET}`
    );

    for (const { h, q, value, pnl: rowPnl } of rows.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))) {
      const alloc = total > 0 && value !== null ? (value / total) * 100 : 0;
      const ch = q?.change24h ?? null;
      const chCol = ch === null ? DIM : ch >= 0 ? GREEN : RED;
      const chTxt = ch === null ? "—" : `${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%`;

      let pnlTxt = `${DIM}${"—".padStart(12)}${"—".padStart(9)}${RESET}`;
      if (rowPnl !== null && h.costUsd) {
        const rowPct = (rowPnl / h.costUsd) * 100;
        const col = rowPnl >= 0 ? GREEN : RED;
        pnlTxt =
          `${col}${`${rowPnl >= 0 ? "+" : "-"}$${Math.abs(rowPnl).toFixed(2)}`.padStart(12)}` +
          `${`${rowPct >= 0 ? "+" : ""}${rowPct.toFixed(1)}%`.padStart(9)}${RESET}`;
      }

      console.log(
        `  ${h.asset.slice(0, 12).padEnd(13)}${String(h.amount).padStart(13)}` +
          `${(value === null ? "—" : `$${value.toFixed(2)}`).padStart(11)}` +
          `${`${alloc.toFixed(1)}%`.padStart(8)}${chCol}${chTxt.padStart(8)}${RESET}${pnlTxt}`
      );
    }
  }

  const open: string[] = [];
  for (const buy of buys) {
    const q = quotes.get(`${buy.chain}:${buy.address}`);
    if (q?.priceUsd == null || buy.priceUsd <= 0) continue;

    const multiple = q.priceUsd / buy.priceUsd;
    const size = buy.sizeUsd ?? 0;
    const linked = sells.filter((s) => s.linkedTo === buy.id);
    const soldPercent = size > 0
      ? Math.min(100, linked.reduce((sum, s) => sum + (s.sizeUsd ?? 0), 0) / size * 100)
      : 0;
    if (soldPercent >= 99) continue;

    const hours = (Date.now() - new Date(buy.ts).getTime()) / 3_600_000;
    const ladder = parseLadder(buy.exitPlan);
    const mCol = multiple >= 1 ? GREEN : RED;

    let note = `${DIM}no ladder recorded${RESET}`;
    if (ladder) {
      const st = ladderState(ladder, multiple, soldPercent);
      if (st.dueNow.length > 0) {
        const pct = st.dueNow.reduce((s, r) => s + r.sellPercent, 0);
        note = `${RED}SELL ${pct}%${RESET} ${DIM}— past ${st.dueNow.map((r) => `${r.atMultiple}x`).join(", ")}${RESET}`;
        actions.push(`${buy.symbol} is at ${multiple.toFixed(2)}x — your ladder says sell ${pct}% now.`);
      } else if (st.next) {
        note = `${DIM}next: ${st.next.sellPercent}% at ${st.next.atMultiple}x${RESET}`;
      } else {
        note = `${DIM}ladder cleared, trailing${RESET}`;
      }
    }

    if (hours > 72) {
      actions.push(`${buy.symbol} held ${hours.toFixed(0)}h — 72h time stop. Exit regardless of price.`);
    } else if (hours > 24 && Math.abs(multiple - 1) < 0.1) {
      actions.push(`${buy.symbol} flat at ${multiple.toFixed(2)}x after ${hours.toFixed(0)}h — 24h time stop.`);
    }

    open.push(
      `  ${buy.id}  ${buy.symbol.slice(0, 11).padEnd(12)}${mCol}${`${multiple.toFixed(2)}x`.padStart(7)}${RESET}` +
        `${`$${(size * multiple).toFixed(0)}`.padStart(8)}${`${hours.toFixed(0)}h`.padStart(6)}` +
        `${soldPercent > 0 ? `  ${DIM}${soldPercent.toFixed(0)}% out${RESET}` : "        "}  ${note}`
    );
  }

  if (open.length > 0) {
    console.log(`\n${BOLD}Open positions${RESET}\n`);
    console.log(`  ${DIM}${"id".padEnd(6)}${"token".padEnd(12)}${"mult".padStart(7)}${"value".padStart(8)}${"held".padStart(6)}${RESET}`);
    for (const line of open) console.log(line);
  }

  console.log();
  if (actions.length === 0) {
    console.log(`  ${GREEN}Nothing needs action.${RESET} ${DIM}Close the terminal.${RESET}\n`);
  } else {
    console.log(`  ${BOLD}${RED}Action needed${RESET}\n`);
    for (const a of actions) console.log(`  ${RED}·${RESET} ${a}`);
    console.log();
  }
}

function isChain(value: unknown): value is Chain {
  return value === "solana" || value === "base";
}

await main();
