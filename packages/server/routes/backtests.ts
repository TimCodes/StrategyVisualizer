import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertBacktestSchema } from "@shared/schema";

export function registerBacktestRoutes(app: Express) {
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

  app.post("/api/backtests/run", async (req: Request, res: Response) => {
    try {
      const { strategyId, startDate, endDate, initialCapital, symbol } = req.body;
      
      if (!strategyId || !startDate || !endDate || !initialCapital || !symbol) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const strategy = await storage.getStrategyById(strategyId);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      
      if (end <= start) {
        return res.status(400).json({ error: "End date must be after start date" });
      }
      
      const volatility = 0.02 + Math.random() * 0.03;
      const drift = (Math.random() - 0.4) * 0.001;
      
      let equity = initialCapital;
      let peak = equity;
      let maxDrawdown = 0;
      let wins = 0;
      let totalTrades = Math.max(5, Math.floor(daysDiff / 3) + Math.floor(Math.random() * 10));
      
      const dailyReturns: number[] = [];
      
      for (let i = 0; i < totalTrades; i++) {
        const returnPct = drift + volatility * (Math.random() * 2 - 1);
        equity *= (1 + returnPct);
        
        dailyReturns.push(returnPct);
        
        if (returnPct > 0) wins++;
        
        if (equity > peak) peak = equity;
        const drawdown = (peak - equity) / peak;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }
      
      const totalReturn = ((equity - initialCapital) / initialCapital) * 100;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      
      const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
      const variance = dailyReturns.length > 1 ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length : 0;
      const stdDev = Math.sqrt(variance);
      const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

      const backtest = await storage.createBacktest({
        strategyName: strategy.name,
        strategyDescription: `${symbol} | $${initialCapital.toLocaleString()} capital`,
        startDate: start,
        endDate: end,
        totalReturn: Math.round(totalReturn * 100) / 100,
        sharpeRatio: Math.round(sharpeRatio * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
        winRate: Math.round(winRate * 100) / 100,
        totalTrades,
        status: "completed",
        dataSource: "simulated",
      });

      res.status(201).json(backtest);
    } catch (error) {
      console.error("Backtest error:", error);
      res.status(500).json({ error: "Failed to run backtest" });
    }
  });
}
