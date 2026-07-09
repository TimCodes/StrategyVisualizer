import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  insertLeanProjectSchema,
  insertLeanBacktestSchema,
} from "@shared/schema";
import {
  generateStrategy,
  refineStrategy,
  explainStrategy,
  suggestOptimizations,
  simulateLeanBacktest,
} from "../services/lean-agent";
import { isLeanAvailable, runLeanBacktest, LeanRunError } from "../services/lean-runner";
import { emitToSocket, getIO } from "../ws";
import { llmErrorToResponse } from "../lib/llmErrorResponse";

function trialPromptSummary(s: string | undefined): string | undefined {
  if (!s) return undefined;
  return s.slice(0, 200);
}

const runBacktestBodySchema = z.object({
  code: z.string().min(10),
  socketId: z.string().optional(),
});

const generateStrategySchema = z.object({
  description: z.string().min(5),
  edge: z.string().min(20, "Edge must be at least 20 characters — describe the market mechanism"),
  acknowledgeWeakEdge: z.boolean().optional(),
  model: z.string().optional(),
  constraints: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      initialCapital: z.number().optional(),
      assets: z.array(z.string()).optional(),
      maxDrawdown: z.number().optional(),
      rebalanceFrequency: z.string().optional(),
      assetClass: z.string().optional(),
      timeframe: z.string().optional(),
      riskLevel: z.string().optional(),
    })
    .optional(),
  autoBacktest: z.boolean().optional(),
});

const refineStrategySchema = z.object({
  previousCode: z.string().min(10),
  userFeedback: z.string().optional(),
  rationale: z.string().min(15, "Rationale must be at least 15 characters"),
  refinementType: z.enum(["logic_fix", "optimization"]),
  backtestResults: z.record(z.unknown()).optional(),
  model: z.string().optional(),
  strategyId: z.string().optional(),
  confirmedOptimization: z.boolean().optional(),
});

const explainStrategySchema = z.object({
  code: z.string().min(10),
  model: z.string().optional(),
});

