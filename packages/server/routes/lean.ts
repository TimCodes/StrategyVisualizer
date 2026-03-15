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
import { emitToSocket, getIO } from "../ws";

const runBacktestBodySchema = z.object({
  code: z.string().min(10),
  socketId: z.string().optional(),
});

const generateStrategySchema = z.object({
  description: z.string().min(5),
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
  userFeedback: z.string().min(3),
  backtestResults: z.record(z.unknown()).optional(),
  model: z.string().optional(),
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
        const project = await storage.updateLeanProjectCode(
          req.params.name,
          code
        );
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
          rawResults: {},
          errorLog: null,
        });

        const io = getIO();

        const emitLog = (line: string) => {
          if (socketId) {
            emitToSocket(socketId, "lean:backtest:log", line);
          } else {
            io?.emit("lean:backtest:log", line);
          }
        };

        const emitEvent = (event: string, data: unknown) => {
          if (socketId) {
            emitToSocket(socketId, event, data);
          } else {
            io?.emit(event, data);
          }
        };

        emitEvent("lean:backtest:start", { projectName: name, backtestId: backtest.id });

        res.json({ backtestId: backtest.id, status: "running" });

        const streamBacktest = async () => {
          try {
            const results = simulateLeanBacktest(code, name);

            for (let i = 0; i < results.logs.length; i++) {
              await new Promise((r) => setTimeout(r, 150));
              emitLog(results.logs[i]);

              const progress = Math.round(((i + 1) / results.logs.length) * 100);
              emitEvent("lean:backtest:progress", { progress });
            }

            const updatedBacktest = await storage.updateLeanBacktest(
              backtest.id,
              {
                status: "completed",
                totalReturn: results.totalReturn,
                sharpeRatio: results.sharpeRatio,
                maxDrawdown: results.maxDrawdown,
                winRate: results.winRate,
                totalTrades: results.totalTrades,
                equityCurve: results.equityCurve,
                rawResults: results,
              }
            );

            await storage.updateLeanProjectLastBacktest(name, backtest.id);

            emitEvent("lean:backtest:complete", updatedBacktest);
          } catch (err) {
            const errorMessage = (err as Error).message;
            await storage.updateLeanBacktest(backtest.id, {
              status: "failed",
              errorLog: errorMessage,
            });
            emitEvent("lean:backtest:error", errorMessage);
          }
        };

        streamBacktest();
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

        const result = await generateStrategy(parsed.data as Parameters<typeof generateStrategy>[0]);
        res.json(result);
      } catch (error) {
        console.error("Strategy generation error:", error);
        res
          .status(500)
          .json({ error: "Failed to generate strategy", details: (error as Error).message });
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
      const result = await refineStrategy(parsed.data as Parameters<typeof refineStrategy>[0]);
      res.json(result);
    } catch (error) {
      console.error("Strategy refinement error:", error);
      res
        .status(500)
        .json({ error: "Failed to refine strategy", details: (error as Error).message });
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
        console.error("Strategy explain error:", error);
        res
          .status(500)
          .json({ error: "Failed to explain strategy", details: (error as Error).message });
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
      } catch (error) {
        console.error("Strategy optimize error:", error);
        res
          .status(500)
          .json({ error: "Failed to optimize strategy", details: (error as Error).message });
      }
    }
  );
}
