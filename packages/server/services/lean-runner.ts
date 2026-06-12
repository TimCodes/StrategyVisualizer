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
  // Key names verified against LEAN CLI 1.0.200 output (2026-06-11):
  // top level is camelCase ("statistics"), stat keys are Title Case with
  // spaces and percent/dollar-formatted string values.
  const stats = (raw["Statistics"] ?? raw["statistics"] ?? {}) as Record<string, unknown>;

  const totalReturn = stripNumeric(
    stats["Net Profit"] ?? stats["Compounding Annual Return"] ?? stats["Total Return"]
  );
  const sharpeRatio = stripNumeric(stats["Sharpe Ratio"] ?? stats["SharpeRatio"]);
  const maxDrawdown = stripNumeric(stats["Drawdown"] ?? stats["Maximum Drawdown"]);
  const winRate = stripNumeric(stats["Win Rate"] ?? stats["Win Percentage"]);
  const totalTrades = stripNumeric(stats["Total Orders"] ?? stats["Total Trades"]);

  // Equity curve: charts -> "Strategy Equity" -> series -> "Equity" -> values
  // Verified against LEAN CLI 1.0.200 output (2026-06-11): values are
  // candlestick arrays [unixSeconds, open, high, low, close]; older engines
  // emitted {x, y} objects. Support both.
  let equityCurve: Array<{ date: string; value: number }> = [];
  try {
    const charts = (raw["Charts"] ?? raw["charts"] ?? {}) as Record<string, unknown>;
    const stratEq = (charts["Strategy Equity"] ?? {}) as Record<string, unknown>;
    const series = (stratEq["Series"] ?? stratEq["series"] ?? {}) as Record<string, unknown>;
    const equitySeries = (series["Equity"] ?? series["equity"] ?? {}) as Record<string, unknown>;
    const values = (equitySeries["Values"] ?? equitySeries["values"] ?? []) as Array<unknown>;
    equityCurve = values
      .map((v) => {
        if (Array.isArray(v) && v.length >= 2) {
          // [time, open, high, low, close] or [time, value] — last element is the close
          return { date: new Date(Number(v[0]) * 1000).toISOString(), value: Number(v[v.length - 1]) };
        }
        const obj = v as { x?: number; y?: number };
        if (obj && typeof obj.x === "number" && typeof obj.y === "number") {
          return { date: new Date(obj.x * 1000).toISOString(), value: obj.y };
        }
        return null;
      })
      .filter((p): p is { date: string; value: number } => p !== null && isFinite(p.value));
  } catch {
    equityCurve = [];
  }

  // Trades: totalPerformance -> closedTrades
  // Verified against LEAN CLI 1.0.200 output (2026-06-11): keys are camelCase
  // and `direction` is numeric (0 = long, 1 = short); some engine versions
  // emit the string form instead. Support both.
  let trades: LeanTrade[] = [];
  try {
    const perf = (raw["TotalPerformance"] ?? raw["totalPerformance"] ?? {}) as Record<string, unknown>;
    const closed = (perf["ClosedTrades"] ?? perf["closedTrades"] ?? []) as Array<Record<string, unknown>>;
    trades = closed.map((t) => {
      const rawDir = t["Direction"] ?? t["direction"];
      const isShort =
        rawDir === 1 || String(rawDir).toLowerCase() === "short" || String(rawDir) === "1";
      return {
        entryTime: String(t["EntryTime"] ?? t["entryTime"] ?? ""),
        exitTime: String(t["ExitTime"] ?? t["exitTime"] ?? ""),
        entryPrice: stripNumeric(t["EntryPrice"] ?? t["entryPrice"]),
        exitPrice: stripNumeric(t["ExitPrice"] ?? t["exitPrice"]),
        quantity: Math.abs(stripNumeric(t["Quantity"] ?? t["quantity"])),
        direction: isShort ? ("short" as const) : ("long" as const),
        profitLoss: stripNumeric(t["ProfitLoss"] ?? t["profitLoss"] ?? t["Profit"] ?? t["profit"]),
      };
    });
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
  parameters,
}: {
  projectName: string;
  code: string;
  /**
   * Forwarded to the algorithm via the project config.json "parameters"
   * object — read in Python with self.get_parameter("name"). Used by the
   * walk-forward runner to inject window dates (wf_start/wf_end) and
   * grid values.
   */
  parameters?: Record<string, string | number>;
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

  // 1. Write strategy code (and parameters, if any) to the project dir
  await fs.mkdir(projectDir, { recursive: true });
  await fs.writeFile(path.join(projectDir, "main.py"), code, "utf8");
  if (parameters && Object.keys(parameters).length > 0) {
    const stringified: Record<string, string> = {};
    for (const [k, v] of Object.entries(parameters)) stringified[k] = String(v);
    await fs.writeFile(
      path.join(projectDir, "config.json"),
      JSON.stringify(
        { "algorithm-language": "Python", parameters: stringified },
        null,
        2
      ),
      "utf8"
    );
  }

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

  // 3. Find the newest results JSON under project/backtests/<timestamp>/
  // Verified against LEAN CLI 1.0.200 (2026-06-11): the output directory is
  // named with a run timestamp (e.g. 2026-06-11_16-30-48) and the main
  // results file is "<algorithmId>.json" (a numeric id, e.g. 1822130418.json),
  // alongside "<id>-summary.json" and "<id>-order-events.json" which we skip.
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
    const runDir = path.join(backtestDir, newestDir);
    const files = await fs.readdir(runDir);

    // Primary: the numeric-id main results file. Fallbacks cover older CLI layouts.
    const mainResults =
      files.find((f) => /^\d+\.json$/.test(f)) ??
      files.find((f) => f === `${newestDir}.json`) ??
      files.find((f) => f === "results.json");

    if (!mainResults) {
      throw new LeanRunError(
        `No results JSON found in ${runDir} (files: ${files.join(", ")})`,
        stderr
      );
    }

    const raw = await fs.readFile(path.join(runDir, mainResults), "utf8");
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
