import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { computeMonteCarlo, computeMonteCarloFromTrades, computeDeflatedSharpe, assertEvaluable, persistGateResult, computeIncubationVerdict, computeFeasibility } from "../services/gates";
import { sweepFixedFraction, solveStartingCapital, largestLosingTrade } from "../services/position-sizing";
import { analyzeDiversification } from "../services/diversification";
import { buildTrackingReport } from "../services/monitoring";
import { walkForwardCannotEvaluate, pboCannotEvaluate } from "../services/pbo";
import { executeWalkForward } from "../services/walk-forward-runner";
import { isLeanAvailable } from "../services/lean-runner";
import { emitToSocket, getIO } from "../ws";
import { incubationObservationSchema, walkForwardConfigSchema, setSizingPlanBodySchema } from "@shared/schema";

// ─── request body schemas ───────────────────────────────────

const equityCurvePointSchema = z.object({
  date: z.string(),
  value: z.number(),
});

const backtestInputSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().optional(),
  status: z.string().optional(),
  totalReturn: z.number(),
  sharpeRatio: z.number(),
  maxDrawdown: z.number(),
  winRate: z.number().optional(),
  totalTrades: z.number().optional(),
  equityCurve: z.array(equityCurvePointSchema),
  trades: z.array(z.object({ profitLoss: z.number() }).passthrough()).optional(),
  rawResults: z.record(z.unknown()).optional(),
  dataSource: z.string().optional(),
  runAt: z.string().or(z.date()).optional(),
});

const feasibilityBodySchema = z.object({
  backtest: backtestInputSchema.optional(),
  backtestId: z.string().optional(),
  minSampleTrades: z.number().int().positive().optional(),
  costPerTradeUsd: z.number().min(0).optional(),
});

const monteCarloBodySchema = z.object({
  backtest: backtestInputSchema.optional(),
  backtestId: z.string().optional(),
  iterations: z.number().int().min(100).max(10000).optional(),
  ruinThreshold: z.number().min(0).max(1).optional(),
  passRetDDRatio: z.number().positive().optional(),
  passRiskOfRuin: z.number().min(0).max(1).optional(),
  useGlobalTrials: z.boolean().optional(),
  // trade-level engine inputs (Davey Ch 19)
  startingEquity: z.number().positive().optional(),
  quittingEquity: z.number().positive().optional(),
  tradesPerYear: z.number().int().positive().optional(),
});

const sizingSweepBodySchema = z.object({
  backtest: backtestInputSchema.optional(),
  backtestId: z.string().optional(),
  startingEquity: z.number().positive().default(100000),
  quittingEquity: z.number().positive().optional(),
  tradesPerYear: z.number().int().positive().optional(),
  iterations: z.number().int().min(100).max(5000).optional(),
  maxDrawdownPct: z.number().positive().optional(),
  maxRiskOfRuin: z.number().min(0).max(1).optional(),
});

