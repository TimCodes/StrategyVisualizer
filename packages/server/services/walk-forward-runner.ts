import type {
  WalkForwardConfig,
  WfParameter,
  WfWindowResult,
  FitnessFunction,
  StrategyGoals,
} from "@shared/schema";
import { runLeanBacktest, type ParsedLeanResult } from "./lean-runner";
import { computePBO, computeWFE } from "./pbo";

// ─────────────────────────────────────────────────────────────
//  Davey Ch 13 — walk-forward analysis
//
//  All inputs (windows, fitness function, parameter grid) come
//  from a config that was locked BEFORE the run. Every IS window
//  is optimized over the full grid; the best combo runs over the
//  adjacent OOS window; OOS segments stitch into the curve the
//  gate judges. The full IS grid results feed CSCV/PBO.
// ─────────────────────────────────────────────────────────────

export interface WfWindow {
  index: number;
  isStart: string; // ISO date
  isEnd: string;
  oosStart: string;
  oosEnd: string;
}

const DAY_MS = 24 * 3600 * 1000;

function isoDate(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/** Slice the timeline into IS/OOS windows (Davey Fig 13.3). */
export function buildWindows(config: {
  startDate: string;
  inSampleDays: number;
  outOfSampleDays: number;
  anchored: boolean;
  numWindows: number;
}): WfWindow[] {
  const start = new Date(`${config.startDate}T00:00:00Z`).getTime();
  if (!isFinite(start)) throw new Error(`Invalid startDate: ${config.startDate}`);
  const windows: WfWindow[] = [];
  for (let i = 0; i < config.numWindows; i++) {
    // Unanchored: the IS window slides forward by one OOS period each step.
    // Anchored: IS always begins at startDate and grows.
    const isStart = config.anchored ? start : start + i * config.outOfSampleDays * DAY_MS;
    const isEnd = config.anchored
      ? start + (config.inSampleDays + i * config.outOfSampleDays) * DAY_MS
      : isStart + config.inSampleDays * DAY_MS;
    const oosStart = isEnd;
    const oosEnd = oosStart + config.outOfSampleDays * DAY_MS;
    windows.push({
      index: i,
      isStart: isoDate(isStart),
      isEnd: isoDate(isEnd),
      oosStart: isoDate(oosStart),
      oosEnd: isoDate(oosEnd),
    });
  }
  return windows;
}

/** Expand {name,min,max,step} definitions into every combination. */
export function expandParameterGrid(params: WfParameter[]): Record<string, number>[] {
  if (params.length === 0) return [{}];
  let combos: Record<string, number>[] = [{}];
  for (const p of params) {
    if (p.max < p.min) throw new Error(`Parameter ${p.name}: max < min`);
    const values: number[] = [];
    // Tolerate float steps without drifting past max
    for (let i = 0; ; i++) {
      const v = p.min + i * p.step;
      if (v > p.max + 1e-9) break;
      values.push(Number(v.toFixed(10)));
      if (values.length > 1000) throw new Error(`Parameter ${p.name}: grid too large (>1000 values)`);
    }
    const next: Record<string, number>[] = [];
    for (const c of combos) for (const v of values) next.push({ ...c, [p.name]: v });
    combos = next;
    if (combos.length > 5000) throw new Error("Parameter grid too large (>5000 combinations)");
  }
  return combos;
}

/** R² of a linear fit on the equity curve — 1.0 is a perfectly straight line. */
export function equityLinearity(curve: Array<{ value: number }>): number {
  const n = curve.length;
  if (n < 3) return 0;
  const xs = Array.from({ length: n }, (_, i) => i);
  const ys = curve.map((p) => p.value);
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return 0;
  return (sxy * sxy) / (sxx * syy);
}

/** Davey's three fitness functions (Ch 13). Higher is better for all. */
export function computeFitness(
  result: Pick<ParsedLeanResult, "totalReturn" | "maxDrawdown" | "equityCurve">,
  fn: FitnessFunction
): number {
  switch (fn) {
    case "net_profit":
      return result.totalReturn;
    case "return_on_account": {
      const dd = Math.abs(result.maxDrawdown);
      return dd > 0 ? result.totalReturn / dd : result.totalReturn;
    }
    case "equity_linearity": {
      // Linearity alone can select flat low-profit runs (Davey's caveat);
      // sign it by return so losing strategies never win the fitness race.
      const r2 = equityLinearity(result.equityCurve);
      return result.totalReturn >= 0 ? r2 : -r2;
    }
  }
}

/**
 * Chain OOS equity segments into one continuous curve by compounding
 * each segment's returns onto the running level (segments have
 * different absolute starting equities, so raw concatenation is wrong).
 */
export function stitchOOSCurves(
  segments: Array<Array<{ date: string; value: number }>>,
  initialValue = 100000
): Array<{ date: string; value: number }> {
  const out: Array<{ date: string; value: number }> = [];
  let level = initialValue;
  for (const seg of segments) {
    if (seg.length < 2) continue;
    const base = seg[0].value;
    if (base === 0) continue;
    for (let i = 1; i < seg.length; i++) {
      out.push({ date: seg[i].date, value: level * (seg[i].value / base) });
    }
    if (out.length > 0) level = out[out.length - 1].value;
  }
  return out;
}

function annualizedReturnPct(curve: Array<{ date: string; value: number }>): number | null {
  if (curve.length < 2) return null;
  const first = new Date(curve[0].date).getTime();
  const last = new Date(curve[curve.length - 1].date).getTime();
  const years = (last - first) / (365.25 * DAY_MS);
  if (!isFinite(years) || years <= 0) return null;
  const total = curve[curve.length - 1].value / curve[0].value - 1;
  return (Math.pow(1 + total, 1 / years) - 1) * 100;
}

function maxDrawdownPct(curve: Array<{ value: number }>): number {
  let peak = -Infinity;
  let maxDD = 0;
  for (const p of curve) {
    if (p.value > peak) peak = p.value;
    if (peak > 0) maxDD = Math.max(maxDD, (peak - p.value) / peak);
  }
  return maxDD * 100;
}

// ─────────────────────────────────────────────────────────────
//  Verdict
// ─────────────────────────────────────────────────────────────

export interface WalkForwardVerdict {
  verdict: "pass" | "fail" | "cannot_evaluate";
  reason: string;
  metrics: {
    wfe: number | null;
    pbo: number | null;
    windowsProfitable: number;
    windowsTotal: number;
    oosAnnualizedReturnPct: number | null;
    oosMaxDrawdownPct: number | null;
    oosRetDDRatio: number | null;
  };
}

export const WFE_PASS_THRESHOLD = 0.5;

export function computeWalkForwardVerdict(
  windows: WfWindowResult[],
  stitchedCurve: Array<{ date: string; value: number }>,
  goals: Pick<StrategyGoals, "minRetDDRatio" | "maxDrawdownPct" | "minAnnualReturnPct"> | undefined,
  pbo: number | null
): WalkForwardVerdict {
  const windowsTotal = windows.length;
  const windowsProfitable = windows.filter((w) => w.oosMetrics.totalReturn > 0).length;

  // WFE: average annualized OOS return relative to average annualized IS
  // return of the SELECTED parameters (Davey: walk-forward efficiency).
  const isAnn = windows
    .map((w) => annualizePeriodReturn(w.isMetrics.totalReturn, w.isStart, w.isEnd))
    .filter((v): v is number => v !== null);
  const oosAnn = windows
    .map((w) => annualizePeriodReturn(w.oosMetrics.totalReturn, w.oosStart, w.oosEnd))
    .filter((v): v is number => v !== null);
  let wfe: number | null = null;
  if (isAnn.length > 0 && oosAnn.length > 0) {
    const isAvg = isAnn.reduce((s, v) => s + v, 0) / isAnn.length;
    const oosAvg = oosAnn.reduce((s, v) => s + v, 0) / oosAnn.length;
    wfe = computeWFE(isAvg, oosAvg);
  }

  const oosAnnualized = annualizedReturnPct(stitchedCurve);
  const oosMaxDD = stitchedCurve.length >= 2 ? maxDrawdownPct(stitchedCurve) : null;
  const oosRetDD =
    oosAnnualized !== null && oosMaxDD !== null && oosMaxDD > 0
      ? oosAnnualized / oosMaxDD
      : null;

  const metrics = {
    wfe,
    pbo,
    windowsProfitable,
    windowsTotal,
    oosAnnualizedReturnPct: oosAnnualized,
    oosMaxDrawdownPct: oosMaxDD,
    oosRetDDRatio: oosRetDD,
  };

  if (windowsTotal === 0 || stitchedCurve.length < 2) {
    return {
      verdict: "cannot_evaluate",
      reason: "No completed walk-forward windows to evaluate.",
      metrics,
    };
  }

  const failures: string[] = [];
  if (wfe !== null && wfe < WFE_PASS_THRESHOLD) {
    failures.push(`walk-forward efficiency ${(wfe * 100).toFixed(0)}% < ${WFE_PASS_THRESHOLD * 100}%`);
  }
  if (windowsProfitable / windowsTotal < 0.5) {
    failures.push(`only ${windowsProfitable}/${windowsTotal} OOS windows profitable (<50%)`);
  }
  if (goals) {
    if (oosAnnualized !== null && oosAnnualized < goals.minAnnualReturnPct) {
      failures.push(
        `stitched OOS annualized ${oosAnnualized.toFixed(1)}% < goal ${goals.minAnnualReturnPct}%`
      );
    }
    if (oosMaxDD !== null && oosMaxDD > goals.maxDrawdownPct) {
      failures.push(`stitched OOS drawdown ${oosMaxDD.toFixed(1)}% > goal ${goals.maxDrawdownPct}%`);
    }
    if (oosRetDD !== null && oosRetDD < goals.minRetDDRatio) {
      failures.push(`stitched OOS ret/DD ${oosRetDD.toFixed(2)} < goal ${goals.minRetDDRatio}`);
    }
  }

  if (failures.length > 0) {
    return {
      verdict: "fail",
      reason: `Walk-forward failed: ${failures.join("; ")}.`,
      metrics,
    };
  }

  return {
    verdict: "pass",
    reason:
      `Walk-forward passed: WFE ${wfe !== null ? (wfe * 100).toFixed(0) + "%" : "n/a"}, ` +
      `${windowsProfitable}/${windowsTotal} OOS windows profitable, ` +
      `stitched OOS annualized ${oosAnnualized?.toFixed(1)}% with ${oosMaxDD?.toFixed(1)}% DD.`,
    metrics,
  };
}

function annualizePeriodReturn(totalReturnPct: number, start: string, end: string): number | null {
  const t0 = new Date(start).getTime();
  const t1 = new Date(end).getTime();
  const years = (t1 - t0) / (365.25 * DAY_MS);
  if (!isFinite(years) || years <= 0) return null;
  return (Math.pow(1 + totalReturnPct / 100, 1 / years) - 1) * 100;
}

/**
 * Assemble the CSCV/PBO matrix from per-window grid results:
 * rows = parameter combos, columns = windows (time slices).
 * computePBO requires an even number of columns ≥ 4 and ≥ 2 rows.
 */
export function tryComputePBO(windows: WfWindowResult[]): number | null {
  if (windows.length === 0) return null;
  const comboCount = windows[0].comboFitness.length;
  if (comboCount < 2) return null;
  if (windows.length < 4 || windows.length % 2 !== 0) return null;
  if (!windows.every((w) => w.comboFitness.length === comboCount)) return null;
  const matrix = Array.from({ length: comboCount }, (_, c) =>
    windows.map((w) => w.comboFitness[c])
  );
  try {
    return computePBO(matrix).pbo;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
//  Orchestrator — runs the actual LEAN backtests
// ─────────────────────────────────────────────────────────────

export interface WalkForwardProgress {
  phase: "optimizing" | "oos" | "stitching";
  windowIndex: number;
  windowsTotal: number;
  comboIndex?: number;
  combosTotal?: number;
  message: string;
}

export async function executeWalkForward({
  projectName,
  code,
  config,
  goals,
  onProgress,
}: {
  projectName: string;
  code: string;
  config: WalkForwardConfig & { startDate: string };
  goals?: Pick<StrategyGoals, "minRetDDRatio" | "maxDrawdownPct" | "minAnnualReturnPct">;
  onProgress?: (p: WalkForwardProgress) => void;
}): Promise<{
  windows: WfWindowResult[];
  stitchedCurve: Array<{ date: string; value: number }>;
  wfe: number | null;
  pbo: number | null;
  verdict: WalkForwardVerdict;
}> {
  const windows = buildWindows(config);
  const combos = expandParameterGrid(config.parameters ?? []);
  const windowResults: WfWindowResult[] = [];
  const oosSegments: Array<Array<{ date: string; value: number }>> = [];

  for (const w of windows) {
    // 1. Optimize: run every combo over the IS period
    let bestFitness = -Infinity;
    let bestParams: Record<string, number> = {};
    let bestIs: ParsedLeanResult | null = null;
    const comboFitness: number[] = [];

    for (let c = 0; c < combos.length; c++) {
      onProgress?.({
        phase: "optimizing",
        windowIndex: w.index,
        windowsTotal: windows.length,
        comboIndex: c,
        combosTotal: combos.length,
        message: `Window ${w.index + 1}/${windows.length}: IS ${w.isStart}→${w.isEnd}, combo ${c + 1}/${combos.length}`,
      });
      const result = await runLeanBacktest({
        projectName,
        code,
        parameters: { ...combos[c], wf_start: w.isStart, wf_end: w.isEnd },
      });
      const fitness = computeFitness(result, config.fitnessFunction);
      comboFitness.push(fitness);
      if (fitness > bestFitness) {
        bestFitness = fitness;
        bestParams = combos[c];
        bestIs = result;
      }
    }
    if (!bestIs) throw new Error(`Window ${w.index}: no IS results produced`);

    // 2. Apply the selected parameters to the adjacent OOS period
    onProgress?.({
      phase: "oos",
      windowIndex: w.index,
      windowsTotal: windows.length,
      message: `Window ${w.index + 1}/${windows.length}: OOS ${w.oosStart}→${w.oosEnd} with ${JSON.stringify(bestParams)}`,
    });
    const oosResult = await runLeanBacktest({
      projectName,
      code,
      parameters: { ...bestParams, wf_start: w.oosStart, wf_end: w.oosEnd },
    });
    oosSegments.push(oosResult.equityCurve);

    windowResults.push({
      index: w.index,
      isStart: w.isStart,
      isEnd: w.isEnd,
      oosStart: w.oosStart,
      oosEnd: w.oosEnd,
      bestParams,
      comboFitness,
      isMetrics: {
        totalReturn: bestIs.totalReturn,
        maxDrawdown: bestIs.maxDrawdown,
        sharpeRatio: bestIs.sharpeRatio,
        totalTrades: bestIs.totalTrades,
      },
      oosMetrics: {
        totalReturn: oosResult.totalReturn,
        maxDrawdown: oosResult.maxDrawdown,
        sharpeRatio: oosResult.sharpeRatio,
        totalTrades: oosResult.totalTrades,
      },
    });
  }

  onProgress?.({
    phase: "stitching",
    windowIndex: windows.length,
    windowsTotal: windows.length,
    message: "Stitching OOS segments and computing verdict",
  });
  const stitchedCurve = stitchOOSCurves(oosSegments);
  const pbo = tryComputePBO(windowResults);
  const verdict = computeWalkForwardVerdict(windowResults, stitchedCurve, goals, pbo);

  return { windows: windowResults, stitchedCurve, wfe: verdict.metrics.wfe, pbo, verdict };
}
