// ─────────────────────────────────────────────────────────────
//  Davey Ch 23–24 — monitoring incubating and live strategies
//
//  Forward observations are judged against the expected-performance
//  baseline snapshotted when the Monte Carlo gate passed. Key
//  outputs: the daily tracking position vs the MC percentile bands
//  (Fig 23.8), return/drawdown efficiency (the two numbers Davey
//  actually watches), trade-frequency sanity, the too-good flag,
//  and quit-rule evaluation. The app warns; the human decides.
// ─────────────────────────────────────────────────────────────

import type { Strategy, ExpectedPerformance, IncubationObservation, QuitRule } from "@shared/schema";

export interface TrackingPoint {
  index: number; // 1-based observation count
  date: string;
  pnl: number;
  cumulativePnL: number;
  /** Expected cumulative bands at this index (from the MC snapshot) */
  expected: { p2_5: number; p10: number; p50: number; p90: number; p97_5: number } | null;
}

export type BandPosition =
  | "above_p97_5"
  | "p90_to_p97_5"
  | "p50_to_p90"
  | "p10_to_p50"
  | "p2_5_to_p10"
  | "below_p2_5"
  | "unknown";

export interface QuitRuleStatus {
  rule: QuitRule;
  breached: boolean;
  detail: string;
}

export interface TrackingReport {
  points: TrackingPoint[];
  cumulativePnL: number;
  maxDrawdownUsd: number;
  bandPosition: BandPosition;
  returnEfficiency: number | null;
  drawdownEfficiency: number | null;
  tooGood: boolean;
  belowWarningBand: boolean;
  tradeFrequencyNote: string | null;
  quitRuleStatus: QuitRuleStatus | null;
  warnings: string[];
}

function bandAt(exp: ExpectedPerformance, index: number) {
  if (exp.bands.length === 0) return null;
  // Clamp to the last band when forward observations outrun the snapshot
  const b = exp.bands[Math.min(index - 1, exp.bands.length - 1)];
  return { p2_5: b.p2_5, p10: b.p10, p50: b.p50, p90: b.p90, p97_5: b.p97_5 };
}

export function classifyBandPosition(
  cumulative: number,
  band: { p2_5: number; p10: number; p50: number; p90: number; p97_5: number } | null
): BandPosition {
  if (!band) return "unknown";
  if (cumulative > band.p97_5) return "above_p97_5";
  if (cumulative > band.p90) return "p90_to_p97_5";
  if (cumulative > band.p50) return "p50_to_p90";
  if (cumulative > band.p10) return "p10_to_p50";
  if (cumulative > band.p2_5) return "p2_5_to_p10";
  return "below_p2_5";
}

export function evaluateQuitRule(
  rule: QuitRule,
  cumulative: number,
  maxDrawdownUsd: number,
  bandPosition: BandPosition
): QuitRuleStatus {
  if (rule.type === "max_drawdown_usd") {
    const breached = maxDrawdownUsd >= rule.value;
    return {
      rule,
      breached,
      detail: breached
        ? `Drawdown $${maxDrawdownUsd.toFixed(0)} has reached the quit level $${rule.value.toFixed(0)}. The plan says: stop trading.`
        : `Drawdown $${maxDrawdownUsd.toFixed(0)} of $${rule.value.toFixed(0)} quit level.`,
    };
  }
  // percentile_floor: value names the band (10 → quit below the P10 line)
  const floorBreached =
    (rule.value >= 10 && (bandPosition === "below_p2_5" || bandPosition === "p2_5_to_p10")) ||
    (rule.value < 10 && bandPosition === "below_p2_5");
  return {
    rule,
    breached: floorBreached,
    detail: floorBreached
      ? `Cumulative P&L is below the P${rule.value} expectation band. The plan says: stop trading.`
      : `Cumulative P&L is above the P${rule.value} floor.`,
  };
}

