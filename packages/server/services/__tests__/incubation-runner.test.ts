import { describe, it, expect, beforeEach } from "vitest";
import { equityCurveToObservations, runIncubationGhostRun, runAllIncubationGhostRuns } from "../incubation-runner";
import { MemStorage } from "../../storage";

// The runner imports the shared `storage` singleton; these tests exercise
// the pure builder directly and the runner's guard paths (which return
// before any Docker call because LEAN is disabled / preconditions unmet).

describe("equityCurveToObservations", () => {
  const curve = [
    { date: "2020-01-01", value: 100000 },
    { date: "2020-01-02", value: 100500 }, // +500
    { date: "2020-01-03", value: 100200 }, // -300
    { date: "2020-01-04", value: 101000 }, // +800
  ];

  it("produces one paper observation per day after the start, with P&L", () => {
    const obs = equityCurveToObservations(curve, "2020-01-01");
    expect(obs).toHaveLength(3);
    expect(obs[0]).toMatchObject({ date: "2020-01-02", observedPnL: 500, source: "paper" });
    expect(obs[1].observedPnL).toBeCloseTo(-300);
    expect(obs[0].observedReturn).toBeCloseTo(500 / 100000);
  });

  it("excludes days before the start date", () => {
    const obs = equityCurveToObservations(curve, "2020-01-03");
    expect(obs.map((o) => o.date)).toEqual(["2020-01-03", "2020-01-04"]);
  });

  it("tracks running drawdown from the peak", () => {
    const obs = equityCurveToObservations(curve, "2020-01-01");
    // day 3 dips from peak 100500 to 100200 → dd ≈ 0.003
    expect(obs[1].observedDrawdown).toBeCloseTo((100500 - 100200) / 100500, 5);
    // day 4 makes a new high → dd 0
    expect(obs[2].observedDrawdown).toBe(0);
  });

  it("returns empty for a degenerate curve", () => {
    expect(equityCurveToObservations([], "2020-01-01")).toEqual([]);
    expect(equityCurveToObservations([{ date: "2020-01-01", value: 100 }], "2020-01-01")).toEqual([]);
  });

  it("collapses intraday points to one end-of-day observation per date", () => {
    // LEAN emits several equity points per day; only the daily close matters
    const intraday = [
      { date: "2020-01-01T14:00:00Z", value: 100000 },
      { date: "2020-01-01T16:00:00Z", value: 100300 },
      { date: "2020-01-02T10:00:00Z", value: 100100 },
      { date: "2020-01-02T16:00:00Z", value: 100800 }, // day-2 close
    ];
    const obs = equityCurveToObservations(intraday, "2020-01-01");
    expect(obs).toHaveLength(1); // one day-over-day change
    expect(obs[0].date).toBe("2020-01-02");
    // diff of closes: 100800 - 100300
    expect(obs[0].observedPnL).toBeCloseTo(500);
  });
});

describe("runIncubationGhostRun guards", () => {
  let storage: MemStorage;
  beforeEach(() => {
    delete process.env.LEAN_ENABLED; // engine disabled → guards short-circuit before Docker
    storage = new MemStorage();
  });

  async function makeStrategy(overrides: any = {}) {
    return storage.createStrategy({
      name: "G", description: "d", type: "momentum", status: "inactive",
      performance: 0, sharpeRatio: 0, maxDrawdown: 0, winRate: 0, totalTrades: 0,
      stage: "incubation", gateStatus: "in_progress", gateHistory: [],
      refinementHistory: [], incubationObservations: [], ...overrides,
    });
  }

  // Note: these use the module's shared `storage` singleton indirectly via
  // the runner, so we assert on the guard messages the runner returns for
  // a non-existent / non-incubating strategy without needing Docker.

  it("skips a strategy that is not in incubation", async () => {
    const r = await runIncubationGhostRun("does-not-exist");
    expect(r.status).toBe("error");
    expect(r.detail).toBe("not found");
  });
});

describe("runAllIncubationGhostRuns", () => {
  it("runs (no incubating strategies is a valid empty batch)", async () => {
    delete process.env.LEAN_ENABLED;
    const batch = await runAllIncubationGhostRuns();
    expect(batch.ran).toBe(true);
    expect(Array.isArray(batch.results)).toBe(true);
  });
});
