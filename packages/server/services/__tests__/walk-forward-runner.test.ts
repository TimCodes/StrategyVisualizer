import { describe, it, expect } from "vitest";
import {
  buildWindows,
  expandParameterGrid,
  equityLinearity,
  computeFitness,
  stitchOOSCurves,
  computeWalkForwardVerdict,
  tryComputePBO,
  WFE_PASS_THRESHOLD,
} from "../walk-forward-runner";
import type { WfWindowResult } from "@shared/schema";

// ─── buildWindows ───────────────────────────────────────────

describe("buildWindows", () => {
  const base = {
    startDate: "2010-01-01",
    inSampleDays: 365,
    outOfSampleDays: 90,
    numWindows: 3,
  };

  it("unanchored windows slide forward by the OOS period", () => {
    const w = buildWindows({ ...base, anchored: false });
    expect(w).toHaveLength(3);
    expect(w[0].isStart).toBe("2010-01-01");
    expect(w[0].isEnd).toBe(w[0].oosStart);
    expect(w[1].isStart).toBe("2010-04-01"); // +90 days
    // IS length constant for unanchored
    const isLen = (x: { isStart: string; isEnd: string }) =>
      new Date(x.isEnd).getTime() - new Date(x.isStart).getTime();
    expect(isLen(w[0])).toBe(isLen(w[2]));
  });

  it("anchored windows keep the start fixed and grow", () => {
    const w = buildWindows({ ...base, anchored: true });
    expect(w[0].isStart).toBe("2010-01-01");
    expect(w[2].isStart).toBe("2010-01-01");
    const isLen = (x: { isStart: string; isEnd: string }) =>
      new Date(x.isEnd).getTime() - new Date(x.isStart).getTime();
    expect(isLen(w[2])).toBeGreaterThan(isLen(w[0]));
  });

  it("OOS windows tile contiguously in both modes", () => {
    for (const anchored of [false, true]) {
      const w = buildWindows({ ...base, anchored });
      expect(w[1].oosStart).toBe(w[0].oosEnd);
      expect(w[2].oosStart).toBe(w[1].oosEnd);
    }
  });

  it("rejects an invalid start date", () => {
    expect(() => buildWindows({ ...base, startDate: "not-a-date", anchored: false })).toThrow();
  });
});

// ─── expandParameterGrid ────────────────────────────────────

describe("expandParameterGrid", () => {
  it("returns a single empty combo for no parameters", () => {
    expect(expandParameterGrid([])).toEqual([{}]);
  });

  it("expands a single parameter range inclusively", () => {
    const combos = expandParameterGrid([{ name: "x", min: 5, max: 15, step: 5 }]);
    expect(combos).toEqual([{ x: 5 }, { x: 10 }, { x: 15 }]);
  });

  it("produces the cartesian product of two parameters", () => {
    const combos = expandParameterGrid([
      { name: "fast", min: 5, max: 10, step: 5 },
      { name: "slow", min: 20, max: 30, step: 10 },
    ]);
    expect(combos).toHaveLength(4);
    expect(combos).toContainEqual({ fast: 5, slow: 20 });
    expect(combos).toContainEqual({ fast: 10, slow: 30 });
  });

  it("rejects oversized grids", () => {
    expect(() =>
      expandParameterGrid([{ name: "x", min: 0, max: 10000, step: 1 }])
    ).toThrow(/too large/);
  });
});

// ─── equityLinearity / computeFitness ───────────────────────

describe("fitness functions", () => {
  const linear = Array.from({ length: 50 }, (_, i) => ({ date: `d${i}`, value: 100 + i }));
  const noisy = Array.from({ length: 50 }, (_, i) => ({
    date: `d${i}`,
    value: 100 + (i % 2 === 0 ? i * 2 : -i),
  }));

  it("perfectly linear curve has R² ≈ 1", () => {
    expect(equityLinearity(linear)).toBeCloseTo(1, 5);
  });

  it("noisy curve has lower R² than a straight line", () => {
    expect(equityLinearity(noisy)).toBeLessThan(equityLinearity(linear));
  });

  it("net_profit fitness is the total return", () => {
    expect(
      computeFitness({ totalReturn: 12, maxDrawdown: 4, equityCurve: linear }, "net_profit")
    ).toBe(12);
  });

  it("return_on_account divides by drawdown", () => {
    expect(
      computeFitness({ totalReturn: 12, maxDrawdown: 4, equityCurve: linear }, "return_on_account")
    ).toBe(3);
  });

  it("equity_linearity never prefers a losing run", () => {
    const winner = computeFitness(
      { totalReturn: 5, maxDrawdown: 2, equityCurve: noisy },
      "equity_linearity"
    );
    const loser = computeFitness(
      { totalReturn: -5, maxDrawdown: 2, equityCurve: linear },
      "equity_linearity"
    );
    expect(winner).toBeGreaterThan(loser);
  });
});

// ─── stitchOOSCurves ────────────────────────────────────────