export function registerLeanRoutes(app: Express) {
  app.get("/api/lean/projects", async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getLeanProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch LEAN projects" });
    }
  });

  app.post("/api/lean/projects", async (req: Request, res: Response) => {
    try {
      const parsed = insertLeanProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "Invalid request", details: parsed.error.errors });
      }
      const project = await storage.createLeanProject(parsed.data);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to create LEAN project" });
    }
  });

  app.get(
    "/api/lean/projects/:name/code",
    async (req: Request, res: Response) => {
      try {
        const project = await storage.getLeanProjectByName(req.params.name);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }
        res.json({ code: project.code, project });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch project code" });
      }
    }
  );

  app.put(
    "/api/lean/projects/:name/code",
    async (req: Request, res: Response) => {
      try {
        const { code } = req.body;
        if (!code || typeof code !== "string") {
          return res.status(400).json({ error: "Code is required" });
        }
        const project = await storage.updateLeanProjectCode(req.params.name, code);
        res.json(project);
      } catch (error) {
        if ((error as Error).message === "Project not found") {
          return res.status(404).json({ error: "Project not found" });
        }
        res.status(500).json({ error: "Failed to update project code" });
      }
    }
  );

  app.post(
    "/api/lean/projects/:name/backtest",
    async (req: Request, res: Response) => {
      try {
        const parsed = runBacktestBodySchema.safeParse(req.body);
        if (!parsed.success) {
          return res
            .status(400)
            .json({ error: "Invalid request", details: parsed.error.errors });
        }

        const { code, socketId } = parsed.data;
        const { name } = req.params;

        let project = await storage.getLeanProjectByName(name);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }

        await storage.updateLeanProjectCode(name, code);

        const backtest = await storage.createLeanBacktest({
          projectId: project.id,
          status: "running",
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          winRate: 0,
          totalTrades: 0,
          equityCurve: [],
          trades: [],
          rawResults: {},
          errorLog: null,
          dataSource: "simulated",
        });

        const io = getIO();

        const emitLog = (line: string) => {
          if (socketId) emitToSocket(socketId, "lean:backtest:log", line);
          else io?.emit("lean:backtest:log", line);
        };
        const emitEvent = (event: string, data: unknown) => {
          if (socketId) emitToSocket(socketId, event, data);
          else io?.emit(event, data);
        };

        emitEvent("lean:backtest:start", { projectName: name, backtestId: backtest.id });
        res.json({ backtestId: backtest.id, status: "running" });

        const streamBacktest = async () => {
          try {
            // Try real LEAN runner first (only active when LEAN_ENABLED=true)
            let leanFailure: string | null = null;
            if (isLeanAvailable()) {
              // One automatic retry: engine startup occasionally hiccups
              // (docker cold start, transient IO). Only the ENGINE run is
              // retried — storage failures must surface, not re-run docker.
              let leanResult: Awaited<ReturnType<typeof runLeanBacktest>> | null = null;
              for (let attempt = 1; attempt <= 2 && !leanResult; attempt++) {
                try {
                  emitLog(`[LEAN] Starting real LEAN backtest (attempt ${attempt}/2)…`);
                  emitEvent("lean:backtest:progress", { progress: 10 });
                  leanResult = await runLeanBacktest({ projectName: name, code });
                } catch (leanErr) {
                  const stderr = (leanErr as LeanRunError).stderr ?? "";
                  leanFailure =
                    `${(leanErr as Error).message}` +
                    (stderr ? `\n--- stderr (tail) ---\n${stderr.slice(-2000)}` : "");
                  console.warn(`[LEAN] Attempt ${attempt} failed:`, (leanErr as Error).message);
                  emitLog(`[LEAN] Attempt ${attempt} failed: ${(leanErr as Error).message}`);
                }
              }

              if (leanResult) {
                emitEvent("lean:backtest:progress", { progress: 100 });
                const updatedBacktest = await storage.updateLeanBacktest(backtest.id, {
                  status: "completed",
                  totalReturn: leanResult.totalReturn,
                  sharpeRatio: leanResult.sharpeRatio,
                  maxDrawdown: leanResult.maxDrawdown,
                  winRate: leanResult.winRate,
                  totalTrades: leanResult.totalTrades,
                  equityCurve: leanResult.equityCurve,
                  trades: leanResult.trades,
                  rawResults: leanResult.rawResults,
                  dataSource: "live_engine",
                });
                await storage.updateLeanProjectLastBacktest(name, backtest.id);

                // Phase 9: every real-engine backtest is a trial — it
                // deflates the DSR of any strategy linked to this project.
                const linked = (await storage.getStrategies()).filter(
                  (s) => s.leanProjectName === name
                );
                if (linked.length > 0) {
                  for (const s of linked) {
                    await storage.recordTrial({
                      trialType: "backtest",
                      strategyId: s.id,
                      leanProjectName: name,
                      promptSummary: "live_engine backtest",
                    });
                  }
                } else {
                  await storage.recordTrial({
                    trialType: "backtest",
                    leanProjectName: name,
                    promptSummary: "live_engine backtest (no linked strategy)",
                  });
                }

                emitEvent("lean:backtest:complete", updatedBacktest);
                return;
              }
              emitLog("[LEAN] Real engine failed twice — falling back to simulator. See errorLog for details.");
            }

            // Simulator path (default in Replit; fallback when LEAN fails)
            const results = simulateLeanBacktest(code, name);
            for (let i = 0; i < results.logs.length; i++) {
              await new Promise((r) => setTimeout(r, 150));
              emitLog(results.logs[i]);
              emitEvent("lean:backtest:progress", {
                progress: Math.round(((i + 1) / results.logs.length) * 100),
              });
            }
            const updatedBacktest = await storage.updateLeanBacktest(backtest.id, {
              status: "completed",
              totalReturn: results.totalReturn,
              sharpeRatio: results.sharpeRatio,
              maxDrawdown: results.maxDrawdown,
              winRate: results.winRate,
              totalTrades: results.totalTrades,
              equityCurve: results.equityCurve,
              trades: [],
              rawResults: results,
              // Preserve WHY the real engine was bypassed — a simulated
              // fallback with a hidden cause is how bad data sneaks in.
              errorLog: leanFailure
                ? `LEAN engine failed; result is SIMULATED fallback.\n${leanFailure}`
                : null,
            });
            await storage.updateLeanProjectLastBacktest(name, backtest.id);
            emitEvent("lean:backtest:complete", updatedBacktest);
          } catch (err) {
            const errorMessage = (err as Error).message;
            // Never let the failure handler itself crash the process
            await storage.updateLeanBacktest(backtest.id, {
              status: "failed",
              errorLog: errorMessage,
            }).catch((e) => console.error("Failed to record backtest failure:", e));
            emitEvent("lean:backtest:error", errorMessage);
          }
        };
        streamBacktest().catch((e) => console.error("streamBacktest crashed:", e));
      } catch (error) {
        console.error("Backtest error:", error);
        res.status(500).json({ error: "Failed to run backtest" });
      }
    }
  );

  app.get(
    "/api/lean/projects/:name/results",
    async (req: Request, res: Response) => {
      try {
        const project = await storage.getLeanProjectByName(req.params.name);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }
        const backtests = await storage.getLeanBacktestsByProject(project.id);
        res.json(backtests);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch backtest results" });
      }
    }
  );

  app.delete(
    "/api/lean/projects/:name",
    async (req: Request, res: Response) => {
      try {
        await storage.deleteLeanProject(req.params.name);
        res.json({ success: true });
      } catch (error) {
        if ((error as Error).message === "Project not found") {
          return res.status(404).json({ error: "Project not found" });
        }
        res.status(500).json({ error: "Failed to delete project" });
      }
    }
  );

  app.post(
    "/api/lean/agent/generate",
    async (req: Request, res: Response) => {
      try {
        const parsed = generateStrategySchema.safeParse(req.body);
        if (!parsed.success) {
          return res
            .status(400)
            .json({ error: "Invalid request", details: parsed.error.errors });
        }

        const result = await generateStrategy(
          parsed.data as Parameters<typeof generateStrategy>[0]
        );

        res.json(result);

        if (result.status === "ok") {
          try {
            await storage.recordTrial({
              trialType: "generation",
              model: parsed.data.model ?? undefined,
              promptSummary: trialPromptSummary(parsed.data.description),
            });
          } catch (trialErr) {
            console.warn("⚠️  TRIAL NOT RECORDED:", (trialErr as Error).message);
          }
        }
      } catch (error) {
        const { status, body } = llmErrorToResponse(error);
        res.status(status).json(body);
      }
    }
  );

  app.post("/api/lean/agent/refine", async (req: Request, res: Response) => {
    try {
      const parsed = refineStrategySchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "Invalid request", details: parsed.error.errors });
      }

      const { refinementType, strategyId, confirmedOptimization, rationale } = parsed.data;

      if (refinementType === "optimization" && !confirmedOptimization) {
        const trialData = await storage.getTrialCount(strategyId);
        return res.json({
          status: "confirm_optimization",
          trialCount: trialData.total,
          warning: `This is an optimization — another look at the same historical data. Each optimization raises the chance that a good backtest result is luck rather than a real edge. This strategy has ${trialData.total} prior trial${trialData.total === 1 ? "" : "s"}.`,
        });
      }

      const result = await refineStrategy(
        parsed.data as Parameters<typeof refineStrategy>[0]
      );
      res.json(result);

      if (strategyId) {
        try {
          await storage.appendRefinementLog(strategyId, {
            refinementType,
            rationale,
          });
        } catch {
        }
      }

      try {
        await storage.recordTrial({
          trialType: "refinement",
          strategyId: strategyId ?? undefined,
          model: parsed.data.model ?? undefined,
          promptSummary: trialPromptSummary(rationale),
        });
      } catch (trialErr) {
        console.warn("⚠️  TRIAL NOT RECORDED:", (trialErr as Error).message);
      }
    } catch (error) {
      const { status, body } = llmErrorToResponse(error);
      res.status(status).json(body);
    }
  });

  app.post(
    "/api/lean/agent/explain",
    async (req: Request, res: Response) => {
      try {
        const parsed = explainStrategySchema.safeParse(req.body);
        if (!parsed.success) {
          return res
            .status(400)
            .json({ error: "Invalid request", details: parsed.error.errors });
        }
        const explanation = await explainStrategy(
          parsed.data.code,
          (parsed.data.model as Parameters<typeof explainStrategy>[1]) || "gpt-5"
        );
        res.json({ explanation });
      } catch (error) {
        const { status, body } = llmErrorToResponse(error);
        res.status(status).json(body);
      }
    }
  );

  app.post(
    "/api/lean/agent/optimize",
    async (req: Request, res: Response) => {
      try {
        const parsed = explainStrategySchema.safeParse(req.body);
        if (!parsed.success) {
          return res
            .status(400)
            .json({ error: "Invalid request", details: parsed.error.errors });
        }
        const suggestions = await suggestOptimizations(
          parsed.data.code,
          (parsed.data.model as Parameters<typeof suggestOptimizations>[1]) || "gpt-5"
        );
        res.json({ suggestions });
        try {
          await storage.recordTrial({
            trialType: "optimization",
            model: parsed.data.model ?? undefined,
            promptSummary: trialPromptSummary(parsed.data.code),
          });
        } catch (trialErr) {
          console.warn("⚠️  TRIAL NOT RECORDED:", (trialErr as Error).message);
        }
      } catch (error) {
        const { status, body } = llmErrorToResponse(error);
        res.status(status).json(body);
      }
    }
  );

  app.get("/api/trials/count", async (req: Request, res: Response) => {
    try {
      const strategyId =
        typeof req.query.strategyId === "string" ? req.query.strategyId : undefined;
      const result = await storage.getTrialCount(strategyId);
      res.json(result);
    } catch (error) {
      console.error("Trials count error:", error);
      res.status(500).json({ error: "Failed to fetch trial count" });
    }
  });

  app.get("/api/trials", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const trials = await storage.getTrials(limit);
      res.json(trials);
    } catch (error) {
      console.error("Trials list error:", error);
      res.status(500).json({ error: "Failed to fetch trials" });
    }
  });
}
