import { describe, it, expect } from "vitest";
import {
  buildTrackingReport,
  classifyBandPosition,
  evaluateQuitRule,
  reviewDue,
  REVIEW_INTERVAL_DAYS,
} from "../monitoring";
import type { Strategy, ExpectedPerformance, QuitRule } from "@shared/schema";

// ─── fixtures ───────────────────────────────────────────────

/** Linear bands: median +100/trade, ±spread·sqrt-ish growth kept simple */
function makeBands(n: number): ExpectedPerformance["bands"] {
  return Array.from({ length: n }, (_, i) => {
    const t = i + 1;
    return {
      trade: t,
      p2_5: t * 100 - 400,
      p10: t * 100 - 250,
      p50: t * 100,
      p90: t * 100 + 250,
      p97_5: t * 100 + 400,
    };
  });
}

function makeExpected(n = 20): ExpectedPerformance {
  return {
    avgTradePnL: 100,
    tradesPerYear: 50,
    expectedAnnualReturnPct: 25,
    expectedMaxDrawdownPct: 10,
    bands: makeBands(n),
    snappedAt: new Date("2026-01-01"),
  };
}

function makeStrategy(overrides: Partial<Strategy> = {}): Strategy {
  return {
    id: "s1",
    name: "Mon Test",
    description: "",
    type: "momentum",
    status: "active",
    performance: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    winRate: 0,
    totalTrades: 0,
    stage: "incubation",
    gateStatus: "in_progress",
    gateHistory: [],
    refinementHistory: [],
    incubationObservations: [],
    createdAt: new Date(),
    expectedPerformance: makeExpected(),
    ...overrides,
  };
}

function obs(date: string, pnl: number) {
  return { date, observedReturn: 0, observedDrawdown: 0, observedPnL: pnl, source: "paper" as const };
}

// ─── classifyBandPosition ───────────────────────────────────

describe("classifyBandPosition", () => {
  const band = { p2_5: -400, p10: -250, p50: 0, p90: 250, p97_5: 400 };
  it("classifies every region", () => {
    expect(classifyBandPosition(500, band)).toBe("above_p97_5");
    expect(classifyBandPosition(300, band)).toBe("p90_to_p97_5");
    expect(classifyBandPosition(100, band)).toBe("p50_to_p90");
    expect(classifyBandPosition(-100, band)).toBe("p10_to_p50");
    expect(classifyBandPosition(-300, band)).toBe("p2_5_to_p10");
    expect(classifyBandPosition(-500, band)).toBe("below_p2_5");
    expect(classifyBandPosition(0, null)).toBe("unknown");
  });
});

// ─── evaluateQuitRule ───────────────────────────────────────

describe("evaluateQuitRule", () => {
  const ddRule: QuitRule = { type: "max_drawdown_usd", value: 5000, lockedAt: new Date() };
  const floorRule: QuitRule = { type: "percentile_floor", value: 10, lockedAt: new Date() };

  it("max_drawdown_usd breaches at the quit level", () => {
    expect(evaluateQuitRule(ddRule, 1000, 4999, "p10_to_p50").breached).toBe(false);
    expect(evaluateQuitRule(ddRule, 1000, 5000, "p10_to_p50").breached).toBe(true);
  });

  it("percentile_floor 10 breaches below the P10 band", () => {
    expect(evaluateQuitRule(floorRule, 0, 0, "p10_to_p50").breached).toBe(false);
    expect(evaluateQuitRule(floorRule, 0, 0, "p2_5_to_p10").breached).toBe(true);
    expect(evaluateQuitRule(floorRule, 0, 0, "below_p2_5").breached).toBe(true);
  });

  it("percentile_floor 2.5 only breaches below P2.5", () => {
    const strict: QuitRule = { type: "percentile_floor", value: 2.5, lockedAt: new Date() };
    expect(evaluateQuitRule(strict, 0, 0, "p2_5_to_p10").breached).toBe(false);
    expect(evaluateQuitRule(strict, 0, 0, "below_p2_5").breached).toBe(true);
  });
});

