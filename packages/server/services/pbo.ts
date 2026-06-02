// ─────────────────────────────────────────────────────────────
//  Probability of Backtest Overfitting (PBO) — CSCV method
//  Bailey, Borwein, Lopez de Prado, Zhu (2014)
//  "The Probability of Backtest Overfitting"
// ─────────────────────────────────────────────────────────────
//
//  IMPORTANT: The live route always returns cannot_evaluate.
//  The computation is implemented for unit testing only.
//  PBO requires a full M×S performance matrix from real runs.
// ─────────────────────────────────────────────────────────────

export interface PBOResult {
  verdict: "cannot_evaluate";
  reason: string;
  pbo?: number;
}

export interface PBOMatrixResult {
  pbo: number;
  numCombinations: number;
  details: Array<{ isBestOOSRank: number; numStrategies: number }>;
}

// All (n choose k) combinations of indices
function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  const combo: number[] = [];
  function helper(start: number) {
    if (combo.length === k) { result.push([...combo]); return; }
    for (let i = start; i < n; i++) {
      combo.push(i);
      helper(i + 1);
      combo.pop();
    }
  }
  helper(0);
  return result;
}

// Rank of target value in array (1 = best/highest, ascending = lower rank is better)
// Returns 1-indexed rank from highest to lowest
function rankDescending(values: number[], targetIdx: number): number {
  const sorted = [...values].sort((a, b) => b - a);
  return sorted.indexOf(values[targetIdx]) + 1;
}

/**
 * Compute PBO from an M×S performance matrix.
 * matrix[strategy][slice] = performance value
 *
 * Uses all (S choose S/2) combinatorial IS/OOS partitions.
 * Caps at 100 combinations for performance.
 *
 * @returns pbo in [0,1]: fraction of splits where IS-best is below OOS median.
 */
export function computePBO(matrix: number[][]): PBOMatrixResult {
  const M = matrix.length;     // number of strategies
  const S = matrix[0].length;  // number of time slices
  if (M < 2 || S < 2) throw new Error("Matrix must be at least 2×2");
  if (S % 2 !== 0) throw new Error("S (number of slices) must be even for equal IS/OOS split");

  const halfS = S / 2;
  const allCombos = combinations(S, halfS);
  const usedCombos = allCombos.slice(0, 100); // cap for performance

  let overfitCount = 0;
  const details: Array<{ isBestOOSRank: number; numStrategies: number }> = [];

  for (const isSlices of usedCombos) {
    const ooSlices = Array.from({ length: S }, (_, i) => i).filter(i => !isSlices.includes(i));

    // IS performance per strategy = mean over IS slices
    const isPerf = matrix.map(strat => isSlices.reduce((s, j) => s + strat[j], 0) / isSlices.length);
    // OOS performance per strategy = mean over OOS slices
    const oosPerf = matrix.map(strat => ooSlices.reduce((s, j) => s + strat[j], 0) / ooSlices.length);

    // IS-best strategy (highest IS performance)
    const isBestIdx = isPerf.indexOf(Math.max(...isPerf));
    // OOS rank of IS-best (1 = highest OOS, M = lowest)
    const oosRank = rankDescending(oosPerf, isBestIdx);

    details.push({ isBestOOSRank: oosRank, numStrategies: M });

    // Overfit = IS-best ranks below OOS median
    if (oosRank > M / 2) overfitCount++;
  }

  return {
    pbo: overfitCount / usedCombos.length,
    numCombinations: usedCombos.length,
    details,
  };
}

/**
 * Walk-Forward Efficiency (WFE) = OOS / IS performance ratio.
 * A WFE close to 1.0 indicates good out-of-sample generalization.
 * WFE < 0.5 is generally considered poor.
 *
 * Both inputs are pre-computed by a real backtest engine.
 * This function is for unit testing only; the live route scaffolds
 * to cannot_evaluate until a real per-window runner exists.
 */
export function computeWFE(isPerformance: number, oosPerformance: number): number {
  if (isPerformance === 0) return 0;
  return oosPerformance / isPerformance;
}

/**
 * Live route response — always cannot_evaluate.
 */
export function walkForwardCannotEvaluate(): PBOResult {
  return {
    verdict: "cannot_evaluate",
    reason:
      "Walk-forward requires running the strategy across multiple windows on a real engine. " +
      "This gate will evaluate when a live backtest engine is connected and per-window results are available.",
  };
}

/**
 * PBO live route response — always cannot_evaluate.
 */
export function pboCannotEvaluate(): PBOResult {
  return {
    verdict: "cannot_evaluate",
    reason:
      "PBO requires a real performance matrix across configurations and time slices. " +
      "This gate will evaluate when per-configuration/per-slice results from a real backtest engine are available.",
  };
}
