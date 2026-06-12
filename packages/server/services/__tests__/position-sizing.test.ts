import { describe, it, expect } from "vitest";
import {
  simulateTrades,
  sweepFixedFraction,
  solveStartingCapital,
  largestLosingTrade,
} from "../position-sizing";
import { computeMonteCarloFromTrades, SIMULATED_REASON } from "../gates";

// 60% win rate, +$300 winners / -$200 losers → positive expectancy (+$100/trade)
const WINNING_TRADES = [
  ...Array(60).fill(300),
  ...Array(40).fill(-200),
];

// 40% win rate, +$200 winners / -$300 losers → negative expectancy
const LOSING_TRADES = [
  ...Array(40).fill(200),
  ...Array(60).fill(-300),
];

describe("simulateTrades", () => {
  it("a positive-expectancy system shows positive median return and high profit probability", () => {
    const r = simulateTrades({ trades: WINNING_TRADES, startingEquity: 100000, tradesPerYear: 100 });
    expect(r.medianReturn).toBeGreaterThan(0);
    expect(r.probProfit).toBeGreaterThan(0.8);
    expect(r.riskOfRuin).toBe(0); // $100k account, $200 losses — ruin unreachable
  });

  it("a negative-expectancy system shows negative median return", () => {
    const r = simulateTrades({ trades: LOSING_TRADES, startingEquity: 100000, tradesPerYear: 100 });
    expect(r.medianReturn).toBeLessThan(0);
    expect(r.probProfit).toBeLessThan(0.5);
  });

  it("a small account has higher risk of ruin than a large one", () => {
    const small = simulateTrades({ trades: LOSING_TRADES, startingEquity: 3000, quittingEquity: 1500, tradesPerYear: 100 });
    const large = simulateTrades({ trades: LOSING_TRADES, startingEquity: 50000, quittingEquity: 1500, tradesPerYear: 100 });
    expect(small.riskOfRuin).toBeGreaterThan(large.riskOfRuin);
  });

  it("is reproducible for the same seed and differs across seeds", () => {
    const a = simulateTrades({ trades: WINNING_TRADES, startingEquity: 10000, seed: 7, iterations: 300 });
    const b = simulateTrades({ trades: WINNING_TRADES, startingEquity: 10000, seed: 7, iterations: 300 });
    const c = simulateTrades({ trades: WINNING_TRADES, startingEquity: 10000, seed: 8, iterations: 300 });
    expect(a.medianReturn).toBe(b.medianReturn);
    expect(a.medianReturn).not.toBe(c.medianReturn);
  });

  it("collects monotone non-decreasing median bands for a winning system", () => {
    const r = simulateTrades({
      trades: WINNING_TRADES,
      startingEquity: 100000,
      tradesPerYear: 50,
      collectBands: true,
    });
    expect(r.bands).toHaveLength(50);
    const first = r.bands![0];
    const last = r.bands![49];
    expect(last.p50).toBeGreaterThan(first.p50);
    // band ordering invariant
    for (const b of r.bands!) {
      expect(b.p2_5).toBeLessThanOrEqual(b.p10);
      expect(b.p10).toBeLessThanOrEqual(b.p50);
      expect(b.p50).toBeLessThanOrEqual(b.p90);
      expect(b.p90).toBeLessThanOrEqual(b.p97_5);
    }
  });

  it("the lower band of a winning system can stay negative early (Davey Fig 23.8)", () => {
    const r = simulateTrades({
      trades: WINNING_TRADES,
      startingEquity: 100000,
      tradesPerYear: 30,
      collectBands: true,
    });
    // Even with positive expectancy, bad luck keeps the 2.5th percentile under water early
    expect(r.bands![4].p2_5).toBeLessThan(0);
  });

  it("validates inputs", () => {
    expect(() => simulateTrades({ trades: [], startingEquity: 1000 })).toThrow();
    expect(() =>
      simulateTrades({ trades: WINNING_TRADES, startingEquity: 1000, fixedFraction: 0.5 })
    ).toThrow(/largestLoss/);
    expect(() =>
      simulateTrades({ trades: WINNING_TRADES, startingEquity: 1000, fixedFraction: 1.5, largestLoss: 200 })
    ).toThrow(/fixedFraction/);
  });
});

