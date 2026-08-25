export type Rung = { sellPercent: number; atMultiple: number };

export type Ladder = {
  rungs: Rung[];
  trailPercent: number | null;
  raw: string;
};

const RUNG = /(\d+(?:\.\d+)?)\s*%\s*(?:at|@|)\s*(\d+(?:\.\d+)?)\s*x/gi;
const TRAIL = /trail\D*(\d+(?:\.\d+)?)\s*%/i;

export function parseLadder(raw: string | null): Ladder | null {
  if (!raw) return null;

  const rungs: Rung[] = [];
  for (const m of raw.matchAll(RUNG)) {
    const sellPercent = Number(m[1]);
    const atMultiple = Number(m[2]);
    if (Number.isFinite(sellPercent) && Number.isFinite(atMultiple) && atMultiple > 0) {
      rungs.push({ sellPercent, atMultiple });
    }
  }

  const trail = TRAIL.exec(raw);

  if (rungs.length === 0 && !trail) return null;

  rungs.sort((a, b) => a.atMultiple - b.atMultiple);
  return { rungs, trailPercent: trail ? Number(trail[1]) : null, raw };
}

export type LadderState = {
  multiple: number;
  cleared: Rung[];
  next: Rung | null;
  soldPercent: number;
  dueNow: Rung[];
};

export function ladderState(ladder: Ladder, multiple: number, alreadySoldPercent: number): LadderState {
  const cleared = ladder.rungs.filter((r) => multiple >= r.atMultiple);
  const next = ladder.rungs.find((r) => multiple < r.atMultiple) ?? null;

  let cumulative = 0;
  const dueNow: Rung[] = [];
  for (const rung of cleared) {
    cumulative += rung.sellPercent;
    if (cumulative > alreadySoldPercent + 0.5) dueNow.push(rung);
  }

  return { multiple, cleared, next, soldPercent: alreadySoldPercent, dueNow };
}

export function describe(ladder: Ladder): string {
  const parts = ladder.rungs.map((r) => `${r.sellPercent}% @ ${r.atMultiple}x`);
  if (ladder.trailPercent !== null) parts.push(`trail ${ladder.trailPercent}%`);
  return parts.join(", ");
}