describe("stitchOOSCurves", () => {
  it("compounds segment returns onto a continuous level", () => {
    // Segment A: +10%, Segment B (different base equity): +20%
    const a = [
      { date: "2020-01-01", value: 100000 },
      { date: "2020-02-01", value: 110000 },
    ];
    const b = [
      { date: "2020-02-01", value: 50000 },
      { date: "2020-03-01", value: 60000 },
    ];
    const stitched = stitchOOSCurves([a, b], 100000);
    expect(stitched[stitched.length - 1].value).toBeCloseTo(100000 * 1.1 * 1.2, 5);
  });

  it("skips degenerate segments", () => {
    const ok = [
      { date: "2020-01-01", value: 100 },
      { date: "2020-02-01", value: 105 },
    ];
    const stitched = stitchOOSCurves([[], [{ date: "x", value: 1 }], ok]);
    expect(stitched).toHaveLength(1);
  });
});

// ─── verdict + PBO assembly ─────────────────────────────────

function makeWindow(i: number, oosReturn: number, comboFitness: number[]): WfWindowResult {
  // Quarterly OOS windows through 2020
  const isStart = `201${Math.floor(i / 4) + 8}-01-01`;
  return {
    index: i,
    isStart,
    isEnd: `2019-0${(i % 4) + 1}-01`,
    oosStart: `2020-0${i * 2 + 1}-01`,
    oosEnd: `2020-0${i * 2 + 3}-01`,
    bestParams: { fast: 10 },
    comboFitness,
    isMetrics: { totalReturn: 12, maxDrawdown: 5, sharpeRatio: 1.5, totalTrades: 40 },
    oosMetrics: { totalReturn: oosReturn, maxDrawdown: 4, sharpeRatio: 1.1, totalTrades: 12 },
  };
}

function risingCurve(n: number, growth = 0.01): Array<{ date: string; value: number }> {
  return Array.from({ length: n }, (_, i) => ({
    date: new Date(Date.UTC(2020, 0, 1 + i * 7)).toISOString(),
    value: 100000 * Math.pow(1 + growth, i),
  }));
}

describe("computeWalkForwardVerdict", () => {
  const goals = { minRetDDRatio: 1.0, maxDrawdownPct: 30, minAnnualReturnPct: 5 };

  it("cannot_evaluate with no windows", () => {
    const v = computeWalkForwardVerdict([], [], goals, null);
    expect(v.verdict).toBe("cannot_evaluate");
  });

  it("passes when OOS holds up against IS and goals", () => {
    const windows = [0, 1, 2, 3].map((i) => makeWindow(i, 3, [1, 2]));
    const v = computeWalkForwardVerdict(windows, risingCurve(52), goals, 0.2);
    expect(v.verdict).toBe("pass");
    expect(v.metrics.wfe).not.toBeNull();
    expect(v.metrics.windowsProfitable).toBe(4);
  });

  it("fails when most OOS windows lose", () => {
    const windows = [0, 1, 2, 3].map((i) => makeWindow(i, i === 0 ? 1 : -2, [1, 2]));
    const v = computeWalkForwardVerdict(windows, risingCurve(52), goals, null);
    expect(v.verdict).toBe("fail");
    expect(v.reason).toMatch(/OOS windows profitable/);
  });

  it("fails when WFE is below the threshold", () => {
    // OOS earns far less than IS → tiny WFE
    const windows = [0, 1, 2, 3].map((i) => makeWindow(i, 0.05, [1, 2]));
    const v = computeWalkForwardVerdict(windows, risingCurve(52, 0.0001), goals, null);
    expect(v.metrics.wfe).not.toBeNull();
    expect(v.metrics.wfe!).toBeLessThan(WFE_PASS_THRESHOLD);
    expect(v.verdict).toBe("fail");
  });

  it("fails when the stitched curve misses locked goals", () => {
    const windows = [0, 1, 2, 3].map((i) => makeWindow(i, 3, [1, 2]));
    const v = computeWalkForwardVerdict(windows, risingCurve(52), { ...goals, minAnnualReturnPct: 10000 }, null);
    expect(v.verdict).toBe("fail");
    expect(v.reason).toMatch(/stitched OOS annualized/);
  });
});

describe("tryComputePBO", () => {
  it("returns null for too few windows or combos", () => {
    expect(tryComputePBO([])).toBeNull();
    expect(tryComputePBO([makeWindow(0, 1, [1])])).toBeNull(); // 1 combo
    expect(tryComputePBO([0, 1, 2].map((i) => makeWindow(i, 1, [1, 2])))).toBeNull(); // odd
  });

  it("computes a PBO in [0,1] for an even window count with ≥2 combos", () => {
    const windows = [0, 1, 2, 3].map((i) => makeWindow(i, 1, [1 + i, 2 + i]));
    const pbo = tryComputePBO(windows);
    expect(pbo).not.toBeNull();
    expect(pbo!).toBeGreaterThanOrEqual(0);
    expect(pbo!).toBeLessThanOrEqual(1);
  });

  it("a dominant combo yields low PBO", () => {
    // Combo 1 always wins by a lot
    const windows = [0, 1, 2, 3].map((i) => makeWindow(i, 1, [0.1, 10]));
    const pbo = tryComputePBO(windows);
    expect(pbo).not.toBeNull();
    expect(pbo!).toBeLessThan(0.5);
  });
});
