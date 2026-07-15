import { describe, it, expect } from "vitest";
import {
  sliceEquityIntoBlockReturns,
  computeCpcv,
  cpcvVerdict,
  CPCV_PBO_FAIL,
} from "../cpcv";

// ─── sliceEquityIntoBlockReturns ────────────────────────────

describe("sliceEquityIntoBlockReturns", () => {
  function curve(vals: number[]) {
    return vals.map((v, i) => ({ date: `2020-${String((i % 12) + 1).padStart(2, "0")}-01`, value: v }));
  }

  it("splits into N blocks and returns each block's return", () => {
    // 8 daily values, 4 blocks of 2 → each block return = v[end]/v[start]-1
    const c = [
      { date: "2020-01-01", value: 100 },
      { date: "2020-01-02", value: 110 },
      { date: "2020-01-03", value: 110 },
      { date: "2020-01-04", value: 121 },
      { date: "2020-01-05", value: 121 },
      { date: "2020-01-06", value: 100 },
      { date: "2020-01-07", value: 100 },
      { date: "2020-01-08", value: 130 },
    ];
    const blocks = sliceEquityIntoBlockReturns(c, 4);
    expect(blocks).toHaveLength(4);
    expect(blocks[0]).toBeCloseTo(0.10, 5); // 100→110
    expect(blocks[3]).toBeGreaterThan(0);
  });

  it("collapses intraday points to daily before slicing", () => {
    // 6 unique days (two intraday points on day 1) → enough for 2 blocks
    const intraday = [
      { date: "2020-01-01T10:00:00Z", value: 100 },
      { date: "2020-01-01T16:00:00Z", value: 105 }, // day-1 close wins
      { date: "2020-01-02T16:00:00Z", value: 110 },
      { date: "2020-01-03T16:00:00Z", value: 120 },
      { date: "2020-01-04T16:00:00Z", value: 130 },
      { date: "2020-01-05T16:00:00Z", value: 140 },
    ];
    const blocks = sliceEquityIntoBlockReturns(intraday, 2);
    expect(blocks).toHaveLength(2);
    // 6 daily closes [105,110,120,130,140] after collapse... first block starts at 105
    expect(blocks[0]).toBeGreaterThan(0);
  });

  it("returns empty when the curve is too short for the block count", () => {
    expect(sliceEquityIntoBlockReturns(curve([100, 110]), 8)).toEqual([]);
  });
});

// ─── computeCpcv ────────────────────────────────────────────

describe("computeCpcv", () => {
  it("rejects too few configs or an odd/small block count", () => {
    expect(() => computeCpcv([[0.1, 0.2, 0.3, 0.4]])).toThrow(/2 parameter/);
    expect(() => computeCpcv([[0.1, 0.2, 0.3], [0.1, 0.2, 0.3]])).toThrow(/even number/);
    expect(() => computeCpcv([[0.1, 0.2], [0.1, 0.2]])).toThrow(/even number of blocks >= 4/);
  });

  it("low PBO when the IS-best combo is genuinely best OOS in every block", () => {
    // combo 0 dominates every block → IS-best is also OOS-best → not overfit
    const dominant = Array.from({ length: 6 }, () => 1.0);
    const weak1 = Array.from({ length: 6 }, () => 0.1);
    const weak2 = Array.from({ length: 6 }, () => 0.05);
    const r = computeCpcv([dominant, weak1, weak2], { embargo: 0 });
    expect(r.pbo).toBeLessThan(0.2);
    expect(r.numBlocks).toBe(6);
    expect(r.numCombos).toBe(3);
    expect(r.numPaths).toBeGreaterThan(0);
  });

  it("high PBO when IS performance anti-correlates with OOS", () => {
    // Two combos that trade leadership block-to-block: whichever looks best
    // in-sample tends to look worst out-of-sample.
    const a = [1, 0, 1, 0, 1, 0, 1, 0];
    const b = [0, 1, 0, 1, 0, 1, 0, 1];
    const r = computeCpcv([a, b], { embargo: 0 });
    expect(r.pbo).toBeGreaterThan(0.5);
  });

  it("PBO stays in [0,1] for a random matrix", () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const matrix = Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => rnd() - 0.5));
    const r = computeCpcv(matrix, { embargo: 1 });
    expect(r.pbo).toBeGreaterThanOrEqual(0);
    expect(r.pbo).toBeLessThanOrEqual(1);
    expect(r.numSplits).toBeGreaterThan(0);
  });

  it("embargo purges adjacent IS blocks (fewer usable IS blocks per split)", () => {
    const matrix = Array.from({ length: 3 }, (_, k) =>
      Array.from({ length: 6 }, (_, b) => (k === 0 ? 1 : 0.1) + b * 0.001)
    );
    // Both should run without error; embargo=2 is more aggressive purging.
    const loose = computeCpcv(matrix, { embargo: 0 });
    const tight = computeCpcv(matrix, { embargo: 2 });
    expect(loose.embargo).toBe(0);
    expect(tight.embargo).toBe(2);
    expect(tight.numSplits).toBeGreaterThan(0);
  });

  it("reports the number of paths per López de Prado φ = C(N,k)·k/N", () => {
    const matrix = [Array(8).fill(1), Array(8).fill(0.5), Array(8).fill(0.2)];
    const r = computeCpcv(matrix, { embargo: 0 });
    // N=8, k=4 → C(8,4)=70, φ = 70·4/8 = 35
    expect(r.numPaths).toBe(35);
  });
});

// ─── cpcvVerdict ────────────────────────────────────────────

describe("cpcvVerdict", () => {
  const base = {
    numBlocks: 8, numCombos: 3, numSplits: 70, numPaths: 35,
    medianLogit: 0, probLossOOS: 0.2, embargo: 1,
  };

  it("fails at PBO >= 0.5", () => {
    const v = cpcvVerdict({ ...base, pbo: 0.6 });
    expect(v.verdict).toBe("fail");
    expect(v.reason).toMatch(/overfit/);
  });

  it("passes below 0.5, flags strong below 0.2", () => {
    expect(cpcvVerdict({ ...base, pbo: 0.4 }).verdict).toBe("pass");
    expect(cpcvVerdict({ ...base, pbo: 0.1 }).reason).toMatch(/strong/);
  });

  it("the boundary is exactly CPCV_PBO_FAIL", () => {
    expect(cpcvVerdict({ ...base, pbo: CPCV_PBO_FAIL }).verdict).toBe("fail");
    expect(cpcvVerdict({ ...base, pbo: CPCV_PBO_FAIL - 0.001 }).verdict).toBe("pass");
  });
});
