import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertStrategySchema, 
  insertTradeSchema, 
  insertBacktestSchema,
  dateRangeSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/strategies", async (_req: Request, res: Response) => {
    try {
      const strategies = await storage.getStrategies();
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch strategies" });
    }
  });

  app.get("/api/strategies/:id", async (req: Request, res: Response) => {
    try {
      const strategy = await storage.getStrategyById(req.params.id);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.json(strategy);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch strategy" });
    }
  });

  app.post("/api/strategies", async (req: Request, res: Response) => {
    try {
      const parsed = insertStrategySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const strategy = await storage.createStrategy(parsed.data);
      res.status(201).json(strategy);
    } catch (error) {
      res.status(500).json({ error: "Failed to create strategy" });
    }
  });

  app.patch("/api/strategies/:id", async (req: Request, res: Response) => {
    try {
      const parsed = insertStrategySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const strategy = await storage.updateStrategy(req.params.id, parsed.data);
      res.json(strategy);
    } catch (error) {
      if ((error as Error).message === "Strategy not found") {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.status(500).json({ error: "Failed to update strategy" });
    }
  });

  app.delete("/api/strategies/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteStrategy(req.params.id);
      res.status(204).send();
    } catch (error) {
      if ((error as Error).message === "Strategy not found") {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.status(500).json({ error: "Failed to delete strategy" });
    }
  });

  app.get("/api/trades", async (_req: Request, res: Response) => {
    try {
      const trades = await storage.getTrades();
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });

  app.post("/api/trades", async (req: Request, res: Response) => {
    try {
      const parsed = insertTradeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const trade = await storage.createTrade(parsed.data);
      res.status(201).json(trade);
    } catch (error) {
      res.status(500).json({ error: "Failed to create trade" });
    }
  });

  app.get("/api/backtests", async (_req: Request, res: Response) => {
    try {
      const backtests = await storage.getBacktestResults();
      res.json(backtests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtests" });
    }
  });

  app.post("/api/backtests", async (req: Request, res: Response) => {
    try {
      const parsed = insertBacktestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const backtest = await storage.createBacktest(parsed.data);
      res.status(201).json(backtest);
    } catch (error) {
      res.status(500).json({ error: "Failed to create backtest" });
    }
  });

  app.patch("/api/backtests/:id", async (req: Request, res: Response) => {
    try {
      const parsed = insertBacktestSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const backtest = await storage.updateBacktest(req.params.id, parsed.data);
      res.json(backtest);
    } catch (error) {
      if ((error as Error).message === "Backtest not found") {
        return res.status(404).json({ error: "Backtest not found" });
      }
      res.status(500).json({ error: "Failed to update backtest" });
    }
  });

  app.get("/api/portfolio/metrics", async (_req: Request, res: Response) => {
    try {
      const metrics = await storage.getPortfolioMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio metrics" });
    }
  });

  app.get("/api/portfolio/performance", async (req: Request, res: Response) => {
    try {
      let dateRange;
      if (req.query.start && req.query.end) {
        const parsed = dateRangeSchema.safeParse({
          start: new Date(req.query.start as string),
          end: new Date(req.query.end as string),
        });
        if (parsed.success) {
          dateRange = parsed.data;
        }
      }
      const performanceData = await storage.getPerformanceData(dateRange);
      res.json(performanceData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance data" });
    }
  });

  app.get("/api/markets", async (_req: Request, res: Response) => {
    try {
      const marketData = await storage.getMarketData();
      res.json(marketData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
