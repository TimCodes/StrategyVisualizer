// ─────────────────────────────────────────────────────────────
//  Davey Ch 14/16/19/20 — trade-level Monte Carlo simulation,
//  fixed-fractional position sizing (f-sweep), and the
//  starting-capital solver.
//
//  Pure functions only: no storage, no engine. The MC gate in
//  gates.ts and the sizing routes build on these.
// ─────────────────────────────────────────────────────────────

/** Deterministic PRNG so results are reproducible run-to-run. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function percentileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export interface TradeSimConfig {
  /** Per-trade dollar P&L distribution to resample (single-contract basis) */
  trades: number[];
  iterations?: number; // default 2500
  /** How many trades to simulate per iteration (≈ one year, Davey Ch 19) */
  tradesPerYear?: number; // default: trades.length
  startingEquity: number;
  /** Equity at or below which the account is "ruined" and the run stops */
  quittingEquity?: number; // default: 50% of starting equity
  /**
   * Fixed fraction f for position sizing: contracts = floor(f·equity/largestLoss).
   * Omit for single-contract simulation (Davey's gate-level default).
   */
  fixedFraction?: number;
  /** Largest historical losing trade (absolute $); required when fixedFraction is set */
  largestLoss?: number;
  seed?: number;
  /** Collect cumulative-P&L percentile bands per trade index (Phase 7 monitoring) */
  collectBands?: boolean;
}

export interface TradeSimResult {
  iterations: number;
  tradesPerYear: number;
  startingEquity: number;
  quittingEquity: number;
  /** Median final return over the simulated year, fraction (0.25 = +25%) */
  medianReturn: number;
  /** Median max drawdown over the year, fraction of peak */
  medianMaxDD: number;
  /** medianReturn / medianMaxDD (Davey's ret/DD; Infinity when DD is 0) */
  retDDRatio: number;
  /** Fraction of iterations that hit quittingEquity */
  riskOfRuin: number;
  /** Fraction of iterations ending above startingEquity */
  probProfit: number;
  percentiles: {
    return: { p5: number; p25: number; p50: number; p75: number; p95: number };
    maxDD: { p5: number; p25: number; p50: number; p75: number; p95: number };
  };
  /**
   * Cumulative single-iteration P&L percentiles at each trade index
   * (1-based): used as expectation bands when monitoring forward results.
   */
  bands?: Array<{ trade: number; p2_5: number; p10: number; p50: number; p90: number; p97_5: number }>;
}

