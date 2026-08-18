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

export type CpcvMetric = "sharpe" | "total_return";

export interface CpcvResult {
  pbo: number;                 // fraction of splits where IS-best is below OOS median
  metric: CpcvMetric;          // which ranking drives `pbo`
  pboBySharpe: number;         // PBO when configs are ranked risk-adjusted
  pboByTotalReturn: number;    // PBO when configs are ranked on raw block return
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
 * Slice an equity curve into N blocks of DAILY returns (not block totals).
 *
 * Canonical CSCV computes its performance metric over the underlying return
 * series inside each sub-sample, which is what makes a Sharpe estimate
 * meaningful. Estimating Sharpe from N block aggregates instead gives you
 * 3-4 observations per sub-sample: the resulting ratio is so noisy that a
 * near-constant series can score astronomically well by accident. Slice to
 * dailies and the same sub-sample carries hundreds of observations.
 */
export function sliceEquityIntoBlockDailyReturns(
  curve: Array<{ date: string; value: number }>,
  numBlocks: number
): number[][] {
  const byDay = new Map<string, number>();
  for (const p of curve) byDay.set(p.date.slice(0, 10), p.value);
  const values = Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, v]) => v);
  if (values.length < numBlocks + 1) return [];

  const blocks: number[][] = [];
  const size = values.length / numBlocks;
  for (let b = 0; b < numBlocks; b++) {
    const start = Math.floor(b * size);
    const end = b === numBlocks - 1 ? values.length - 1 : Math.floor((b + 1) * size);
    const rets: number[] = [];
    for (let i = start + 1; i <= end; i++) {
      const prev = values[i - 1];
      rets.push(prev !== 0 ? values[i] / prev - 1 : 0);
    }
    blocks.push(rets);
  }
  return blocks;
}

/**
 * CPCV/PBO from a per-combo per-block return matrix.
 * matrix[combo][block] = that combo's total return over that block.
 *
 * Two rankings are always computed, because "which config is best in-sample"
 * has two defensible answers and they can disagree sharply:
 *
 *   - "sharpe"       — mean/stdev of the block returns. Canonical CSCV
 *                      (Bailey & Lopez de Prado rank by Sharpe), and it
 *                      matches how this factory actually selects: every goal
 *                      in the pipeline is risk-adjusted (ret/DD bars).
 *   - "total_return" — mean block return. Ignores dispersion entirely, so it
 *                      can crown a config no researcher would pick.
 *
 * The disagreement is not hypothetical. On candidate 025 the raw-return
 * ranking favoured a configuration carrying a 29.5% drawdown over one at
 * 14.0% — the gate was answering a question the goals never asked.
 *
 * `metric` selects which ranking drives `pbo`; both are always reported.
 */
