import { describe, it, expect, beforeEach } from "vitest";
import { MemStorage } from "../storage";

// Force the in-memory path: with no DATABASE_URL, getDb() returns null
// and every method exercises its Map fallback.
delete process.env.DATABASE_URL;

let storage: MemStorage;

beforeEach(() => {
  storage = new MemStorage();
});

describe("trades", () => {
  it("creates a trade with zero pnl for an opening buy", async () => {
    const trade = await storage.createTrade({
      symbol: "SOL",
      type: "buy",
      quantity: 10,
      price: 100,
      strategyId: "1",
    });
    expect(trade.id).toBeTruthy();
    expect(trade.pnl).toBe(0);
    expect(trade.timestamp).toBeInstanceOf(Date);
  });

  it("computes FIFO pnl on a closing sell", async () => {
    await storage.createTrade({ symbol: "SOL", type: "buy", quantity: 10, price: 100, strategyId: "1" });
    const sell = await storage.createTrade({ symbol: "SOL", type: "sell", quantity: 10, price: 110, strategyId: "1" });
    expect(sell.pnl).toBe(100); // (110 - 100) * 10
  });

  it("filters trades by strategy", async () => {
    await storage.createTrade({ symbol: "SOL", type: "buy", quantity: 1, price: 100, strategyId: "stratA" });
    await storage.createTrade({ symbol: "DOT", type: "buy", quantity: 1, price: 10, strategyId: "stratB" });
    const a = await storage.getTradesByStrategy("stratA");
    expect(a).toHaveLength(1);
    expect(a[0].symbol).toBe("SOL");
  });

  it("persists created trades in getTrades", async () => {
    const before = (await storage.getTrades()).length;
    await storage.createTrade({ symbol: "SOL", type: "buy", quantity: 1, price: 100, strategyId: "1" });
    expect((await storage.getTrades()).length).toBe(before + 1);
  });
});

describe("backtest results", () => {
  const insert = {
    strategyName: "Test Strat",
    strategyDescription: "desc",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-06-01"),
    totalReturn: 10,
    sharpeRatio: 1.2,
    maxDrawdown: -5,
    winRate: 55,
    totalTrades: 42,
    status: "completed" as const,
    dataSource: "simulated" as const,
  };

  it("creates and lists a backtest", async () => {
    const created = await storage.createBacktest(insert);
    expect(created.id).toBeTruthy();
    expect(created.dataSource).toBe("simulated");
    const all = await storage.getBacktestResults();
    expect(all.some((b) => b.id === created.id)).toBe(true);
  });

  it("updates an existing backtest", async () => {
    const created = await storage.createBacktest(insert);
    const updated = await storage.updateBacktest(created.id, { status: "failed" });
    expect(updated.status).toBe("failed");
    expect(updated.strategyName).toBe("Test Strat");
  });

  it("throws for a missing backtest id", async () => {
    await expect(storage.updateBacktest("nope", { status: "failed" })).rejects.toThrow(
      "Backtest not found"
    );
  });
});

describe("chat messages", () => {
  it("creates and lists messages in order", async () => {
    await storage.createChatMessage({ role: "user", content: "hi" });
    await storage.createChatMessage({ role: "assistant", content: "hello" });
    const msgs = await storage.getChatMessages();
    expect(msgs).toHaveLength(2);
    expect(msgs[0].content).toBe("hi");
    expect(msgs[1].role).toBe("assistant");
  });

  it("clears history", async () => {
    await storage.createChatMessage({ role: "user", content: "hi" });
    await storage.clearChatHistory();
    expect(await storage.getChatMessages()).toHaveLength(0);
  });
});

describe("gate results", () => {
  it("records and returns results most recent first", async () => {
    await storage.recordGateResult({
      strategyId: "s1", gate: "monte_carlo", verdict: "pass",
      metrics: { x: 1 }, dataSource: "live_engine", reason: "ok",
    });
    await storage.recordGateResult({
      strategyId: "s1", gate: "walk_forward", verdict: "cannot_evaluate",
      metrics: null, dataSource: "simulated", reason: "simulated",
    });
    const results = await storage.getGateResults("s1");
    expect(results).toHaveLength(2);
    expect(results[0].computedAt.getTime()).toBeGreaterThanOrEqual(results[1].computedAt.getTime());
  });

  it("scopes results to the strategy", async () => {
    await storage.recordGateResult({
      strategyId: "s1", gate: "monte_carlo", verdict: "pass",
      metrics: null, dataSource: "live_engine", reason: null,
    });
    expect(await storage.getGateResults("other")).toHaveLength(0);
  });
});

describe("trials", () => {
  it("counts trials by type and strategy", async () => {
    await storage.recordTrial({ trialType: "generation", strategyId: "s1" });
    await storage.recordTrial({ trialType: "optimization", strategyId: "s1" });
    await storage.recordTrial({ trialType: "optimization", strategyId: "s2" });
    const s1 = await storage.getTrialCount("s1");
    expect(s1.total).toBe(2);
    expect(s1.byType.optimization).toBe(1);
    const all = await storage.getTrialCount();
    expect(all.total).toBe(3);
  });
});

describe("portfolio metrics", () => {
  it("derives metrics from the trade log", async () => {
    const metrics = await storage.getPortfolioMetrics();
    // Seed data has three trades; metrics must reflect their P&L
    expect(metrics.totalValue).toBeGreaterThan(0);
    expect(metrics.winRate).toBeGreaterThan(0);
  });
});

describe("strategies (memory path regression)", () => {
  it("gate transitions advance one stage and append history", async () => {
    const created = await storage.createStrategy({
      name: "T", description: "d", type: "momentum", status: "active",
      performance: 0, sharpeRatio: 0, maxDrawdown: 0, winRate: 0, totalTrades: 0,
      stage: "idea", gateStatus: "in_progress", gateHistory: [],
      refinementHistory: [], incubationObservations: [],
    });
    const after = await storage.recordGate(created.id, { result: "passed" });
    expect(after.stage).toBe("feasibility");
    expect(after.gateHistory).toHaveLength(1);
    expect(after.gateHistory[0].stage).toBe("idea");
  });
});
