// ─────────────────────────────────────────────────────────────
//  Combinatorial Purged Cross-Validation (CPCV)
//  López de Prado, "Advances in Financial Machine Learning" (2018);
//  Bailey & López de Prado CSCV (2014).
//
//  Stronger than single-split walk-forward on both PBO and DSR: instead
//  of one train/test partition, it evaluates every combinatorial way to
//  split N time blocks into in-sample / out-of-sample halves, producing
//  many backtest PATHS from one set of runs.
//
//  Efficiency trick (the reason this is affordable): each parameter combo
//  is run ONCE over the full period and its equity curve is sliced into N
//  blocks. CSCV then asks, across all C(N, N/2) splits: if I pick the
//  IS-best combo, how often does it land below the OOS median? That
//  fraction is PBO. No per-split re-optimization needed.
//
//  Purging/embargo: when a block is OOS, the IS blocks immediately
//  adjacent to it are dropped from the IS performance estimate, so
//  serial correlation across the block boundary cannot leak.
// ─────────────────────────────────────────────────────────────

import type { WalkForwardConfig } from "@shared/schema";
import { runLeanBacktest } from "./lean-runner";
import { expandParameterGrid } from "./walk-forward-runner";

export interface CpcvResult {
  pbo: number;                 // fraction of splits where IS-best is below OOS median
  numBlocks: number;
  numCombos: number;           // parameter configurations
  numSplits: number;           // combinatorial IS/OOS partitions evaluated
  numPaths: number;            // distinct OOS backtest paths (López de Prado φ)
  medianLogit: number;         // >0 favors generalization, <0 favors overfit
  probLossOOS: number;         // P(OOS return of IS-best < 0)
  embargo: number;
}

/** All (n choose k) index combinations. */
function combinations(n: number, k: number): number[][] {
  const out: number[][] = [];
  const combo: number[] = [];
  (function rec(start: number) {
    if (combo.length === k) { out.push([...combo]); return; }
    for (let i = start; i < n; i++) { combo.push(i); rec(i + 1); combo.pop(); }
  })(0);
  return out;
}

/**
 * Slice a (possibly multi-point-per-day) equity curve into N contiguous
 * time blocks and return each block's total return. Blocks split by
 * position after collapsing to daily closes.
 */
export function sliceEquityIntoBlockReturns(
  curve: Array<{ date: string; value: number }>,
  numBlocks: number
): number[] {
  const byDay = new Map<string, number>();
  for (const p of curve) byDay.set(p.date.slice(0, 10), p.value);
  const values = Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, v]) => v);
  if (values.length < numBlocks + 1) return [];

  const returns: number[] = [];
  const size = values.length / numBlocks;
  for (let b = 0; b < numBlocks; b++) {
    const start = Math.floor(b * size);
    const end = b === numBlocks - 1 ? values.length - 1 : Math.floor((b + 1) * size);
    const v0 = values[start];
    const v1 = values[end];
    returns.push(v0 !== 0 ? v1 / v0 - 1 : 0);
  }
  return returns;
}

/**
 * CPCV/PBO from a per-combo per-block return matrix.
 * matrix[combo][block] = that combo's total return over that block.
 */
export function computeCpcv(
  matrix: number[][],
  opts: { embargo?: number; maxSplits?: number } = {}
): CpcvResult {
  const M = matrix.length;        // parameter combos
  const N = matrix[0]?.length ?? 0; // time blocks
  if (M < 2) throw new Error("CPCV needs at least 2 parameter configurations");
  if (N < 4 || N % 2 !== 0) throw new Error("CPCV needs an even number of blocks >= 4");
  if (!matrix.every((row) => row.length === N)) throw new Error("ragged matrix");

  const embargo = opts.embargo ?? 1;
  const maxSplits = opts.maxSplits ?? 1000;
  const half = N / 2;
  const splits = combinations(N, half).slice(0, maxSplits);

  let overfit = 0;
  let lossOOS = 0;
  const logits: number[] = [];

  for (const oos of splits) {
    const oosSet = new Set(oos);
    // Purge/embargo: drop IS blocks within `embargo` of any OOS block.
    const isBlocks: number[] = [];
    for (let b = 0; b < N; b++) {
      if (oosSet.has(b)) continue;
      let nearOOS = false;
      for (let d = 1; d <= embargo; d++) {
        if (oosSet.has(b - d) || oosSet.has(b + d)) { nearOOS = true; break; }
      }
      if (!nearOOS) isBlocks.push(b);
    }
    if (isBlocks.length === 0) continue; // fully purged — skip

    const meanOver = (row: number[], idx: number[]) =>
      idx.reduce((s, j) => s + row[j], 0) / idx.length;

    const isPerf = matrix.map((row) => meanOver(row, isBlocks));
    const oosPerf = matrix.map((row) => meanOver(row, oos));

    // IS-best config
    let best = 0;
    for (let n = 1; n < M; n++) if (isPerf[n] > isPerf[best]) best = n;

    // OOS rank of the IS-best (1 = worst … M = best), relative rank ω.
    const sortedOOS = [...oosPerf].sort((a, b) => a - b);
    const rank = sortedOOS.indexOf(oosPerf[best]) + 1; // 1..M
    const omega = rank / (M + 1);
    const logit = Math.log(omega / (1 - omega));
    logits.push(logit);

    // IS-best in the bottom OOS half. An odd number of configurations always
    // admits an exact-median rank (omega = 0.5, logit = 0); that is neutral,
    // not overfit. Counting it as overfit biases PBO upward — measurably so:
    // on pure noise it pushed M=3 to 0.67 and M=5 to 0.61 against a true 0.50,
    // while even M was unbiased. Split the tie instead.
    if (logit < 0) overfit += 1;
    else if (logit === 0) overfit += 0.5;
    if (oosPerf[best] < 0) lossOOS++;   // IS-best lost money OOS
  }

  const evaluated = logits.length || 1;
  logits.sort((a, b) => a - b);
  const medianLogit = logits.length
    ? logits[Math.floor(logits.length / 2)]
    : 0;

  return {
    pbo: overfit / evaluated,
    numBlocks: N,
    numCombos: M,
    numSplits: evaluated,
    // López de Prado path count φ(N,k) = C(N,k)·k / N
    numPaths: Math.round((splits.length * half) / N),
    medianLogit,
    probLossOOS: lossOOS / evaluated,
    embargo,
  };
}