export function simulateTrades(config: TradeSimConfig): TradeSimResult {
  const {
    trades,
    startingEquity,
    fixedFraction,
    largestLoss,
    collectBands = false,
  } = config;
  if (trades.length === 0) throw new Error("No trades to resample");
  if (startingEquity <= 0) throw new Error("startingEquity must be positive");
  if (fixedFraction !== undefined) {
    if (fixedFraction <= 0 || fixedFraction > 1) throw new Error("fixedFraction must be in (0, 1]");
    if (!largestLoss || largestLoss <= 0) {
      throw new Error("largestLoss (absolute $) is required for fixed-fractional sizing");
    }
  }

  const iterations = config.iterations ?? 2500;
  const tradesPerYear = config.tradesPerYear ?? trades.length;
  const quittingEquity = config.quittingEquity ?? startingEquity * 0.5;
  const rand = mulberry32(config.seed ?? 42);

  const finalReturns: number[] = [];
  const maxDDs: number[] = [];
  let ruinCount = 0;
  let profitCount = 0;
  // bandSamples[t] = cumulative P&L of every iteration after trade t+1
  const bandSamples: number[][] = collectBands
    ? Array.from({ length: tradesPerYear }, () => [])
    : [];

  for (let it = 0; it < iterations; it++) {
    let equity = startingEquity;
    let peak = equity;
    let maxDD = 0;
    let ruined = false;

    for (let t = 0; t < tradesPerYear; t++) {
      if (!ruined) {
        const pnl = trades[Math.floor(rand() * trades.length)];
        const contracts =
          fixedFraction !== undefined
            ? Math.floor((fixedFraction * equity) / (largestLoss as number))
            : 1;
        equity += pnl * contracts;
        if (equity > peak) peak = equity;
        if (peak > 0) maxDD = Math.max(maxDD, (peak - equity) / peak);
        if (equity <= quittingEquity) {
          ruined = true; // stop trading; equity freezes at the ruin level
        }
      }
      if (collectBands) bandSamples[t].push(equity - startingEquity);
    }

    if (ruined) ruinCount++;
    if (equity > startingEquity) profitCount++;
    finalReturns.push(equity / startingEquity - 1);
    maxDDs.push(maxDD);
  }

  finalReturns.sort((a, b) => a - b);
  maxDDs.sort((a, b) => a - b);
  const medianReturn = percentileSorted(finalReturns, 50);
  const medianMaxDD = percentileSorted(maxDDs, 50);

  const bands = collectBands
    ? bandSamples.map((samples, i) => {
        const s = [...samples].sort((a, b) => a - b);
        return {
          trade: i + 1,
          p2_5: percentileSorted(s, 2.5),
          p10: percentileSorted(s, 10),
          p50: percentileSorted(s, 50),
          p90: percentileSorted(s, 90),
          p97_5: percentileSorted(s, 97.5),
        };
      })
    : undefined;

  return {
    iterations,
    tradesPerYear,
    startingEquity,
    quittingEquity,
    medianReturn,
    medianMaxDD,
    retDDRatio: medianMaxDD > 0 ? medianReturn / medianMaxDD : medianReturn > 0 ? Infinity : 0,
    riskOfRuin: ruinCount / iterations,
    probProfit: profitCount / iterations,
    percentiles: {
      return: {
        p5: percentileSorted(finalReturns, 5),
        p25: percentileSorted(finalReturns, 25),
        p50: medianReturn,
        p75: percentileSorted(finalReturns, 75),
        p95: percentileSorted(finalReturns, 95),
      },
      maxDD: {
        p5: percentileSorted(maxDDs, 5),
        p25: percentileSorted(maxDDs, 25),
        p50: medianMaxDD,
        p75: percentileSorted(maxDDs, 75),
        p95: percentileSorted(maxDDs, 95),
      },
    },
    bands,
  };
}

// ─────────────────────────────────────────────────────────────
//  Fixed-fractional f-sweep (Davey Fig 16.1)
// ─────────────────────────────────────────────────────────────

export interface FSweepPoint {
  f: number;
  medianReturn: number;
  medianMaxDD: number;
  retDDRatio: number;
  riskOfRuin: number;
  probProfit: number;
}

export interface FSweepResult {
  points: FSweepPoint[];
  /**
   * Largest-return point that satisfies the constraints — Davey's pick.
   * null when no f qualifies ("losing systems cannot become winners").
   */
  recommended: FSweepPoint | null;
  /**
   * Unconstrained peak (≈ Vince's optimal f). Reference only — Davey:
   * "Wow! Those values are too high for me." Never trade this.
   */
  optimalF: FSweepPoint;
  constraints: { maxDrawdownPct: number; maxRiskOfRuin: number };
}