describe("sweepFixedFraction", () => {
  const constraints = { maxDrawdownPct: 30, maxRiskOfRuin: 0.1 };

  it("return rises with f, then collapses past the blowup point (Davey Fig 16.1)", () => {
    const sweep = sweepFixedFraction({
      trades: WINNING_TRADES,
      largestLoss: 200,
      startingEquity: 20000,
      tradesPerYear: 100,
      iterations: 400,
      fValues: [0.05, 0.15, 0.6],
      constraints,
    });
    const [lowF, midF, extremeF] = sweep.points;
    // Risk and reward are a team on the way up…
    expect(midF.medianReturn).toBeGreaterThan(lowF.medianReturn);
    expect(midF.medianMaxDD).toBeGreaterThan(lowF.medianMaxDD);
    // …but a winning system becomes a loser when oversized
    expect(extremeF.medianReturn).toBeLessThan(midF.medianReturn);
    expect(extremeF.riskOfRuin).toBeGreaterThan(midF.riskOfRuin);
  });

  it("recommends an f that satisfies the constraints, below or at optimal f", () => {
    const sweep = sweepFixedFraction({
      trades: WINNING_TRADES,
      largestLoss: 200,
      startingEquity: 20000,
      tradesPerYear: 100,
      iterations: 400,
      constraints,
    });
    expect(sweep.recommended).not.toBeNull();
    expect(sweep.recommended!.medianMaxDD * 100).toBeLessThanOrEqual(constraints.maxDrawdownPct);
    expect(sweep.recommended!.riskOfRuin).toBeLessThanOrEqual(constraints.maxRiskOfRuin);
    expect(sweep.recommended!.f).toBeLessThanOrEqual(sweep.optimalF.f);
  });

  it("never recommends an f for a losing system (losers cannot become winners)", () => {
    const sweep = sweepFixedFraction({
      trades: LOSING_TRADES,
      largestLoss: 300,
      startingEquity: 20000,
      tradesPerYear: 100,
      iterations: 300,
      constraints,
    });
    expect(sweep.recommended).toBeNull();
  });
});

describe("solveStartingCapital", () => {
  it("finds a capital level that brings ruin under the threshold", () => {
    const r = solveStartingCapital({
      trades: WINNING_TRADES,
      quittingEquity: 3000,
      maxRiskOfRuin: 0.1,
      tradesPerYear: 100,
      iterations: 400,
    });
    expect(r.requiredCapital).not.toBeNull();
    expect(r.requiredCapital!).toBeGreaterThan(3000);
    expect(r.riskOfRuin!).toBeLessThanOrEqual(0.1);
  });

  it("requires more capital for a stricter ruin threshold", () => {
    const loose = solveStartingCapital({
      trades: WINNING_TRADES, quittingEquity: 3000, maxRiskOfRuin: 0.2, tradesPerYear: 100, iterations: 400,
    });
    const strict = solveStartingCapital({
      trades: WINNING_TRADES, quittingEquity: 3000, maxRiskOfRuin: 0.02, tradesPerYear: 100, iterations: 400,
    });
    expect(strict.requiredCapital!).toBeGreaterThanOrEqual(loose.requiredCapital!);
  });
});

describe("largestLosingTrade", () => {
  it("returns the absolute largest loss", () => {
    expect(largestLosingTrade([100, -250, -50, 300])).toBe(250);
  });
  it("returns 0 when there are no losses", () => {
    expect(largestLosingTrade([100, 200])).toBe(0);
  });
});

describe("computeMonteCarloFromTrades (gate integration)", () => {
  const trades = WINNING_TRADES.map((profitLoss) => ({ profitLoss }));

  it("blocks simulated data before any computation", () => {
    const r = computeMonteCarloFromTrades({ dataSource: "simulated", trades });
    expect(r.verdict).toBe("cannot_evaluate");
    expect(r.reason).toBe(SIMULATED_REASON);
  });

  it("cannot evaluate with too few trades", () => {
    const r = computeMonteCarloFromTrades({
      dataSource: "live_engine",
      trades: trades.slice(0, 5),
    });
    expect(r.verdict).toBe("cannot_evaluate");
    expect(r.reason).toMatch(/at least 10/);
  });

  it("passes a healthy system and reports Davey's Ch 19 outputs", () => {
    const r = computeMonteCarloFromTrades(
      { dataSource: "live_engine", trades },
      { startingEquity: 20000, tradesPerYear: 100 }
    );
    expect(r.verdict).toBe("pass");
    const m = r.metrics as any;
    expect(m.engine).toBe("trade_level");
    expect(m.probProfit).toBeGreaterThan(0.8);
    expect(m.medianRetDDRatio).toBeGreaterThan(2);
    expect(m.bands.length).toBe(100);
  });

  it("fails a losing system", () => {
    const r = computeMonteCarloFromTrades(
      { dataSource: "live_engine", trades: LOSING_TRADES.map((profitLoss) => ({ profitLoss })) },
      { startingEquity: 20000, tradesPerYear: 100 }
    );
    expect(r.verdict).toBe("fail");
  });
});