export interface CpcvVerdict {
  verdict: "pass" | "fail" | "cannot_evaluate";
  reason: string;
  metrics: CpcvResult | null;
}

// PBO is a probability of backtest overfitting. Below 0.5 means the
// IS-optimal configuration generalizes OOS more often than not.
export const CPCV_PBO_FAIL = 0.5;
export const CPCV_PBO_STRONG = 0.2;

export function cpcvVerdict(result: CpcvResult): CpcvVerdict {
  if (result.pbo >= CPCV_PBO_FAIL) {
    return {
      verdict: "fail",
      reason:
        `PBO ${result.pbo.toFixed(2)} ≥ ${CPCV_PBO_FAIL}: across ${result.numSplits} combinatorial ` +
        `splits the IS-optimal configuration lands below the OOS median more often than not — overfit.`,
      metrics: result,
    };
  }
  const strong = result.pbo < CPCV_PBO_STRONG;
  return {
    verdict: "pass",
    reason:
      `PBO ${result.pbo.toFixed(2)} < ${CPCV_PBO_FAIL}${strong ? " (strong)" : ""}: the IS-optimal ` +
      `configuration generalizes OOS across ${result.numPaths} paths. ` +
      `P(OOS loss) ${(result.probLossOOS * 100).toFixed(0)}%.`,
    metrics: result,
  };
}

// ─────────────────────────────────────────────────────────────
//  Runner — one full-period backtest per parameter combo, sliced
//  into blocks. Reuses the walk-forward grid expansion and the
//  wf_start/wf_end contract. Cheap: G backtests, not G×windows.
// ─────────────────────────────────────────────────────────────

export interface CpcvProgress {
  comboIndex: number;
  combosTotal: number;
  message: string;
}

export async function executeCpcv({
  projectName,
  code,
  config,
  numBlocks,
  embargo,
  endDate = "2025-12-31",
  onProgress,
}: {
  projectName: string;
  code: string;
  config: WalkForwardConfig & { startDate: string };
  numBlocks: number;
  embargo?: number;
  endDate?: string;
  onProgress?: (p: CpcvProgress) => void;
}): Promise<{ result: CpcvResult; verdict: CpcvVerdict } | { error: string }> {
  const combos = expandParameterGrid(config.parameters ?? []);
  if (combos.length < 2) {
    return { error: "CPCV needs a parameter grid with at least 2 configurations." };
  }

  const matrix: number[][] = [];
  for (let c = 0; c < combos.length; c++) {
    onProgress?.({
      comboIndex: c,
      combosTotal: combos.length,
      message: `CPCV: combo ${c + 1}/${combos.length} over the full period`,
    });
    const res = await runLeanBacktest({
      projectName,
      code,
      parameters: { ...combos[c], wf_start: config.startDate, wf_end: endDate },
    });
    const blockReturns = sliceEquityIntoBlockReturns(res.equityCurve, numBlocks);
    if (blockReturns.length !== numBlocks) {
      return { error: `Combo ${c} produced an equity curve too short to slice into ${numBlocks} blocks.` };
    }
    matrix.push(blockReturns);
  }

  const result = computeCpcv(matrix, { embargo });
  return { result, verdict: cpcvVerdict(result) };
}