export function sweepFixedFraction({
  trades,
  largestLoss,
  startingEquity,
  quittingEquity,
  tradesPerYear,
  iterations = 1000,
  fValues,
  constraints,
  seed = 42,
}: {
  trades: number[];
  largestLoss: number;
  startingEquity: number;
  quittingEquity?: number;
  tradesPerYear?: number;
  iterations?: number;
  fValues?: number[];
  constraints: { maxDrawdownPct: number; maxRiskOfRuin: number };
  seed?: number;
}): FSweepResult {
  const fs = fValues ?? Array.from({ length: 40 }, (_, i) => Number((0.025 * (i + 1)).toFixed(3)));
  const points: FSweepPoint[] = fs.map((f) => {
    const r = simulateTrades({
      trades,
      largestLoss,
      startingEquity,
      quittingEquity,
      tradesPerYear,
      iterations,
      fixedFraction: f,
      seed, // same seed per point → smooth, comparable curves
    });
    return {
      f,
      medianReturn: r.medianReturn,
      medianMaxDD: r.medianMaxDD,
      retDDRatio: r.retDDRatio,
      riskOfRuin: r.riskOfRuin,
      probProfit: r.probProfit,
    };
  });

  let optimalF = points[0];
  for (const p of points) if (p.medianReturn > optimalF.medianReturn) optimalF = p;

  const qualifying = points.filter(
    (p) =>
      p.medianMaxDD * 100 <= constraints.maxDrawdownPct &&
      p.riskOfRuin <= constraints.maxRiskOfRuin &&
      p.medianReturn > 0
  );
  let recommended: FSweepPoint | null = null;
  for (const p of qualifying) {
    if (!recommended || p.medianReturn > recommended.medianReturn) recommended = p;
  }

  return { points, recommended, optimalF, constraints };
}

// ─────────────────────────────────────────────────────────────
//  Starting-capital solver (Davey Ch 19/20: smallest account
//  that keeps risk of ruin under the goal)
// ─────────────────────────────────────────────────────────────

export interface CapitalSolverResult {
  requiredCapital: number | null;
  riskOfRuin: number | null;
  medianReturn: number | null;
  searched: Array<{ capital: number; riskOfRuin: number }>;
}

export function solveStartingCapital({
  trades,
  quittingEquity,
  maxRiskOfRuin = 0.1,
  tradesPerYear,
  iterations = 1000,
  seed = 42,
}: {
  trades: number[];
  /** Absolute equity floor (margin/min account); ruin = touching it */
  quittingEquity: number;
  maxRiskOfRuin?: number;
  tradesPerYear?: number;
  iterations?: number;
  seed?: number;
}): CapitalSolverResult {
  if (quittingEquity <= 0) throw new Error("quittingEquity must be positive");
  const largestLossAbs = Math.max(...trades.map((t) => Math.abs(Math.min(t, 0))), 1);
  const searched: Array<{ capital: number; riskOfRuin: number }> = [];

  const ruinAt = (capital: number): number => {
    const r = simulateTrades({
      trades,
      startingEquity: capital,
      quittingEquity,
      tradesPerYear,
      iterations,
      seed, // identical seed → ruin is monotone in capital, bisection is valid
    });
    searched.push({ capital, riskOfRuin: r.riskOfRuin });
    return r.riskOfRuin;
  };

  // Bracket: low = just above the floor; high grows until ruin is acceptable
  let lo = quittingEquity * 1.05;
  let hi = quittingEquity + largestLossAbs * 4;
  let hiRuin = ruinAt(hi);
  let growths = 0;
  while (hiRuin > maxRiskOfRuin && growths < 12) {
    hi *= 2;
    hiRuin = ruinAt(hi);
    growths++;
  }
  if (hiRuin > maxRiskOfRuin) {
    return { requiredCapital: null, riskOfRuin: null, medianReturn: null, searched };
  }

  for (let i = 0; i < 20 && (hi - lo) / hi > 0.01; i++) {
    const mid = (lo + hi) / 2;
    if (ruinAt(mid) <= maxRiskOfRuin) hi = mid;
    else lo = mid;
  }

  const final = simulateTrades({
    trades,
    startingEquity: hi,
    quittingEquity,
    tradesPerYear,
    iterations,
    seed,
  });
  return {
    requiredCapital: Math.ceil(hi),
    riskOfRuin: final.riskOfRuin,
    medianReturn: final.medianReturn,
    searched,
  };
}

/** Largest absolute losing trade — the denominator of fixed-fractional sizing. */
export function largestLosingTrade(trades: number[]): number {
  return Math.max(...trades.map((t) => Math.abs(Math.min(t, 0))), 0);
}
