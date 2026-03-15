import type { Express, Request, Response } from "express";
import { riskService } from "../services/risk";
import { storage } from "../storage";
import { riskSettingsSchema } from "@shared/schema";

export function registerRiskRoutes(app: Express) {
  app.get("/api/risk/settings", async (_req: Request, res: Response) => {
    try {
      const settings = riskService.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch risk settings" });
    }
  });

  app.put("/api/risk/settings", async (req: Request, res: Response) => {
    try {
      const parsed = riskSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid risk settings",
          details: parsed.error.errors,
        });
      }

      riskService.updateSettings(parsed.data);
      res.json(riskService.getSettings());
    } catch (error) {
      res.status(500).json({ error: "Failed to update risk settings" });
    }
  });

  app.post("/api/risk/validate", async (req: Request, res: Response) => {
    try {
      const { trade } = req.body;

      if (!trade) {
        return res.status(400).json({ error: "Trade data required" });
      }

      const portfolioMetrics = await storage.getPortfolioMetrics();
      const trades = await storage.getTrades();

      const positions = trades.reduce(
        (acc, t) => {
          const existing = acc.find((p) => p.symbol === t.symbol);
          if (existing) {
            if (t.type === "buy") {
              existing.quantity += t.quantity;
              existing.value += t.quantity * t.price;
            } else {
              existing.quantity -= t.quantity;
              existing.value -= t.quantity * t.price;
            }
          } else {
            acc.push({
              symbol: t.symbol,
              quantity: t.type === "buy" ? t.quantity : -t.quantity,
              value: t.type === "buy" ? t.quantity * t.price : -t.quantity * t.price,
            });
          }
          return acc;
        },
        [] as Array<{ symbol: string; quantity: number; value: number }>
      );

      const portfolioState = {
        totalValue: portfolioMetrics.totalValue,
        positions,
        dailyPnL: 0,
        peakValue: portfolioMetrics.totalValue * 1.1,
        currentDrawdown: portfolioMetrics.maxDrawdown,
      };

      const validation = riskService.validateTrade(trade, portfolioState);

      res.json(validation);
    } catch (error) {
      console.error("Risk validation error:", error);
      res.status(500).json({ error: "Failed to validate trade" });
    }
  });

  app.get("/api/risk/status", async (_req: Request, res: Response) => {
    try {
      const portfolioMetrics = await storage.getPortfolioMetrics();
      const trades = await storage.getTrades();
      const settings = riskService.getSettings();

      const positions = trades.reduce(
        (acc, t) => {
          const existing = acc.find((p) => p.symbol === t.symbol);
          if (existing) {
            if (t.type === "buy") {
              existing.quantity += t.quantity;
              existing.value += t.quantity * t.price;
            } else {
              existing.quantity -= t.quantity;
              existing.value -= t.quantity * t.price;
            }
          } else {
            acc.push({
              symbol: t.symbol,
              quantity: t.type === "buy" ? t.quantity : -t.quantity,
              value: t.type === "buy" ? t.quantity * t.price : -t.quantity * t.price,
            });
          }
          return acc;
        },
        [] as Array<{ symbol: string; quantity: number; value: number }>
      );

      const activePositions = positions.filter((p) => p.quantity > 0);
      const largestPosition = activePositions.sort((a, b) => b.value - a.value)[0];

      const portfolioState = {
        totalValue: portfolioMetrics.totalValue,
        positions: activePositions,
        dailyPnL: 0,
        peakValue: portfolioMetrics.totalValue * 1.1,
        currentDrawdown: portfolioMetrics.maxDrawdown,
      };

      const drawdownAlert = riskService.checkDrawdownAlert(portfolioState);
      const dailyStats = riskService.getDailyStats();

      res.json({
        settings,
        portfolio: {
          totalValue: portfolioMetrics.totalValue,
          positionCount: activePositions.length,
          currentDrawdown: portfolioMetrics.maxDrawdown,
          dailyPnL: dailyStats.pnl,
          dailyPnLPercent: portfolioMetrics.totalValue > 0 
            ? (dailyStats.pnl / portfolioMetrics.totalValue) * 100 
            : 0,
          largestPosition: largestPosition
            ? {
                symbol: largestPosition.symbol,
                value: largestPosition.value,
                percent: (largestPosition.value / portfolioMetrics.totalValue) * 100,
              }
            : null,
        },
        alert: drawdownAlert,
      });
    } catch (error) {
      console.error("Risk status error:", error);
      res.status(500).json({ error: "Failed to get risk status" });
    }
  });

  app.get("/api/risk/position-size", async (req: Request, res: Response) => {
    try {
      const { entryPrice, stopLoss } = req.query;

      if (!entryPrice || !stopLoss) {
        return res.status(400).json({ 
          error: "entryPrice and stopLoss required" 
        });
      }

      const portfolioMetrics = await storage.getPortfolioMetrics();

      const positionSize = riskService.calculatePositionSize(
        parseFloat(entryPrice as string),
        parseFloat(stopLoss as string),
        portfolioMetrics.totalValue
      );

      const settings = riskService.getSettings();
      const suggestedStopLoss = riskService.calculateStopLoss(
        parseFloat(entryPrice as string),
        "buy"
      );
      const suggestedTakeProfit = riskService.calculateTakeProfit(
        parseFloat(entryPrice as string),
        "buy"
      );

      res.json({
        positionSize,
        positionValue: positionSize * parseFloat(entryPrice as string),
        suggestedStopLoss,
        suggestedTakeProfit,
        riskPerTrade: settings.riskPerTrade,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate position size" });
    }
  });
}