export function computeCpcv(
  matrix: number[][],
  opts: {
    embargo?: number;
    maxSplits?: number;
    metric?: CpcvMetric;
    /** combo x block x daily returns. When supplied, the risk-adjusted
     *  ranking is computed over pooled daily returns (canonical CSCV)
     *  instead of over block aggregates. */
    blockDailyReturns?: number[][][];
  } = {}
): CpcvResult {
  const M = matrix.length;        // parameter combos
  const N = matrix[0]?.length ?? 0; // time blocks
  if (M < 2) throw new Error("CPCV needs at least 2 parameter configurations");
  if (N < 4 || N % 2 !== 0) throw new Error("CPCV needs an even number of blocks >= 4");
  if (!matrix.every((row) => row.length === N)) throw new Error("ragged matrix");

  const embargo = opts.embargo ?? 1;
  const maxSplits = opts.maxSplits ?? 1000;
  const metric: CpcvMetric = opts.metric ?? "sharpe";
  const half = N / 2;
  const splits = combinations(N, half).slice(0, maxSplits);

  const mean = (row: number[], idx: number[]) =>
    idx.reduce((s, j) => s + row[j], 0) / idx.length;

  // Risk-adjusted score, preferring pooled daily returns when the caller
  // supplied them. The epsilon keeps degenerate constant series well-defined:
  // stdev 0 leaves mean/(0+eps) monotone in the mean, so ranking degrades to
  // the raw-return ordering rather than producing NaN.
  const daily = opts.blockDailyReturns;
  const ratio = (xs: number[]) => {
    if (xs.length < 2) return xs.length ? xs[0] : 0;
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
    return m / (Math.sqrt(v) + 1e-9);
  };
  const sharpe = (rowIdx: number, idx: number[]) => {
    if (daily) {
      const pooled: number[] = [];
      for (const j of idx) pooled.push(...daily[rowIdx][j]);
      return ratio(pooled);
    }
    return ratio(idx.map((j) => matrix[rowIdx][j]));
  };

  // One accumulator per ranking; both share the same splits and the same
  // purge/embargo, so they are directly comparable.
  const acc = {
    sharpe: { overfit: 0, loss: 0, logits: [] as number[] },
    total_return: { overfit: 0, loss: 0, logits: [] as number[] },
  };
  let evaluatedSplits = 0;

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
    evaluatedSplits++;

    for (const key of ["sharpe", "total_return"] as const) {
      const score = (i: number, idx: number[]) =>
        key === "sharpe" ? sharpe(i, idx) : mean(matrix[i], idx);
      const isPerf = matrix.map((_, i) => score(i, isBlocks));
      const oosPerf = matrix.map((_, i) => score(i, oos));

      // IS-best config
      let best = 0;
      for (let n = 1; n < M; n++) if (isPerf[n] > isPerf[best]) best = n;

      // OOS rank of the IS-best (1 = worst … M = best), relative rank ω.
      const sortedOOS = [...oosPerf].sort((a, b) => a - b);
      const rank = sortedOOS.indexOf(oosPerf[best]) + 1; // 1..M
      const omega = rank / (M + 1);
      const logit = Math.log(omega / (1 - omega));
      acc[key].logits.push(logit);

      // IS-best in the bottom OOS half. An odd number of configurations always
      // admits an exact-median rank (omega = 0.5, logit = 0); that is neutral,
      // not overfit. Counting it as overfit biases PBO upward — measurably so:
      // on pure noise it pushed M=3 to 0.67 and M=5 to 0.61 against a true 0.50,
      // while even M was unbiased. Split the tie instead.
      if (logit < 0) acc[key].overfit += 1;
      else if (logit === 0) acc[key].overfit += 0.5;

      // Loss is always measured on realised return, never on the ranking
      // score — a Sharpe-ranked winner still either made money or did not.
      if (mean(matrix[best], oos) < 0) acc[key].loss++;
    }
  }

  const evaluated = evaluatedSplits || 1;
  const pboOf = (k: CpcvMetric) => acc[k].overfit / evaluated;
  const primary = acc[metric];
  const sortedLogits = [...primary.logits].sort((a, b) => a - b);
  const medianLogit = sortedLogits.length
    ? sortedLogits[Math.floor(sortedLogits.length / 2)]
    : 0;

  return {
    pbo: pboOf(metric),
    metric,
    pboBySharpe: pboOf("sharpe"),
    pboByTotalReturn: pboOf("total_return"),
    numBlocks: N,
    numCombos: M,
    numSplits: evaluated,
    // López de Prado path count φ(N,k) = C(N,k)·k / N
    numPaths: Math.round((splits.length * half) / N),
    medianLogit,
    probLossOOS: primary.loss / evaluated,
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
  // Surface the other ranking whenever the two disagree about the threshold.
  // A strategy that looks robust on raw return but overfit risk-adjusted (or
  // vice versa) is telling you something the headline number hides.
  const alt = result.metric === "sharpe" ? result.pboByTotalReturn : result.pboBySharpe;
  const altName = result.metric === "sharpe" ? "raw-return" : "risk-adjusted";
  const disagree = (result.pbo >= CPCV_PBO_FAIL) !== (alt >= CPCV_PBO_FAIL);
  const altNote = disagree
    ? ` NOTE: the ${altName} ranking disagrees (PBO ${alt.toFixed(2)}) — treat this verdict as unsettled.`
    : "";

  if (result.pbo >= CPCV_PBO_FAIL) {
    return {
      verdict: "fail",
      reason:
        `PBO ${result.pbo.toFixed(2)} ≥ ${CPCV_PBO_FAIL} (${result.metric} ranking): across ` +
        `${result.numSplits} combinatorial splits the IS-optimal configuration lands below the ` +
        `OOS median more often than not — overfit.${altNote}`,
      metrics: result,
    };
  }
  const strong = result.pbo < CPCV_PBO_STRONG;
  return {
    verdict: "pass",
    reason:
      `PBO ${result.pbo.toFixed(2)} < ${CPCV_PBO_FAIL}${strong ? " (strong)" : ""} ` +
      `(${result.metric} ranking): the IS-optimal configuration generalizes OOS across ` +
      `${result.numPaths} paths. P(OOS loss) ${(result.probLossOOS * 100).toFixed(0)}%.${altNote}`,
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
  const blockDailyReturns: number[][][] = [];
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
    blockDailyReturns.push(sliceEquityIntoBlockDailyReturns(res.equityCurve, numBlocks));
  }

  const result = computeCpcv(matrix, { embargo, blockDailyReturns });
  return { result, verdict: cpcvVerdict(result) };
}
