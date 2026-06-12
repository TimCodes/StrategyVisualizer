// ─────────────────────────────────────────────────────────────
//  Davey Ch 15 — diversification measurement
//
//  Combines strategies the way Davey does (Ch 19): by daily
//  dollar P&L, so days where only one system trades contribute
//  that system's P&L alone. Four checks: pairwise daily-return
//  correlation (full-history AND rolling max — uncorrelated
//  systems can correlate in a crisis), combined equity linearity,
//  combined max drawdown, and the deciding criterion: combined
//  Monte Carlo ret/DD + probability of profit, portfolio WITH the
//  candidate vs WITHOUT it (Table 15.3).
// ─────────────────────────────────────────────────────────────

import { simulateTrades } from "./position-sizing";
import { equityLinearity } from "./walk-forward-runner";

export interface NamedCurve {
  name: string;
  curve: Array<{ date: string; value: number }>;
}

/** date (YYYY-MM-DD) → dollar P&L for that day */
export function toDailyPnL(curve: Array<{ date: string; value: number }>): Map<string, number> {
  const out = new Map<string, number>();
  for (let i = 1; i < curve.length; i++) {
    const day = curve[i].date.slice(0, 10);
    out.set(day, (out.get(day) ?? 0) + (curve[i].value - curve[i - 1].value));
  }
  return out;
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** Paired observations on the dates both series traded. */
function pairedSeries(a: Map<string, number>, b: Map<string, number>): [number[], number[]] {
  const xs: number[] = [];
  const ys: number[] = [];
  const dates = Array.from(a.keys()).sort();
  for (const d of dates) {
    if (b.has(d)) {
      xs.push(a.get(d)!);
      ys.push(b.get(d)!);
    }
  }
  return [xs, ys];
}

export const MIN_OVERLAP_DAYS = 20;

export function correlation(a: Map<string, number>, b: Map<string, number>): number | null {
  const [xs, ys] = pairedSeries(a, b);
  if (xs.length < MIN_OVERLAP_DAYS) return null;
  return pearson(xs, ys);
}

/**
 * Highest correlation seen over any rolling window — Davey's warning that
 * "strategies that you assume are not correlated can suddenly become
 * correlated" (2008). A low full-history number can hide crisis clustering.
 */
export function rollingMaxCorrelation(
  a: Map<string, number>,
  b: Map<string, number>,
  windowDays = 126
): number | null {
  const [xs, ys] = pairedSeries(a, b);
  if (xs.length < MIN_OVERLAP_DAYS) return null;
  if (xs.length <= windowDays) return pearson(xs, ys);
  let max: number | null = null;
  for (let start = 0; start + windowDays <= xs.length; start += Math.max(1, Math.floor(windowDays / 4))) {
    const r = pearson(xs.slice(start, start + windowDays), ys.slice(start, start + windowDays));
    if (r !== null && (max === null || r > max)) max = r;
  }
  return max;
}

/** Sum daily P&L across systems (Davey Table 19.1) onto one calendar. */
export function combineDailyPnL(seriesList: Map<string, number>[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of seriesList) {
    for (const [d, pnl] of Array.from(s.entries())) {
      out.set(d, (out.get(d) ?? 0) + pnl);
    }
  }
  return new Map(Array.from(out.entries()).sort(([a], [b]) => (a < b ? -1 : 1)));
}

export function equityFromPnL(
  initial: number,
  pnlByDate: Map<string, number>
): Array<{ date: string; value: number }> {
  const curve: Array<{ date: string; value: number }> = [];
  let level = initial;
  const dates = Array.from(pnlByDate.keys()).sort();
  curve.push({ date: dates[0] ?? new Date().toISOString().slice(0, 10), value: initial });
  for (const d of dates) {
    level += pnlByDate.get(d)!;
    curve.push({ date: d, value: level });
  }
  return curve;
}

export function maxDrawdownPct(curve: Array<{ value: number }>): number {
  let peak = -Infinity;
  let maxDD = 0;
  for (const p of curve) {
    if (p.value > peak) peak = p.value;
    if (peak > 0) maxDD = Math.max(maxDD, (peak - p.value) / peak);
  }
  return maxDD * 100;
}

// ─────────────────────────────────────────────────────────────
//  Analysis + gate verdict
// ─────────────────────────────────────────────────────────────

export interface CurveStats {
  name: string;
  totalReturnPct: number;
  maxDrawdownPct: number;
  linearityR2: number;
}

export interface PortfolioMC {
  retDDRatio: number;
  probProfit: number;
  medianReturn: number;
  medianMaxDD: number;
}

export interface DiversificationResult {
  verdict: "pass" | "fail" | "cannot_evaluate";
  reason: string;
  metrics: {
    candidateCorrelations: Array<{
      name: string;
      fullHistory: number | null;
      rollingMax: number | null;
    }>;
    memberStats: CurveStats[];
    candidateStats: CurveStats;
    combinedWithout: CurveStats | null;
    combinedWith: CurveStats;
    mcWithout: PortfolioMC | null;
    mcWith: PortfolioMC | null;
    corrThreshold: number;
    retDDTolerance: number;
  } | null;
}

function curveStats(name: string, curve: Array<{ date: string; value: number }>): CurveStats {
  const totalReturnPct =
    curve.length >= 2 && curve[0].value !== 0
      ? (curve[curve.length - 1].value / curve[0].value - 1) * 100
      : 0;
  return {
    name,
    totalReturnPct,
    maxDrawdownPct: maxDrawdownPct(curve),
    linearityR2: equityLinearity(curve),
  };
}

function portfolioMC(pnl: Map<string, number>, initial: number): PortfolioMC | null {
  const dailyPnL = Array.from(pnl.values());
  if (dailyPnL.length < MIN_OVERLAP_DAYS) return null;
  // Resample daily P&L for one simulated year — same engine as trade-level
  // MC, with days standing in for trades.
  const sim = simulateTrades({
    trades: dailyPnL,
    startingEquity: initial,
    tradesPerYear: 252,
    iterations: 1000,
  });
  return {
    retDDRatio: sim.retDDRatio,
    probProfit: sim.probProfit,
    medianReturn: sim.medianReturn,
    medianMaxDD: sim.medianMaxDD,
  };
}

export interface DiversificationConfig {
  /** Candidate↔member full-history correlation above this fails (default 0.7) */
  corrThreshold?: number;
  /**
   * The combined ret/DD may shrink to this fraction of the without-candidate
   * ret/DD before failing (default 0.95 — "doesn't materially worsen").
   */
  retDDTolerance?: number;
}

export function analyzeDiversification(
  candidate: NamedCurve & { dataSource?: string },
  portfolio: Array<NamedCurve & { dataSource?: string }>,
  config: DiversificationConfig = {}
): DiversificationResult {
  const corrThreshold = config.corrThreshold ?? 0.7;
  const retDDTolerance = config.retDDTolerance ?? 0.95;

  if (candidate.curve.length < MIN_OVERLAP_DAYS) {
    return {
      verdict: "cannot_evaluate",
      reason: `Candidate equity curve has fewer than ${MIN_OVERLAP_DAYS} points.`,
      metrics: null,
    };
  }

  const candPnL = toDailyPnL(candidate.curve);
  const memberPnLs = portfolio.map((m) => toDailyPnL(m.curve));
  const candInitial = candidate.curve[0].value;
  const membersInitial = portfolio.reduce((s, m) => s + (m.curve[0]?.value ?? 0), 0);

  const candidateCorrelations = portfolio.map((m, i) => ({
    name: m.name,
    fullHistory: correlation(candPnL, memberPnLs[i]),
    rollingMax: rollingMaxCorrelation(candPnL, memberPnLs[i]),
  }));

  const candidateStats = curveStats(candidate.name, candidate.curve);
  const memberStats = portfolio.map((m) => curveStats(m.name, m.curve));

  const withoutPnL = portfolio.length > 0 ? combineDailyPnL(memberPnLs) : null;
  const withPnL = combineDailyPnL([...memberPnLs, candPnL]);
  const combinedWithout = withoutPnL
    ? curveStats("portfolio (without candidate)", equityFromPnL(membersInitial, withoutPnL))
    : null;
  const combinedWith = curveStats(
    "portfolio (with candidate)",
    equityFromPnL(membersInitial + candInitial, withPnL)
  );
  const mcWithout = withoutPnL ? portfolioMC(withoutPnL, membersInitial) : null;
  const mcWith = portfolioMC(withPnL, membersInitial + candInitial);

  const metrics = {
    candidateCorrelations,
    memberStats,
    candidateStats,
    combinedWithout,
    combinedWith,
    mcWithout,
    mcWith,
    corrThreshold,
    retDDTolerance,
  };

  // First strategy in the portfolio: nothing to diversify against.
  if (portfolio.length === 0) {
    return {
      verdict: "pass",
      reason:
        "First system in the portfolio — no correlation to measure. Diversification will be evaluated when the next candidate arrives.",
      metrics,
    };
  }

  const failures: string[] = [];
  for (const c of candidateCorrelations) {
    if (c.fullHistory === null) {
      return {
        verdict: "cannot_evaluate",
        reason: `Insufficient overlapping history with "${c.name}" (need ${MIN_OVERLAP_DAYS}+ shared trading days).`,
        metrics,
      };
    }
    if (c.fullHistory >= corrThreshold) {
      failures.push(
        `correlation with "${c.name}" ${c.fullHistory.toFixed(2)} ≥ ${corrThreshold} — not a diversifier`
      );
    }
  }

  if (mcWith && mcWithout) {
    // Tolerance scaling only makes sense for a profitable baseline; for a
    // losing portfolio the candidate must simply not make things worse.
    const floor =
      mcWithout.retDDRatio > 0
        ? mcWithout.retDDRatio * retDDTolerance
        : mcWithout.retDDRatio;
    if (mcWith.retDDRatio < floor) {
      failures.push(
        `combined ret/DD drops ${mcWithout.retDDRatio.toFixed(2)} → ${mcWith.retDDRatio.toFixed(2)} (worse than ${Math.round(retDDTolerance * 100)}% tolerance)`
      );
    }
  }

  if (failures.length > 0) {
    return {
      verdict: "fail",
      reason: `Adding this system does not diversify: ${failures.join("; ")}.`,
      metrics,
    };
  }

  const rollWarn = candidateCorrelations.filter(
    (c) => c.rollingMax !== null && c.rollingMax >= corrThreshold
  );
  const warnNote =
    rollWarn.length > 0
      ? ` Caution: rolling correlation with ${rollWarn.map((c) => `"${c.name}" peaks at ${c.rollingMax!.toFixed(2)}`).join(", ")} — diversification may vanish in a crisis.`
      : "";

  return {
    verdict: "pass",
    reason:
      `Diversifies the portfolio: max correlation ${Math.max(...candidateCorrelations.map((c) => c.fullHistory ?? 0)).toFixed(2)} < ${corrThreshold}` +
      (mcWith && mcWithout
        ? `, combined ret/DD ${mcWithout.retDDRatio.toFixed(2)} → ${mcWith.retDDRatio.toFixed(2)}, probability of profit ${(mcWithout.probProfit * 100).toFixed(0)}% → ${(mcWith.probProfit * 100).toFixed(0)}%.`
        : ".") +
      warnNote,
    metrics,
  };
}
