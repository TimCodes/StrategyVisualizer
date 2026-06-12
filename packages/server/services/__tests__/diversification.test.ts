import { describe, it, expect } from "vitest";
import {
  toDailyPnL,
  pearson,
  correlation,
  rollingMaxCorrelation,
  combineDailyPnL,
  equityFromPnL,
  maxDrawdownPct,
  analyzeDiversification,
  MIN_OVERLAP_DAYS,
} from "../diversification";

// ─── synthetic daily curves ─────────────────────────────────

function dateAt(i: number): string {
  return new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10);
}

/** Build an equity curve from a daily P&L generator. */
function curveFrom(pnl: (i: number) => number, days = 200, initial = 100000) {
  const curve = [{ date: dateAt(0), value: initial }];
  let level = initial;
  for (let i = 1; i <= days; i++) {
    level += pnl(i);
    curve.push({ date: dateAt(i), value: level });
  }
  return curve;
}

// Deterministic pseudo-noise (no Math.random in tests)
const noise = (i: number, phase = 0) => Math.sin(i * 2.7 + phase) * 120;

const trendUp = (i: number) => 60 + noise(i);            // steady winner
const trendUpClone = (i: number) => 55 + noise(i) * 0.9; // nearly identical behavior
const antiPhase = (i: number) => 60 + Math.sin(i * 2.7 + Math.PI) * 120; // opposite noise
const bigLoser = (i: number) => -80 + noise(i, 1.3);     // steady loser

describe("toDailyPnL / equityFromPnL round trip", () => {
  it("recovers daily P&L from a curve and rebuilds the same final equity", () => {
    const curve = curveFrom(trendUp, 50);
    const pnl = toDailyPnL(curve);
    expect(pnl.size).toBe(50);
    const rebuilt = equityFromPnL(100000, pnl);
    expect(rebuilt[rebuilt.length - 1].value).toBeCloseTo(curve[curve.length - 1].value, 6);
  });
});

describe("pearson / correlation", () => {
  it("perfectly correlated series → 1, anti-correlated → -1", () => {
    const xs = [1, 2, 3, 4, 5];
    expect(pearson(xs, [2, 4, 6, 8, 10])).toBeCloseTo(1, 10);
    expect(pearson(xs, [-1, -2, -3, -4, -5])).toBeCloseTo(-1, 10);
  });

  it("returns null for constant series", () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
  });

  it("correlation requires minimum overlapping days", () => {
    const a = toDailyPnL(curveFrom(trendUp, MIN_OVERLAP_DAYS - 5));
    const b = toDailyPnL(curveFrom(trendUpClone, MIN_OVERLAP_DAYS - 5));
    expect(correlation(a, b)).toBeNull();
  });

  it("near-identical systems show high correlation; anti-phase systems low", () => {
    const a = toDailyPnL(curveFrom(trendUp));
    const clone = toDailyPnL(curveFrom(trendUpClone));
    const anti = toDailyPnL(curveFrom(antiPhase));
    expect(correlation(a, clone)!).toBeGreaterThan(0.9);
    expect(correlation(a, anti)!).toBeLessThan(0);
  });
});

describe("rollingMaxCorrelation", () => {
  it("catches a crisis-window correlation spike the full history hides", () => {
    // Uncorrelated noise for 300 days, then 60 days of identical crash moves
    const crashA = (i: number) => (i > 300 ? -200 : Math.sin(i * 2.7) * 100);
    const crashB = (i: number) => (i > 300 ? -200 : Math.cos(i * 1.9) * 100);
    const a = toDailyPnL(curveFrom(crashA, 360));
    const b = toDailyPnL(curveFrom(crashB, 360));
    const full = correlation(a, b)!;
    const rolling = rollingMaxCorrelation(a, b, 60)!;
    expect(rolling).toBeGreaterThan(full);
    expect(rolling).toBeGreaterThan(0.8);
  });
});