const incubationStartBodySchema = z.object({
  requiredDays: z.number().int().positive().default(90),
  // optional backdated start (ISO date) — cannot be in the future
  startedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

/**
 * Phase 9: one resolution path for every backtest-consuming gate.
 * Priority: inline payload → explicit backtestId → the strategy's linked
 * LEAN project's latest completed live_engine run. Fixes the old bug where
 * backtestId was looked up as a projectId.
 */
async function resolveBacktest(
  strategy: { leanProjectName?: string },
  body: { backtest?: any; backtestId?: string },
  fallbackProjectId: string
): Promise<{ bt: any } | { error: string; code: number }> {
  const normalize = (raw: any) => ({
    ...raw,
    id: raw.id ?? "inline",
    projectId: raw.projectId ?? fallbackProjectId,
    status: raw.status ?? "completed",
    winRate: raw.winRate ?? 0,
    totalTrades: raw.totalTrades ?? 0,
    rawResults: raw.rawResults ?? {},
    dataSource: raw.dataSource ?? "simulated",
    runAt: raw.runAt ? new Date(raw.runAt as string) : new Date(),
  });

  if (body.backtest) return { bt: normalize(body.backtest) };

  if (body.backtestId) {
    const found = await storage.getLeanBacktestById(body.backtestId);
    if (!found) return { error: "Backtest not found", code: 404 };
    return { bt: found };
  }

  if (strategy.leanProjectName) {
    const project = await storage.getLeanProjectByName(strategy.leanProjectName);
    if (!project) {
      return { error: `Linked LEAN project "${strategy.leanProjectName}" not found`, code: 404 };
    }
    const backtests = await storage.getLeanBacktestsByProject(project.id);
    const latest = backtests.find(
      (b) => b.status === "completed" && b.dataSource === "live_engine"
    );
    if (!latest) {
      return {
        error: `No completed live_engine backtest for project "${strategy.leanProjectName}" — run one first`,
        code: 400,
      };
    }
    return { bt: latest };
  }

  return {
    error: "Provide backtest, backtestId, or link the strategy to a LEAN project (leanProjectName)",
    code: 400,
  };
}

const incubationObsBodySchema = incubationObservationSchema;

const walkForwardConfigBodySchema = walkForwardConfigSchema.omit({ lockedAt: true });

export function registerGateRoutes(app: Express) {
  // GET /api/strategies/:id/gate-results
  app.get("/api/strategies/:id/gate-results", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });
      const results = await storage.getGateResults(id);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/strategies/:id/gates/feasibility — Davey Ch 12 preliminary
  // analysis against the strategy's locked goals. Requires goals to be set.
  app.post("/api/strategies/:id/gates/feasibility", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });
      if (!strategy.goals) {
        return res.status(400).json({
          error: "No locked goals. Set goals via POST /api/strategies/:id/goals before running the feasibility gate.",
        });
      }

      const parsed = feasibilityBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const body = parsed.data;

      const resolved = await resolveBacktest(strategy, body, id);
      if ("error" in resolved) return res.status(resolved.code).json({ error: resolved.error });
      const bt = resolved.bt;

      const result = computeFeasibility(bt, strategy.goals, {
        minSampleTrades: body.minSampleTrades,
        costPerTradeUsd: body.costPerTradeUsd,
      });

      const gateRecord = await persistGateResult(
        id,
        "feasibility",
        result.verdict,
        result.metrics as any,
        bt.dataSource ?? "simulated",
        result.reason
      );

      res.json({ ...result, goals: strategy.goals, gateResult: gateRecord });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/strategies/:id/gates/diversification — Davey Ch 15. The
  // candidate's live-engine curve is measured against the existing
  // portfolio members' curves: pairwise correlation (full-history and
  // rolling max), combined equity stats, and the deciding with-vs-without
  // combined Monte Carlo (Table 15.3).
  app.post("/api/strategies/:id/gates/diversification", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });

      const namedCurveSchema = z.object({
        name: z.string().min(1),
        equityCurve: z.array(equityCurvePointSchema).min(2),
        dataSource: z.string().optional(),
      });
      const bodySchema = z.object({
        candidate: namedCurveSchema,
        portfolio: z.array(namedCurveSchema).default([]),
        corrThreshold: z.number().gt(0).lt(1).optional(),
        retDDTolerance: z.number().gt(0).max(1).optional(),
      });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const body = parsed.data;

      // Every input must be real-engine data — a correlation against a
      // random walk is meaningless.
      for (const entry of [body.candidate, ...body.portfolio]) {
        const evaluable = assertEvaluable(entry);
        if (!evaluable.ok) {
          const result = {
            verdict: "cannot_evaluate" as const,
            reason: `"${entry.name}": ${evaluable.reason}`,
            metrics: null,
          };
          const gateRecord = await persistGateResult(
            id, "diversification", result.verdict, null, entry.dataSource ?? "simulated", result.reason
          );
          return res.json({ ...result, gateResult: gateRecord });
        }
      }

      const result = analyzeDiversification(
        { name: body.candidate.name, curve: body.candidate.equityCurve },
        body.portfolio.map((p) => ({ name: p.name, curve: p.equityCurve })),
        { corrThreshold: body.corrThreshold, retDDTolerance: body.retDDTolerance }
      );

      const gateRecord = await persistGateResult(
        id,
        "diversification",
        result.verdict,
        result.metrics as any,
        "live_engine",
        result.reason
      );

      res.json({ ...result, gateResult: gateRecord });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/strategies/:id/sizing/sweep — Davey Fig 16.1: simulate the
  // fixed fraction f across its range, recommend the best f that satisfies
  // the drawdown and risk-of-ruin constraints, and solve the minimum
  // starting capital. Live-engine trades only — sizing decisions derived
  // from simulated data would be fiction.
  app.post("/api/strategies/:id/sizing/sweep", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });

      const parsed = sizingSweepBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const body = parsed.data;

      const resolved = await resolveBacktest(strategy, body, id);
      if ("error" in resolved) return res.status(resolved.code).json({ error: resolved.error });
      const bt = resolved.bt;

      const evaluable = assertEvaluable(bt);
      if (!evaluable.ok) {
        return res.status(400).json({ error: evaluable.reason });
      }
      const trades: number[] = (bt.trades ?? []).map((t: any) => t.profitLoss);
      if (trades.length < 10) {
        return res.status(400).json({
          error: `Only ${trades.length} closed trades; at least 10 are needed for sizing simulation.`,
        });
      }

      const constraints = {
        maxDrawdownPct: body.maxDrawdownPct ?? strategy.goals?.maxDrawdownPct ?? 25,
        maxRiskOfRuin: body.maxRiskOfRuin ?? strategy.goals?.maxRiskOfRuin ?? 0.1,
      };
      const largestLoss = largestLosingTrade(trades);
      if (largestLoss <= 0) {
        return res.status(400).json({
          error: "No losing trades in the sample — fixed-fractional sizing needs a largest loss. Treat the backtest as too good to be true.",
        });
      }

      const sweep = sweepFixedFraction({
        trades,
        largestLoss,
        startingEquity: body.startingEquity,
        quittingEquity: body.quittingEquity,
        tradesPerYear: body.tradesPerYear,
        iterations: body.iterations ?? 1000,
        constraints,
      });

      const capital = solveStartingCapital({
        trades,
        quittingEquity: body.quittingEquity ?? body.startingEquity * 0.5,
        maxRiskOfRuin: constraints.maxRiskOfRuin,
        tradesPerYear: body.tradesPerYear,
        iterations: body.iterations ?? 1000,
      });

      res.json({ largestLoss, sweep, capital, constraints });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/strategies/:id/sizing/plan — lock the sizing plan (once,
  // before going live). The generic PATCH strips positionSizingPlan.
  app.post("/api/strategies/:id/sizing/plan", async (req: Request, res: Response) => {
    try {
      const parsed = setSizingPlanBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const strategy = await storage.setPositionSizingPlan(req.params.id, parsed.data);
      res.json(strategy);
    } catch (err: any) {
      const msg = err.message;
      if (msg === "Strategy not found") return res.status(404).json({ error: msg });
      if (msg === "Position sizing plan already locked" || msg === "Position sizing plan must be locked before going live") {
        return res.status(409).json({ error: msg });
      }
      res.status(500).json({ error: msg });
    }
  });

  // POST /api/strategies/:id/gates/monte-carlo
  app.post("/api/strategies/:id/gates/monte-carlo", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });

      const parsed = monteCarloBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const body = parsed.data;

      const resolved = await resolveBacktest(strategy, body, id);
      if ("error" in resolved) return res.status(resolved.code).json({ error: resolved.error });
      const bt = resolved.bt;

      // Monte Carlo — locked goals supply the default pass thresholds
      // (explicit body values still win, e.g. for exploratory runs).
      // Trade-level resampling (Davey's actual procedure) is preferred
      // whenever the backtest carries enough closed trades.
      const hasTrades = Array.isArray(bt.trades) && bt.trades.length >= 10;
      const mcResult = hasTrades
        ? computeMonteCarloFromTrades(bt, {
            iterations: body.iterations,
            startingEquity: body.startingEquity,
            quittingEquity: body.quittingEquity,
            tradesPerYear: body.tradesPerYear,
            passRetDDRatio: body.passRetDDRatio ?? strategy.goals?.minRetDDRatio,
            passRiskOfRuin: body.passRiskOfRuin ?? strategy.goals?.maxRiskOfRuin,
          })
        : computeMonteCarlo(bt, {
            iterations: body.iterations,
            ruinThreshold: body.ruinThreshold,
            passRetDDRatio: body.passRetDDRatio ?? strategy.goals?.minRetDDRatio,
            passRiskOfRuin: body.passRiskOfRuin ?? strategy.goals?.maxRiskOfRuin,
          });

      // DSR (computed separately, verdict is informational)
      let dsrResult;
      try {
        dsrResult = await computeDeflatedSharpe(bt, id, body.useGlobalTrials ?? false);
      } catch {
        dsrResult = null;
      }

      const gateRecord = await persistGateResult(
        id,
        "monte_carlo",
        mcResult.verdict,
        { ...mcResult.metrics, dsr: dsrResult } as any,
        bt.dataSource ?? "simulated",
        mcResult.reason ?? dsrResult?.notValidReason ?? null
      );

      // Davey Ch 23: a trade-level MC pass freezes the expected-performance
      // baseline that incubation and live monitoring will judge against.
      if (mcResult.verdict === "pass" && hasTrades) {
        const m = mcResult.metrics as any;
        const tradePnLs: number[] = bt.trades.map((t: any) => t.profitLoss);
        await storage.setExpectedPerformance(id, {
          avgTradePnL: tradePnLs.reduce((s: number, v: number) => s + v, 0) / tradePnLs.length,
          tradesPerYear: m.tradesPerYear,
          expectedAnnualReturnPct: m.medianReturn * 100,
          expectedMaxDrawdownPct: m.medianMaxDD * 100,
          bands: m.bands ?? [],
        }).catch(() => {
          // Baseline frozen (already incubating/live) — keep the original.
        });
      }

      res.json({
        verdict: mcResult.verdict,
        reason: mcResult.reason,
        metrics: mcResult.metrics,
        dsr: dsrResult,
        gateResult: gateRecord,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/strategies/:id/gates/walk-forward
  app.post("/api/strategies/:id/gates/walk-forward", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });

      const result = walkForwardCannotEvaluate();
      const gateRecord = await storage.recordGateResult({
        strategyId: id,
        gate: "walk_forward",
        verdict: result.verdict,
        metrics: null,
        dataSource: null,
        reason: result.reason,
      });

      res.json({ ...result, gateResult: gateRecord });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/strategies/:id/gates/walk-forward/config
  app.post("/api/strategies/:id/gates/walk-forward/config", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });

      const parsed = walkForwardConfigBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const updated = await storage.updateWalkForwardConfig(id, {
        ...parsed.data,
        lockedAt: new Date(),
      });
      res.json(updated);
    } catch (err: any) {
      if (err.message === "Walk-forward config already locked") {
        return res.status(409).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/strategies/:id/gates/walk-forward/run — execute a real
  // walk-forward analysis against LEAN. Requires a locked config (with
  // startDate and a parameter grid) and LEAN_ENABLED=true. Runs in the
  // background; progress streams over Socket.IO (wf:progress / wf:complete /
  // wf:error). Every run records an optimization trial — re-running
  // walk-forward is a development attempt and deflates DSR accordingly.
  app.post("/api/strategies/:id/gates/walk-forward/run", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });

      const config = strategy.walkForwardConfig;
      if (!config?.lockedAt) {
        return res.status(400).json({ error: "Lock a walk-forward config first (POST .../gates/walk-forward/config)." });
      }
      if (!config.startDate) {
        return res.status(400).json({ error: "Walk-forward config has no startDate; re-create the strategy config with one." });
      }
      if (!isLeanAvailable()) {
        return res.status(400).json({ error: "LEAN is not enabled. Walk-forward needs the real engine (LEAN_ENABLED=true)." });
      }

      const bodySchema = z.object({
        projectName: z.string().regex(/^[A-Za-z0-9_-]+$/).optional(),
        code: z.string().min(10).optional(),
        socketId: z.string().optional(),
      });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const { socketId } = parsed.data;

      // Default project + code from the strategy's linked LEAN project
      const projectName = parsed.data.projectName ?? strategy.leanProjectName;
      if (!projectName) {
        return res.status(400).json({
          error: "Provide projectName, or link the strategy to a LEAN project (leanProjectName).",
        });
      }
      let code = parsed.data.code;
      if (!code) {
        const project = await storage.getLeanProjectByName(projectName);
        if (!project) return res.status(404).json({ error: `LEAN project "${projectName}" not found` });
        code = project.code;
      }

      await storage.recordTrial({
        trialType: "optimization",
        strategyId: id,
        leanProjectName: projectName,
        promptSummary: `walk-forward run (${config.numWindows} windows, ${config.fitnessFunction})`,
      });

      const run = await storage.createWalkForwardRun({
        strategyId: id,
        projectName,
        status: "running",
        config,
        windows: [],
        stitchedCurve: [],
      });

      const io = getIO();
      const emit = (event: string, data: unknown) => {
        if (socketId) emitToSocket(socketId, event, data);
        else io?.emit(event, data);
      };

      res.json({ runId: run.id, status: "running" });

      (async () => {
        try {
          const result = await executeWalkForward({
            projectName,
            code,
            config: config as typeof config & { startDate: string },
            goals: strategy.goals,
            onProgress: (p) => emit("wf:progress", { runId: run.id, ...p }),
          });

          const completed = await storage.updateWalkForwardRun(run.id, {
            status: "completed",
            windows: result.windows,
            stitchedCurve: result.stitchedCurve,
            wfe: result.wfe,
            pbo: result.pbo,
            verdict: result.verdict.verdict,
            reason: result.verdict.reason,
            completedAt: new Date(),
          });

          await persistGateResult(
            id,
            "walk_forward",
            result.verdict.verdict,
            result.verdict.metrics as any,
            "live_engine",
            result.verdict.reason
          );

          emit("wf:complete", completed);
        } catch (err) {
          const msg = (err as Error).message;
          await storage.updateWalkForwardRun(run.id, {
            status: "failed",
            errorLog: msg,
            completedAt: new Date(),
          }).catch(() => {});
          emit("wf:error", { runId: run.id, error: msg });
        }
      })();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/strategies/:id/walk-forward/runs
  app.get("/api/strategies/:id/walk-forward/runs", async (req: Request, res: Response) => {
    try {
      const runs = await storage.getWalkForwardRuns(req.params.id);
      res.json(runs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/strategies/:id/gates/pbo
  app.post("/api/strategies/:id/gates/pbo", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });

      const result = pboCannotEvaluate();
      const gateRecord = await storage.recordGateResult({
        strategyId: id,
        gate: "pbo",
        verdict: result.verdict,
        metrics: null,
        dataSource: null,
        reason: result.reason,
      });

      res.json({ ...result, gateResult: gateRecord });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/strategies/:id/gates/incubation/start
  app.post("/api/strategies/:id/gates/incubation/start", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });

      const parsed = incubationStartBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const startedAt = parsed.data.startedAt ? new Date(parsed.data.startedAt) : undefined;
      const updated = await storage.startIncubation(id, parsed.data.requiredDays, startedAt);

      await storage.recordGateResult({
        strategyId: id,
        gate: "incubation",
        verdict: "cannot_evaluate",
        metrics: { requiredDays: parsed.data.requiredDays, observationCount: 0 },
        dataSource: null,
        reason: `Incubation started: ${parsed.data.requiredDays} days required.`,
      });

      res.json({ strategy: updated, incubationStartedAt: updated.incubationStartedAt, requiredDays: updated.requiredDays });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/strategies/:id/gates/incubation/observation
  app.post("/api/strategies/:id/gates/incubation/observation", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });

      if (!strategy.incubationStartedAt) {
        return res.status(400).json({ error: "Incubation not started. POST to /gates/incubation/start first." });
      }

      const parsed = incubationObsBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const updated = await storage.addIncubationObservation(id, parsed.data);

      // Re-evaluate the tracking report on every new data point; a quit-rule
      // breach raises an alert — the app never auto-liquidates (Davey: the
      // human is the caretaker).
      let tracking: ReturnType<typeof buildTrackingReport> | null = null;
      if (updated.expectedPerformance) {
        tracking = buildTrackingReport(updated);
        if ("quitRuleStatus" in tracking && tracking.quitRuleStatus?.breached) {
          getIO()?.emit("risk:alert", {
            strategyId: id,
            strategyName: updated.name,
            type: "quit_rule_breached",
            detail: tracking.quitRuleStatus.detail,
            at: new Date().toISOString(),
          });
        }
      }

      res.json({
        strategy: updated,
        observationCount: updated.incubationObservations?.length ?? 0,
        tracking,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/strategies/:id/gates/incubation/evaluate
  app.post("/api/strategies/:id/gates/incubation/evaluate", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });

      if (!strategy.incubationStartedAt) {
        return res.status(400).json({ error: "Incubation not started." });
      }

      const now = Date.now();
      const startedMs = new Date(strategy.incubationStartedAt).getTime();
      const requiredMs = (strategy.requiredDays ?? 90) * 24 * 60 * 60 * 1000;
      const elapsedDays = Math.floor((now - startedMs) / (24 * 60 * 60 * 1000));
      const periodComplete = (now - startedMs) >= requiredMs;

      const obs = strategy.incubationObservations ?? [];
      const hasEnoughObservations = obs.length >= 3;

      if (!periodComplete) {
        const remainingDays = Math.ceil((requiredMs - (now - startedMs)) / (24 * 60 * 60 * 1000));
        const gateRecord = await storage.recordGateResult({
          strategyId: id,
          gate: "incubation",
          verdict: "cannot_evaluate",
          metrics: { elapsedDays, requiredDays: strategy.requiredDays ?? 90, remainingDays, observationCount: obs.length },
          dataSource: null,
          reason: `Incubation period incomplete: ${remainingDays} days remaining.`,
        });
        return res.json({
          verdict: "cannot_evaluate",
          reason: `Incubation period incomplete: ${remainingDays} days remaining (${elapsedDays}/${strategy.requiredDays ?? 90} days elapsed).`,
          elapsedDays,
          remainingDays,
          gateResult: gateRecord,
        });
      }

      if (!hasEnoughObservations) {
        const gateRecord = await storage.recordGateResult({
          strategyId: id,
          gate: "incubation",
          verdict: "cannot_evaluate",
          metrics: { elapsedDays, observationCount: obs.length },
          dataSource: null,
          reason: `Too few observations: ${obs.length} logged, minimum 3 required.`,
        });
        return res.json({
          verdict: "cannot_evaluate",
          reason: `Period complete but too few observations (${obs.length}/3). Log more live observations before evaluating.`,
          gateResult: gateRecord,
        });
      }

      // Compute real verdict from observations
      const result = computeIncubationVerdict({
        observations: obs,
        expectedReturn: strategy.performance,
        expectedMaxDrawdown: strategy.maxDrawdown,
        periodComplete,
        requiredDays: strategy.requiredDays ?? 90,
        elapsedDays,
      });

      // Derive provenance for the gate record dataSource
      const allLive = obs.every((o) => (o as any).source === "live");
      const anyPaper = obs.some((o) => (o as any).source === "paper");
      const dataSource = allLive ? "live" : anyPaper ? "paper" : "self_reported";

      const gateRecord = await persistGateResult(
        id,
        "incubation",
        result.verdict,
        { ...result.metrics, requiredDays: strategy.requiredDays ?? 90 },
        dataSource,
        result.reason
      );

      res.json({
        verdict: result.verdict,
        reason: result.reason,
        metrics: result.metrics,
        elapsedDays,
        observationCount: obs.length,
        gateResult: gateRecord,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
