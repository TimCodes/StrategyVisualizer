import { describe, it, expect } from "vitest";
import { parseLeanResults, isLeanAvailable, LeanUnavailableError } from "../lean-runner";
import fixture from "./fixtures/lean-sample.json";

describe("isLeanAvailable", () => {
  it("returns false when LEAN_ENABLED is unset", () => {
    delete process.env.LEAN_ENABLED;
    expect(isLeanAvailable()).toBe(false);
  });

  it("returns false when LEAN_ENABLED is 'false'", () => {
    process.env.LEAN_ENABLED = "false";
    expect(isLeanAvailable()).toBe(false);
    delete process.env.LEAN_ENABLED;
  });

  it("returns true only when LEAN_ENABLED is exactly 'true'", () => {
    process.env.LEAN_ENABLED = "true";
    expect(isLeanAvailable()).toBe(true);
    delete process.env.LEAN_ENABLED;
  });
});

describe("LeanUnavailableError", () => {
  it("is thrown when LEAN_ENABLED is not set", async () => {
    delete process.env.LEAN_ENABLED;
    const { runLeanBacktest } = await import("../lean-runner");
    await expect(
      runLeanBacktest({ projectName: "test", code: "class T: pass" })
    ).rejects.toThrow(LeanUnavailableError);
  });
});

describe("parseLeanResults", () => {
  const result = parseLeanResults(fixture as Record<string, unknown>);

  it("parses totalReturn from Net Profit", () => {
    expect(result.totalReturn).toBeCloseTo(24.67);
  });

  it("parses sharpeRatio", () => {
    expect(result.sharpeRatio).toBeCloseTo(1.84);
  });

  it("parses maxDrawdown", () => {
    expect(result.maxDrawdown).toBeCloseTo(8.32);
  });

  it("parses winRate", () => {
    expect(result.winRate).toBeCloseTo(68.4);
  });

  it("parses totalTrades", () => {
    expect(result.totalTrades).toBe(247);
  });

  it("returns a non-empty equityCurve", () => {
    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.equityCurve[0]).toHaveProperty("date");
    expect(result.equityCurve[0]).toHaveProperty("value");
    expect(result.equityCurve[0].value).toBe(100000);
  });

  it("returns a non-empty trades array", () => {
    expect(result.trades.length).toBe(3);
  });

  it("maps trade fields correctly", () => {
    const t = result.trades[0];
    expect(t.entryTime).toBe("2023-01-02T09:30:00");
    expect(t.exitTime).toBe("2023-01-03T16:00:00");
    expect(t.entryPrice).toBe(130.5);
    expect(t.exitPrice).toBe(133.2);
    expect(t.quantity).toBe(100);
    expect(t.direction).toBe("long");
    expect(t.profitLoss).toBe(270.0);
  });

  it("maps a losing trade correctly", () => {
    const t = result.trades[1];
    expect(t.profitLoss).toBe(-170.0);
    expect(t.direction).toBe("long");
  });

  it("always marks dataSource as live_engine", () => {
    expect(result.dataSource).toBe("live_engine");
  });

  it("preserves rawResults", () => {
    expect(result.rawResults).toHaveProperty("Statistics");
    expect(result.rawResults).toHaveProperty("Charts");
    expect(result.rawResults).toHaveProperty("TotalPerformance");
  });
});

describe("parseLeanResults — defensive fallbacks", () => {
  it("returns zeros for missing Statistics keys", () => {
    const r = parseLeanResults({});
    expect(r.totalReturn).toBe(0);
    expect(r.sharpeRatio).toBe(0);
    expect(r.maxDrawdown).toBe(0);
    expect(r.winRate).toBe(0);
    expect(r.totalTrades).toBe(0);
  });

  it("returns empty arrays for missing Charts and trades", () => {
    const r = parseLeanResults({});
    expect(r.equityCurve).toEqual([]);
    expect(r.trades).toEqual([]);
  });

  it("strips % signs from percentage strings", () => {
    const r = parseLeanResults({ Statistics: { "Net Profit": "15.5%", "Sharpe Ratio": "1.2" } });
    expect(r.totalReturn).toBeCloseTo(15.5);
    expect(r.sharpeRatio).toBeCloseTo(1.2);
  });

  it("strips $ signs from dollar amounts", () => {
    const r = parseLeanResults({ Statistics: { "Net Profit": "$12,345.67" } });
    expect(r.totalReturn).toBeCloseTo(12345.67);
  });
});