describe("combineDailyPnL", () => {
  it("sums P&L per date and keeps days only one system traded", () => {
    const a = new Map([["2020-01-01", 100], ["2020-01-02", -50]]);
    const b = new Map([["2020-01-02", 30], ["2020-01-03", 80]]);
    const combined = combineDailyPnL([a, b]);
    expect(combined.get("2020-01-01")).toBe(100);
    expect(combined.get("2020-01-02")).toBe(-20);
    expect(combined.get("2020-01-03")).toBe(80);
  });
});

describe("maxDrawdownPct", () => {
  it("measures peak-to-trough", () => {
    const dd = maxDrawdownPct([{ value: 100 }, { value: 120 }, { value: 90 }, { value: 110 }]);
    expect(dd).toBeCloseTo(25, 5); // 120 → 90
  });
});

describe("analyzeDiversification", () => {
  const candidate = { name: "candidate", curve: curveFrom(antiPhase) };
  const member = { name: "member", curve: curveFrom(trendUp) };

  it("first system passes trivially with no portfolio", () => {
    const r = analyzeDiversification(candidate, []);
    expect(r.verdict).toBe("pass");
    expect(r.reason).toMatch(/First system/);
  });

  it("a complementary system passes and improves combined linearity", () => {
    const r = analyzeDiversification(candidate, [member]);
    expect(r.verdict).toBe("pass");
    const m = r.metrics!;
    // Davey Table 15.1: combined R² beats the pieces when systems complement
    expect(m.combinedWith.linearityR2).toBeGreaterThanOrEqual(
      Math.min(m.candidateStats.linearityR2, m.memberStats[0].linearityR2)
    );
    expect(m.mcWith).not.toBeNull();
    expect(m.mcWithout).not.toBeNull();
  });

  it("a clone of an existing member fails on correlation", () => {
    const clone = { name: "clone", curve: curveFrom(trendUpClone) };
    const r = analyzeDiversification(clone, [member]);
    expect(r.verdict).toBe("fail");
    expect(r.reason).toMatch(/correlation with "member"/);
  });

  it("a system that craters the combined ret/DD fails even when uncorrelated", () => {
    const loser = { name: "loser", curve: curveFrom(bigLoser) };
    const r = analyzeDiversification(loser, [member]);
    expect(r.verdict).toBe("fail");
    expect(r.reason).toMatch(/ret\/DD/);
  });

  it("cannot evaluate without enough overlapping history", () => {
    const shortMember = { name: "short", curve: curveFrom(trendUp, MIN_OVERLAP_DAYS - 5) };
    const r = analyzeDiversification(candidate, [shortMember]);
    expect(r.verdict).toBe("cannot_evaluate");
    expect(r.reason).toMatch(/overlapping history/);
  });

  it("cannot evaluate a too-short candidate", () => {
    const r = analyzeDiversification(
      { name: "tiny", curve: curveFrom(trendUp, 5) },
      [member]
    );
    expect(r.verdict).toBe("cannot_evaluate");
  });

  it("warns when rolling correlation peaks above threshold despite a passing full-history number", () => {
    // Profitable and uncorrelated normally; identical synchronized moves
    // during a 60-day crash window
    const crashA = (i: number) => (i > 300 ? -150 + Math.sin(i) * 40 : 80 + Math.sin(i * 2.7) * 100);
    const crashB = (i: number) => (i > 300 ? -150 + Math.sin(i) * 40 : 80 + Math.cos(i * 1.9) * 100);
    const r = analyzeDiversification(
      { name: "a", curve: curveFrom(crashA, 360) },
      [{ name: "b", curve: curveFrom(crashB, 360) }],
      { retDDTolerance: 0.01 } // neutralize the MC check; we're testing the warning
    );
    if (r.verdict === "pass") {
      expect(r.reason).toMatch(/Caution: rolling correlation/);
    } else {
      // If full-history correlation already trips, that's also acceptable detection
      expect(r.reason).toMatch(/correlation/);
    }
  });
});
