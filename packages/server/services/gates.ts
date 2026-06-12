import { storage } from "../storage";
import type { LeanBacktest, GateResult } from "@shared/schema";

// ─────────────────────────────────────────────────────────────
//  Normal distribution helpers
// ─────────────────────────────────────────────────────────────

function normCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1.0 / (1.0 + p * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-(x * x) / 2);
  return 0.5 * (1.0 + sign * y);
}

// Rational approximation for qnorm (Peter Acklam algorithm)
function normInverse(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
              1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
              6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
              -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425, pHigh = 1 - pLow;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
             ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// ─────────────────────────────────────────────────────────────
//  Return series statistics
// ─────────────────────────────────────────────────────────────

export function buildReturns(equityCurve: { date: string; value: number }[]): number[] {
  if (equityCurve.length < 2) return [];
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].value;
    if (prev !== 0) returns.push((equityCurve[i].value - prev) / prev);
  }
  return returns;
}

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[], m?: number): number {
  const mu = m ?? mean(arr);
  const variance = arr.reduce((s, v) => s + (v - mu) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(Math.max(variance, 1e-12));
}

function skewness(arr: number[], m?: number, s?: number): number {
  const mu = m ?? mean(arr);
  const sigma = s ?? stdDev(arr, mu);
  const n = arr.length;
  return arr.reduce((acc, v) => acc + ((v - mu) / sigma) ** 3, 0) / n;
}

function kurtosis(arr: number[], m?: number, s?: number): number {
  const mu = m ?? mean(arr);
  const sigma = s ?? stdDev(arr, mu);
  const n = arr.length;
  return arr.reduce((acc, v) => acc + ((v - mu) / sigma) ** 4, 0) / n;
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ─────────────────────────────────────────────────────────────
//  assertEvaluable — shared guard for all gates
// ─────────────────────────────────────────────────────────────

export const SIMULATED_REASON =
  "Inputs are simulated; gate cannot validate a strategy. Connect a real backtest engine first.";

export function assertEvaluable(backtest: { dataSource?: string }): { ok: true } | { ok: false; reason: string } {
  if (backtest.dataSource !== "live_engine") {
    return { ok: false, reason: SIMULATED_REASON };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
//  A1 — Monte Carlo bootstrap + risk of ruin
// ─────────────────────────────────────────────────────────────

export interface MonteCarloConfig {
  iterations?: number;
  ruinThreshold?: number;
  passRetDDRatio?: number;
  passRiskOfRuin?: number;
}

export interface MonteCarloMetrics {
  medianReturn: number;
  medianMaxDD: number;
  medianRetDDRatio: number;
  riskOfRuin: number;
  percentiles: {
    return: { p5: number; p25: number; p50: number; p75: number; p95: number };
    maxDD: { p5: number; p25: number; p50: number; p75: number; p95: number };
    retDDRatio: { p5: number; p25: number; p50: number; p75: number; p95: number };
  };
  iterations: number;
  ruinThreshold: number;
  passThresholds: { retDDRatio: number; riskOfRuin: number };
}

export interface MonteCarloResult {
  verdict: "pass" | "fail" | "cannot_evaluate";
  reason?: string;
  metrics?: MonteCarloMetrics;
  dsr?: DeflatedSharpeResult;
}

function buildEquityPath(returns: number[], seed: number[]): { totalReturn: number; maxDrawdown: number } {
  let equity = 1.0;
  let peak = 1.0;
  let maxDD = 0;
  for (const r of seed) {
    equity *= (1 + r);
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return { totalReturn: equity - 1, maxDrawdown: maxDD };
}

function bootstrapSample<T>(arr: T[], rng: () => number): T[] {
  return Array.from({ length: arr.length }, () => arr[Math.floor(rng() * arr.length)]);
}

// Seeded PRNG (mulberry32) for reproducibility
function makePRNG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function computeMonteCarlo(
  backtest: LeanBacktest,
  config: MonteCarloConfig = {}
): MonteCarloResult {
  const guard = assertEvaluable(backtest);
  if (!guard.ok) {
    return { verdict: "cannot_evaluate", reason: guard.reason };
  }

  const {
    iterations = 2500,
    ruinThreshold = 0.5,
    passRetDDRatio = 2.0,
    passRiskOfRuin = 0.05,
  } = config;

  // Prefer per-trade P&L list (Davey-style); fall back to equity-curve returns
  let returns: number[];
  if (backtest.trades && backtest.trades.length >= 5) {
    const startingCapital = backtest.equityCurve[0]?.value ?? 100000;
    returns = backtest.trades.map((t) => t.profitLoss / startingCapital);
  } else {
    returns = buildReturns(backtest.equityCurve);
  }

  if (returns.length < 5) {
    return { verdict: "cannot_evaluate", reason: "Not enough data points for bootstrapping (need ≥ 5 trades or equity curve points)." };
  }

  const rng = makePRNG(42);
  const totalReturns: number[] = [];
  const maxDrawdowns: number[] = [];
  const retDDRatios: number[] = [];
  let ruinCount = 0;

  for (let i = 0; i < iterations; i++) {
    const sample = bootstrapSample(returns, rng);
    const { totalReturn, maxDrawdown } = buildEquityPath(returns, sample);
    totalReturns.push(totalReturn);
    maxDrawdowns.push(maxDrawdown);
    const ratio = maxDrawdown > 1e-6 ? totalReturn / maxDrawdown : (totalReturn > 0 ? 999 : 0);
    retDDRatios.push(ratio);
    if (maxDrawdown >= ruinThreshold) ruinCount++;
  }

  totalReturns.sort((a, b) => a - b);
  maxDrawdowns.sort((a, b) => a - b);
  retDDRatios.sort((a, b) => a - b);

  const medianReturn = percentile(totalReturns, 50);
  const medianMaxDD = percentile(maxDrawdowns, 50);
  const medianRetDDRatio = percentile(retDDRatios, 50);
  const riskOfRuin = ruinCount / iterations;

  const metrics: MonteCarloMetrics = {
    medianReturn,
    medianMaxDD,
    medianRetDDRatio,
    riskOfRuin,
    percentiles: {
      return: { p5: percentile(totalReturns, 5), p25: percentile(totalReturns, 25), p50: medianReturn, p75: percentile(totalReturns, 75), p95: percentile(totalReturns, 95) },
      maxDD: { p5: percentile(maxDrawdowns, 5), p25: percentile(maxDrawdowns, 25), p50: medianMaxDD, p75: percentile(maxDrawdowns, 75), p95: percentile(maxDrawdowns, 95) },
      retDDRatio: { p5: percentile(retDDRatios, 5), p25: percentile(retDDRatios, 25), p50: medianRetDDRatio, p75: percentile(retDDRatios, 75), p95: percentile(retDDRatios, 95) },
    },
    iterations,
    ruinThreshold,
    passThresholds: { retDDRatio: passRetDDRatio, riskOfRuin: passRiskOfRuin },
  };

  const pass = medianRetDDRatio > passRetDDRatio && riskOfRuin < passRiskOfRuin;
  const verdict = pass ? "pass" : "fail";
  const reason = pass
    ? undefined
    : [
        medianRetDDRatio <= passRetDDRatio ? `Median return/drawdown ratio ${medianRetDDRatio.toFixed(2)} ≤ threshold ${passRetDDRatio}` : null,
        riskOfRuin >= passRiskOfRuin ? `Risk of ruin ${(riskOfRuin * 100).toFixed(1)}% ≥ threshold ${(passRiskOfRuin * 100).toFixed(1)}%` : null,
      ].filter(Boolean).join("; ");

  return { verdict, reason, metrics };
}

// ─────────────────────────────────────────────────────────────
//  A2 — Deflated Sharpe Ratio
//  Reference: Bailey & Lopez de Prado (2014) "The Deflated Sharpe Ratio"
// ─────────────────────────────────────────────────────────────

export interface DeflatedSharpeResult {
  dsr: number;
  srPerPeriod: number;
  trialCount: number;
  interpretation: string;
  notValid?: boolean;
  notValidReason?: string;
}

// Euler-Mascheroni constant
const EULER_MASCHERONI = 0.5772156649015328;

// Expected maximum of N standard normal samples (E-M approximation)
function expectedMaxNormals(N: number): number {
  if (N <= 1) return 0;
  const z1 = normInverse(1 - 1 / N);
  const z2 = normInverse(1 - 1 / (N * Math.E));
  return (1 - EULER_MASCHERONI) * z1 + EULER_MASCHERONI * z2;
}

export async function computeDeflatedSharpe(
  backtest: LeanBacktest,
  strategyId: string,
  useGlobal = false
): Promise<DeflatedSharpeResult> {
  const guard = assertEvaluable(backtest);
  const isSimulated = !guard.ok;

  const returns = buildReturns(backtest.equityCurve);
  const T = returns.length;

  if (T < 5) {
    return {
      dsr: 0,
      srPerPeriod: 0,
      trialCount: 0,
      interpretation: "Too few return observations.",
      notValid: true,
      notValidReason: T < 5 ? "Too few return observations (< 5)." : SIMULATED_REASON,
    };
  }

  const mu = mean(returns);
  const sigma = stdDev(returns, mu);
  const SR = mu / sigma;
  const skew = skewness(returns, mu, sigma);
  const kurt = kurtosis(returns, mu, sigma); // 4th moment, not excess

  // Multiple-testing N: per-strategy count (or global if flag set)
  const trialData = useGlobal
    ? await storage.getTrialCount()
    : await storage.getTrialCount(strategyId);
  const N = Math.max(trialData.total, 1);

  // Variance of SR estimator corrected for non-normality
  const sigSR2 = Math.max((1 - skew * SR + ((kurt - 1) / 4) * SR * SR) / (T - 1), 1e-10);
  const sigSR = Math.sqrt(sigSR2);

  // Expected maximum Sharpe from N independent trials (scaled by σ_SR)
  const eMax = expectedMaxNormals(N);
  const SRstar = sigSR * eMax;

  // DSR = Φ((SR - SR*) / σ_SR)
  const dsr = normCDF((SR - SRstar) / sigSR);

  const interpretation =
    dsr > 0.95
      ? "DSR > 0.95: the Sharpe is unlikely to be a multiple-testing fluke."
      : dsr > 0.75
      ? "DSR 0.75–0.95: moderate confidence the Sharpe is real, but with many trials use caution."
      : "DSR < 0.75: likely overfit or luck — treat results with scepticism.";

  return {
    dsr,
    srPerPeriod: SR,
    trialCount: N,
    interpretation,
    notValid: isSimulated || undefined,
    notValidReason: isSimulated ? SIMULATED_REASON : undefined,
  };
}

// ─────────────────────────────────────────────────────────────
//  Incubation gate — forward observation verdict
// ─────────────────────────────────────────────────────────────

/**
 * Forward drawdown may not exceed expectedMaxDrawdown × this factor.
 * Same constant is referenced in the UI comparison widget so the visual
 * always agrees with the gate verdict.
 */
export const DD_BLOWOUT_FACTOR = 1.5;

export interface IncubationVerdictInput {
  observations: Array<{
    observedReturn: number;
    observedDrawdown: number;
    source?: string;
  }>;
  expectedReturn: number | null | undefined;
  expectedMaxDrawdown: number | null | undefined;
  periodComplete: boolean;
  requiredDays: number;
  elapsedDays: number;
}

export interface IncubationVerdictResult {
  verdict: "pass" | "fail" | "cannot_evaluate";
  reason: string;
  metrics: {
    avgReturn: number;
    avgDrawdown: number;
    expectedReturn: number;
    expectedMaxDrawdown: number;
    ddTolerance: number;
    observationCount: number;
    elapsedDays: number;
  };
}

export function computeIncubationVerdict(
  input: IncubationVerdictInput
): IncubationVerdictResult {
  const {
    observations,
    expectedReturn,
    expectedMaxDrawdown,
    periodComplete,
    requiredDays,
    elapsedDays,
  } = input;

  const expRet = expectedReturn ?? 0;
  const expDD = expectedMaxDrawdown ?? 0;
  const ddTolerance = expDD * DD_BLOWOUT_FACTOR;

  const baseMetrics = {
    avgReturn: 0,
    avgDrawdown: 0,
    expectedReturn: expRet,
    expectedMaxDrawdown: expDD,
    ddTolerance,
    observationCount: observations.length,
    elapsedDays,
  };

  if (!periodComplete) {
    const remaining = Math.max(0, requiredDays - elapsedDays);
    return {
      verdict: "cannot_evaluate",
      reason: `Incubation period incomplete: ${remaining} days remaining (${elapsedDays}/${requiredDays} elapsed).`,
      metrics: baseMetrics,
    };
  }

  if (observations.length < 3) {
    return {
      verdict: "cannot_evaluate",
      reason: `Minimum 3 observations required; ${observations.length} logged.`,
      metrics: baseMetrics,
    };
  }

  const avgReturn =
    observations.reduce((s, o) => s + o.observedReturn, 0) / observations.length;
  const avgDrawdown =
    observations.reduce((s, o) => s + o.observedDrawdown, 0) / observations.length;

  // Determine provenance label for honest reason string
  const allLive = observations.every((o) => o.source === "live");
  const anyPaper = observations.some((o) => o.source === "paper");
  const provenance = allLive
    ? "live forward data"
    : anyPaper
    ? "paper-trading data"
    : "self-reported manual observations";

  const metrics = {
    avgReturn,
    avgDrawdown,
    expectedReturn: expRet,
    expectedMaxDrawdown: expDD,
    ddTolerance,
    observationCount: observations.length,
    elapsedDays,
  };

  // Guard 1: drawdown blowout
  if (avgDrawdown > ddTolerance) {
    return {
      verdict: "fail",
      reason: `Forward max drawdown (${(avgDrawdown * 100).toFixed(1)}%) exceeds tolerance ` +
        `(${(ddTolerance * 100).toFixed(1)}% = ${DD_BLOWOUT_FACTOR}× expected ${(expDD * 100).toFixed(1)}%). ` +
        `Verdict rests on ${provenance}.`,
      metrics,
    };
  }

  // Guard 2: net-negative return
  if (avgReturn < 0) {
    return {
      verdict: "fail",
      reason: `Net-negative average return (${(avgReturn * 100).toFixed(2)}%) over the incubation period. ` +
        `Verdict rests on ${provenance}.`,
      metrics,
    };
  }

  return {
    verdict: "pass",
    reason: `Forward return ${(avgReturn * 100).toFixed(2)}% with avg drawdown ${(avgDrawdown * 100).toFixed(1)}% ` +
      `within ${DD_BLOWOUT_FACTOR}× tolerance. Verdict rests on ${provenance}.`,
    metrics,
  };
}

// ─────────────────────────────────────────────────────────────
//  Feasibility gate (Davey Ch 6–7, 12: preliminary analysis)
//
//  Declared goals are compared against a single full historical
//  backtest. Fails fast so no further effort is spent on a
//  strategy that can never meet its objectives. Suspiciously good
//  results do NOT auto-pass — they demand manual review.
// ─────────────────────────────────────────────────────────────

export interface FeasibilityConfig {
  /** Minimum closed trades for statistical significance (default 30) */
  minSampleTrades?: number;
  /** Slippage + commission margin the average trade must clear, USD (default 25) */
  costPerTradeUsd?: number;
  /** Sharpe above this is "too good to be true" → manual review (default 4) */
  tooGoodSharpe?: number;
  /** Win rate (percent) above this → manual review (default 90) */
  tooGoodWinRatePct?: number;
}

export interface FeasibilityMetrics {
  years: number;
  annualizedReturnPct: number;
  maxDrawdownPct: number;
  retDDRatio: number;
  tradesPerYear: number;
  totalTrades: number;
  avgTradeUsd: number | null;
  sharpeRatio: number;
  winRatePct: number;
  tooGoodToBeTrue: boolean;
}

export interface FeasibilityResult {
  verdict: "pass" | "fail" | "cannot_evaluate";
  reason: string;
  metrics: FeasibilityMetrics | null;
}

export function computeFeasibility(
  backtest: {
    dataSource?: string;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate?: number;
    totalTrades?: number;
    equityCurve: Array<{ date: string; value: number }>;
    trades?: Array<{ profitLoss: number }>;
  },
  goals: {
    minRetDDRatio: number;
    maxDrawdownPct: number;
    minAnnualReturnPct: number;
    minTradesPerYear: number;
  },
  config: FeasibilityConfig = {}
): FeasibilityResult {
  const evaluable = assertEvaluable(backtest);
  if (!evaluable.ok) {
    return { verdict: "cannot_evaluate", reason: evaluable.reason, metrics: null };
  }

  const minSampleTrades = config.minSampleTrades ?? 30;
  const costPerTradeUsd = config.costPerTradeUsd ?? 25;
  const tooGoodSharpe = config.tooGoodSharpe ?? 4;
  const tooGoodWinRatePct = config.tooGoodWinRatePct ?? 90;

  if (backtest.equityCurve.length < 2) {
    return {
      verdict: "cannot_evaluate",
      reason: "Equity curve too short to derive the test period.",
      metrics: null,
    };
  }

  const first = new Date(backtest.equityCurve[0].date).getTime();
  const last = new Date(backtest.equityCurve[backtest.equityCurve.length - 1].date).getTime();
  const years = (last - first) / (365.25 * 24 * 3600 * 1000);
  if (!isFinite(years) || years <= 0) {
    return {
      verdict: "cannot_evaluate",
      reason: "Could not derive a positive test period from the equity curve dates.",
      metrics: null,
    };
  }

  const totalTrades = backtest.totalTrades ?? 0;
  const annualizedReturnPct =
    (Math.pow(1 + backtest.totalReturn / 100, 1 / years) - 1) * 100;
  const maxDrawdownPct = Math.abs(backtest.maxDrawdown);
  const retDDRatio = maxDrawdownPct > 0 ? annualizedReturnPct / maxDrawdownPct : Infinity;
  const tradesPerYear = totalTrades / years;
  const closedTrades = backtest.trades ?? [];
  const avgTradeUsd =
    closedTrades.length > 0
      ? closedTrades.reduce((s, t) => s + t.profitLoss, 0) / closedTrades.length
      : null;
  const winRatePct = backtest.winRate ?? 0;
  const tooGoodToBeTrue =
    backtest.sharpeRatio > tooGoodSharpe || winRatePct > tooGoodWinRatePct;

  const metrics: FeasibilityMetrics = {
    years,
    annualizedReturnPct,
    maxDrawdownPct,
    retDDRatio,
    tradesPerYear,
    totalTrades,
    avgTradeUsd,
    sharpeRatio: backtest.sharpeRatio,
    winRatePct,
    tooGoodToBeTrue,
  };

  // Sample size is not evidence of failure — it is absence of evidence.
  if (totalTrades < minSampleTrades) {
    return {
      verdict: "cannot_evaluate",
      reason: `Only ${totalTrades} trades in the test period; ${minSampleTrades}+ needed for statistical significance. Extend the test period or data.`,
      metrics,
    };
  }

  const failures: string[] = [];
  if (annualizedReturnPct < goals.minAnnualReturnPct) {
    failures.push(
      `annualized return ${annualizedReturnPct.toFixed(1)}% < goal ${goals.minAnnualReturnPct}%`
    );
  }
  if (maxDrawdownPct > goals.maxDrawdownPct) {
    failures.push(`max drawdown ${maxDrawdownPct.toFixed(1)}% > goal ${goals.maxDrawdownPct}%`);
  }
  if (retDDRatio < goals.minRetDDRatio) {
    failures.push(`return/DD ratio ${retDDRatio.toFixed(2)} < goal ${goals.minRetDDRatio}`);
  }
  if (tradesPerYear < goals.minTradesPerYear) {
    failures.push(
      `${tradesPerYear.toFixed(1)} trades/year < goal ${goals.minTradesPerYear}`
    );
  }
  if (avgTradeUsd !== null && avgTradeUsd <= costPerTradeUsd) {
    failures.push(
      `average trade $${avgTradeUsd.toFixed(2)} does not clear the $${costPerTradeUsd} slippage/commission buffer`
    );
  }

  if (failures.length > 0) {
    return {
      verdict: "fail",
      reason: `Does not meet locked goals: ${failures.join("; ")}.`,
      metrics,
    };
  }

  // Passing metrics that look impossible are a development-error signal,
  // not a green light (Davey: "performance that is too good is a bad thing").
  if (tooGoodToBeTrue) {
    return {
      verdict: "cannot_evaluate",
      reason:
        `Metrics exceed plausibility thresholds (Sharpe ${backtest.sharpeRatio.toFixed(2)} > ${tooGoodSharpe} ` +
        `or win rate ${winRatePct.toFixed(1)}% > ${tooGoodWinRatePct}%). ` +
        `Manual review required: check for look-ahead bias, fill assumptions, or data errors before proceeding.`,
      metrics,
    };
  }

  return {
    verdict: "pass",
    reason:
      `Meets all locked goals: annualized ${annualizedReturnPct.toFixed(1)}%, ` +
      `DD ${maxDrawdownPct.toFixed(1)}%, ret/DD ${retDDRatio.toFixed(2)}, ` +
      `${tradesPerYear.toFixed(0)} trades/yr over ${years.toFixed(1)} years.`,
    metrics,
  };
}

// ─────────────────────────────────────────────────────────────
//  B1 — Walk-Forward (scaffold — cannot_evaluate today)
// ─────────────────────────────────────────────────────────────

export interface WalkForwardResult {
  verdict: "cannot_evaluate";
  reason: string;
}

export function computeWalkForward(): WalkForwardResult {
  return {
    verdict: "cannot_evaluate",
    reason:
      "Walk-forward requires running the strategy across multiple windows on a real engine. " +
      "This gate will evaluate when a live backtest engine is connected.",
  };
}

// ─────────────────────────────────────────────────────────────
//  Helper: record a gate result and optionally advance the
//  strategy state machine.  cannot_evaluate never advances.
// ─────────────────────────────────────────────────────────────

export async function persistGateResult(
  strategyId: string,
  gate: string,
  verdict: "pass" | "fail" | "cannot_evaluate",
  metrics: Record<string, unknown> | null,
  dataSource: string | null,
  reason: string | null
): Promise<GateResult> {
  const record = await storage.recordGateResult({
    strategyId,
    gate,
    verdict,
    metrics: metrics as any,
    dataSource,
    reason,
  });

  // Only advance the state machine on a decisive verdict
  if (verdict === "pass" || verdict === "fail") {
    await storage.recordGate(strategyId, {
      result: verdict === "pass" ? "passed" : "failed",
      note: reason ?? undefined,
    }).catch(() => {});
  }

  return record;
}
