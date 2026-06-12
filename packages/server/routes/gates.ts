import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { computeMonteCarlo, computeDeflatedSharpe, assertEvaluable, persistGateResult, computeIncubationVerdict, computeFeasibility } from "../services/gates";
import { walkForwardCannotEvaluate, pboCannotEvaluate } from "../services/pbo";
import { incubationObservationSchema, walkForwardConfigSchema } from "@shared/schema";

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
});

const incubationStartBodySchema = z.object({
  requiredDays: z.number().int().positive().default(90),
});

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

      let bt: any;
      if (body.backtestId) {
        const backtests = await storage.getLeanBacktestsByProject(body.backtestId);
        const found = backtests[0];
        if (!found) return res.status(404).json({ error: "Backtest not found" });
        bt = found;
      } else if (body.backtest) {
        bt = { ...body.backtest, dataSource: body.backtest.dataSource ?? "simulated" };
      } else {
        return res.status(400).json({ error: "Provide either backtest or backtestId" });
      }

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

  // POST /api/strategies/:id/gates/monte-carlo
  app.post("/api/strategies/:id/gates/monte-carlo", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const strategy = await storage.getStrategyById(id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });

      const parsed = monteCarloBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const body = parsed.data;

      // Resolve backtest
      let bt: any;
      if (body.backtestId) {
        const backtests = await storage.getLeanBacktestsByProject(body.backtestId);
        const found = backtests[0];
        if (!found) return res.status(404).json({ error: "Backtest not found" });
        bt = found;
      } else if (body.backtest) {
        bt = {
          ...body.backtest,
          id: body.backtest.id ?? "inline",
          projectId: body.backtest.projectId ?? id,
          status: body.backtest.status ?? "completed",
          winRate: body.backtest.winRate ?? 0,
          totalTrades: body.backtest.totalTrades ?? 0,
          rawResults: body.backtest.rawResults ?? {},
          dataSource: body.backtest.dataSource ?? "simulated",
          runAt: body.backtest.runAt ? new Date(body.backtest.runAt as string) : new Date(),
        };
      } else {
        return res.status(400).json({ error: "Provide either backtest or backtestId" });
      }

      // Monte Carlo — locked goals supply the default pass thresholds
      // (explicit body values still win, e.g. for exploratory runs)
      const mcResult = computeMonteCarlo(bt, {
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

      const updated = await storage.startIncubation(id, parsed.data.requiredDays);

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
      res.json({ strategy: updated, observationCount: updated.incubationObservations?.length ?? 0 });
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