export function buildTrackingReport(strategy: Strategy): TrackingReport | { error: string } {
  const exp = strategy.expectedPerformance;
  if (!exp) {
    return { error: "No expected-performance baseline. Pass the Monte Carlo gate on live-engine data first." };
  }
  const observations = (strategy.incubationObservations ?? [])
    .filter((o): o is IncubationObservation & { observedPnL: number } => typeof o.observedPnL === "number")
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const points: TrackingPoint[] = [];
  let cumulative = 0;
  let peak = 0;
  let maxDD = 0;
  for (let i = 0; i < observations.length; i++) {
    cumulative += observations[i].observedPnL;
    if (cumulative > peak) peak = cumulative;
    maxDD = Math.max(maxDD, peak - cumulative);
    points.push({
      index: i + 1,
      date: observations[i].date,
      pnl: observations[i].observedPnL,
      cumulativePnL: cumulative,
      expected: bandAt(exp, i + 1),
    });
  }

  const lastBand = points.length > 0 ? points[points.length - 1].expected : null;
  const bandPosition = points.length > 0 ? classifyBandPosition(cumulative, lastBand) : "unknown";

  // Efficiencies (Davey's two key columns). Expected cumulative at this
  // point = median band; expected drawdown scaled from the annual figure.
  const expectedCum = lastBand?.p50 ?? null;
  const returnEfficiency =
    expectedCum !== null && expectedCum !== 0 ? cumulative / expectedCum : null;
  const expectedDDUsd =
    exp.expectedMaxDrawdownPct > 0 && exp.bands.length > 0
      ? // approximate expected $ drawdown over the observed horizon
        (exp.expectedMaxDrawdownPct / 100) *
        Math.max(Math.abs(exp.bands[exp.bands.length - 1].p50), 1) *
        Math.min(1, points.length / exp.bands.length)
      : null;
  const drawdownEfficiency =
    expectedDDUsd !== null && expectedDDUsd > 0 ? 1 - maxDD / expectedDDUsd : null;

  const tooGood = bandPosition === "above_p97_5";
  const belowWarningBand = bandPosition === "below_p2_5" || bandPosition === "p2_5_to_p10";

  // Trade/observation frequency vs expectation (Davey week-7 review)
  let tradeFrequencyNote: string | null = null;
  if (points.length >= 5 && exp.tradesPerYear > 0) {
    const first = new Date(points[0].date).getTime();
    const last = new Date(points[points.length - 1].date).getTime();
    const years = (last - first) / (365.25 * 24 * 3600 * 1000);
    if (years > 0) {
      const observedPerYear = points.length / years;
      const ratio = observedPerYear / exp.tradesPerYear;
      if (ratio < 0.5) {
        tradeFrequencyNote = `Trading far less than expected (${observedPerYear.toFixed(0)}/yr vs ${exp.tradesPerYear.toFixed(0)}/yr) — market conditions may differ from the test period.`;
      } else if (ratio > 2) {
        tradeFrequencyNote = `Trading far more than expected (${observedPerYear.toFixed(0)}/yr vs ${exp.tradesPerYear.toFixed(0)}/yr) — check for changed behavior.`;
      }
    }
  }

  const quitRuleStatus = strategy.quitRule
    ? evaluateQuitRule(strategy.quitRule, cumulative, maxDD, bandPosition)
    : null;

  const warnings: string[] = [];
  if (tooGood) {
    warnings.push(
      "Performance is ABOVE the 97.5th percentile band — too good to be true is a bad thing (Davey Fig 23.4). Verify fills and data before celebrating; keep incubating."
    );
  }
  if (belowWarningBand) {
    warnings.push(
      "Performance is below the P10 expectation band — the live system may be different from its backtest."
    );
  }
  if (tradeFrequencyNote) warnings.push(tradeFrequencyNote);
  if (quitRuleStatus?.breached) warnings.push(quitRuleStatus.detail);

  return {
    points,
    cumulativePnL: cumulative,
    maxDrawdownUsd: maxDD,
    bandPosition,
    returnEfficiency,
    drawdownEfficiency,
    tooGood,
    belowWarningBand,
    tradeFrequencyNote,
    quitRuleStatus,
    warnings,
  };
}

/** Davey reviews live strategies every ~4 weeks. */
export const REVIEW_INTERVAL_DAYS = 28;

export function reviewDue(lastReviewAt: Date | null, stageEnteredAt: Date | null): boolean {
  const anchor = lastReviewAt ?? stageEnteredAt;
  if (!anchor) return false;
  return Date.now() - anchor.getTime() >= REVIEW_INTERVAL_DAYS * 24 * 3600 * 1000;
}
