import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import type { LeanTrade } from "@shared/schema";

// ─────────────────────────────────────────────────────────────
//  Guard — dormant in Replit, active locally
// ─────────────────────────────────────────────────────────────

export function isLeanAvailable(): boolean {
  return process.env.LEAN_ENABLED === "true";
}

// ─────────────────────────────────────────────────────────────
//  Typed errors
// ─────────────────────────────────────────────────────────────

export class LeanUnavailableError extends Error {
  constructor() {
    super("LEAN is not enabled. Set LEAN_ENABLED=true to run real backtests.");
    this.name = "LeanUnavailableError";
  }
}

export class LeanRunError extends Error {
  constructor(message: string, public readonly stderr: string = "") {
    super(message);
    this.name = "LeanRunError";
  }
}

// ─────────────────────────────────────────────────────────────
//  Result types
// ─────────────────────────────────────────────────────────────

export interface ParsedLeanResult {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  equityCurve: Array<{ date: string; value: number }>;
  trades: LeanTrade[];
  rawResults: Record<string, unknown>;
  dataSource: "live_engine";
}

// ─────────────────────────────────────────────────────────────
//  Result parser
// ─────────────────────────────────────────────────────────────

function stripNumeric(raw: unknown, fallback = 0): number {
  if (raw === null || raw === undefined) return fallback;
  const s = String(raw).replace(/[$%,\s]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? fallback : n;
}

export function parseLeanResults(raw: Record<string, unknown>): ParsedLeanResult {
  // TODO(local): verify key path against a real LEAN results sample
  const stats = (raw["Statistics"] ?? raw["statistics"] ?? {}) as Record<string, unknown>;

  // TODO(local): confirm field names for Net Profit vs Compounding Annual Return
  const totalReturn = stripNumeric(
    stats["Net Profit"] ?? stats["Compounding Annual Return"] ?? stats["Total Return"]
  );

  // TODO(local): confirm exact key for Sharpe Ratio
  const sharpeRatio = stripNumeric(stats["Sharpe Ratio"] ?? stats["SharpeRatio"]);

  // TODO(local): confirm key: "Drawdown" vs "Maximum Drawdown"
  const maxDrawdown = stripNumeric(stats["Drawdown"] ?? stats["Maximum Drawdown"]);

  // TODO(local): confirm key: "Win Rate" vs "Win Percentage"
  const winRate = stripNumeric(stats["Win Rate"] ?? stats["Win Percentage"]);

  // TODO(local): confirm key: "Total Orders" vs "Total Trades"
  const totalTrades = stripNumeric(stats["Total Orders"] ?? stats["Total Trades"]);

  // Equity curve: Charts -> "Strategy Equity" -> Series -> "Equity" -> Values
  // TODO(local): verify this chart nesting path against a real LEAN results sample
  let equityCurve: Array<{ date: string; value: number }> = [];
  try {
    const charts = (raw["Charts"] ?? raw["charts"] ?? {}) as Record<string, unknown>;
    const stratEq = (charts["Strategy Equity"] ?? {}) as Record<string, unknown>;
    const series = (stratEq["Series"] ?? stratEq["series"] ?? {}) as Record<string, unknown>;
    const equitySeries = (series["Equity"] ?? series["equity"] ?? {}) as Record<string, unknown>;
    const values = (equitySeries["Values"] ?? equitySeries["values"] ?? []) as Array<{ x: number; y: number }>;
    equityCurve = values.map((v) => ({
      date: new Date(v.x * 1000).toISOString(),
      value: v.y,
    }));
  } catch {
    equityCurve = [];
  }

  // Trades: TotalPerformance -> ClosedTrades
  // TODO(local): verify this path and field names against a real LEAN results sample
  let trades: LeanTrade[] = [];
  try {
    const perf = (raw["TotalPerformance"] ?? raw["totalPerformance"] ?? {}) as Record<string, unknown>;
    const closed = (perf["ClosedTrades"] ?? perf["closedTrades"] ?? []) as Array<Record<string, unknown>>;
    trades = closed.map((t) => ({
      entryTime: String(t["EntryTime"] ?? t["entryTime"] ?? ""),
      exitTime: String(t["ExitTime"] ?? t["exitTime"] ?? ""),
      entryPrice: stripNumeric(t["EntryPrice"] ?? t["entryPrice"]),
      exitPrice: stripNumeric(t["ExitPrice"] ?? t["exitPrice"]),
      quantity: Math.abs(stripNumeric(t["Quantity"] ?? t["quantity"])),
      direction: String(t["Direction"] ?? t["direction"] ?? "long").toLowerCase() === "short" ? "short" : "long",
      profitLoss: stripNumeric(t["ProfitLoss"] ?? t["profitLoss"] ?? t["Profit"] ?? t["profit"]),
    }));
  } catch {
    trades = [];
  }

  return {
    totalReturn,
    sharpeRatio,
    maxDrawdown,
    winRate,
    totalTrades,
    equityCurve,
    trades,
    rawResults: raw,
    dataSource: "live_engine",
  };
}

// ─────────────────────────────────────────────────────────────
//  Runner — spawns lean CLI, dormant unless LEAN_ENABLED=true
// ─────────────────────────────────────────────────────────────

export async function runLeanBacktest({
  projectName,
  code,
}: {
  projectName: string;
  code: string;
}): Promise<ParsedLeanResult> {
  if (!/^[A-Za-z0-9_-]+$/.test(projectName)) {
    throw new Error(
      `Invalid project name "${projectName}". Only letters, numbers, hyphens, and underscores are allowed.`
    );
  }

  if (!isLeanAvailable()) {
    throw new LeanUnavailableError();
  }

  const workspaceDir = process.env.LEAN_WORKSPACE_DIR ?? "./lean-workspace";
  const projectDir = path.join(workspaceDir, projectName);

  // 1. Write strategy code to project dir
  await fs.mkdir(projectDir, { recursive: true });
  await fs.writeFile(path.join(projectDir, "main.py"), code, "utf8");

  // 2. Spawn the backtest command
  const command = process.env.LEAN_COMMAND ?? "lean";
  const args = ["backtest", projectName];
  const timeoutMs = parseInt(process.env.LEAN_BACKTEST_TIMEOUT_MS ?? "600000", 10);

  const { stdout, stderr, exitCode } = await new Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>((resolve, reject) => {
    let stdoutBuf = "";
    let stderrBuf = "";

    const child = spawn(command, args, {
      cwd: workspaceDir,
      env: process.env,
      shell: false,
    });

    child.stdout?.on("data", (d) => { stdoutBuf += d.toString(); });
    child.stderr?.on("data", (d) => { stderrBuf += d.toString(); });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new LeanRunError(`LEAN backtest timed out after ${timeoutMs}ms`, stderrBuf));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout: stdoutBuf, stderr: stderrBuf, exitCode: code ?? 1 });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new LeanRunError(`Failed to spawn lean: ${err.message}`, stderrBuf));
    });
  });

  if (exitCode !== 0) {
    throw new LeanRunError(
      `LEAN exited with code ${exitCode}. Check stderr for details.`,
      stderr
    );
  }

  // 3. Find the newest results JSON under project/backtests/<id>/
  // TODO(local): verify directory structure matches your LEAN workspace layout
  const backtestDir = path.join(projectDir, "backtests");
  let resultsJson: Record<string, unknown>;
  try {
    const entries = await fs.readdir(backtestDir, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse();

    if (dirs.length === 0) {
      throw new LeanRunError("No backtest output directory found", stderr);
    }

    const newestDir = dirs[0];
    // TODO(local): confirm the results filename (may be "<id>.json" or "results.json")
    const resultsPath = path.join(backtestDir, newestDir, `${newestDir}.json`);
    const fallbackPath = path.join(backtestDir, newestDir, "results.json");

    let raw: string;
    try {
      raw = await fs.readFile(resultsPath, "utf8");
    } catch {
      raw = await fs.readFile(fallbackPath, "utf8");
    }

    resultsJson = JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    if (err instanceof LeanRunError) throw err;
    throw new LeanRunError(
      `Could not read LEAN results JSON: ${(err as Error).message}`,
      stderr
    );
  }

  // 4. Parse and return with dataSource "live_engine"
  return parseLeanResults(resultsJson);
}