// ─── buildTrackingReport ────────────────────────────────────

describe("buildTrackingReport", () => {
  it("errors without a baseline", () => {
    const r = buildTrackingReport(makeStrategy({ expectedPerformance: undefined }));
    expect("error" in r).toBe(true);
  });

  it("tracks cumulative P&L, drawdown, and band position for on-target results", () => {
    const s = makeStrategy({
      incubationObservations: [obs("2026-01-01", 100), obs("2026-01-08", 120), obs("2026-01-15", 80)],
    });
    const r = buildTrackingReport(s);
    if ("error" in r) throw new Error(r.error);
    expect(r.points).toHaveLength(3);
    expect(r.cumulativePnL).toBe(300);
    // cumulative 300 equals the P50 at trade 3 exactly — "at median" sits
    // in the p10_to_p50 region (boundaries are strict)
    expect(r.bandPosition).toBe("p10_to_p50");
  });

  it("flags too-good results instead of celebrating them", () => {
    const s = makeStrategy({
      incubationObservations: [obs("2026-01-01", 800), obs("2026-01-08", 900)],
    });
    const r = buildTrackingReport(s);
    if ("error" in r) throw new Error(r.error);
    expect(r.bandPosition).toBe("above_p97_5");
    expect(r.tooGood).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/too good/i);
  });

  it("warns below the P10 band and computes a low return efficiency", () => {
    const s = makeStrategy({
      incubationObservations: [obs("2026-01-01", -150), obs("2026-01-08", -100), obs("2026-01-15", -80)],
    });
    const r = buildTrackingReport(s);
    if ("error" in r) throw new Error(r.error);
    expect(r.belowWarningBand).toBe(true);
    expect(r.returnEfficiency).not.toBeNull();
    expect(r.returnEfficiency!).toBeLessThan(0);
  });

  it("evaluates a locked quit rule and reports a breach", () => {
    const s = makeStrategy({
      quitRule: { type: "max_drawdown_usd", value: 300, lockedAt: new Date() },
      incubationObservations: [obs("2026-01-01", 200), obs("2026-01-08", -350), obs("2026-01-15", -50)],
    });
    const r = buildTrackingReport(s);
    if ("error" in r) throw new Error(r.error);
    expect(r.maxDrawdownUsd).toBe(400); // peak 200 → trough -200
    expect(r.quitRuleStatus?.breached).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/stop trading/i);
  });

  it("ignores observations without dollar P&L", () => {
    const s = makeStrategy({
      incubationObservations: [
        { date: "2026-01-01", observedReturn: 1, observedDrawdown: 0, source: "manual" },
        obs("2026-01-08", 100),
      ],
    });
    const r = buildTrackingReport(s);
    if ("error" in r) throw new Error(r.error);
    expect(r.points).toHaveLength(1);
  });

  it("clamps to the last band when observations outrun the snapshot", () => {
    const s = makeStrategy({
      expectedPerformance: makeExpected(2),
      incubationObservations: [obs("2026-01-01", 100), obs("2026-01-08", 100), obs("2026-01-15", 100)],
    });
    const r = buildTrackingReport(s);
    if ("error" in r) throw new Error(r.error);
    expect(r.points[2].expected).toEqual(r.points[1].expected);
  });
});

// ─── reviewDue ──────────────────────────────────────────────

describe("reviewDue", () => {
  const days = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000);

  it("due when the last review is older than the interval", () => {
    expect(reviewDue(days(REVIEW_INTERVAL_DAYS + 1), null)).toBe(true);
    expect(reviewDue(days(REVIEW_INTERVAL_DAYS - 5), null)).toBe(false);
  });

  it("falls back to the stage-entry date when never reviewed", () => {
    expect(reviewDue(null, days(REVIEW_INTERVAL_DAYS + 1))).toBe(true);
    expect(reviewDue(null, days(3))).toBe(false);
  });

  it("not due with no anchor at all", () => {
    expect(reviewDue(null, null)).toBe(false);
  });
});
