import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertTradeSchema } from "@shared/schema";
import { riskService } from "../services/risk";
import { eventBus } from "../ws";
import { isLiveTradingEnabled, LIVE_TRADING_BLOCKED_MSG } from "../lib/liveTrading";

export function registerTradeRoutes(app: Express) {
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
      if (!isLiveTradingEnabled()) {
        console.warn("[Trades] Order placement blocked: LIVE_TRADING_ENABLED is not set.");
        return res.status(403).json({ error: LIVE_TRADING_BLOCKED_MSG });
      }
      const { bypassRiskCheck, ...tradeData } = req.body;
      
      const parsed = insertTradeSchema.safeParse(tradeData);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Invalid request body", 
          details: parsed.error.errors 
        });
      }

      const tradeInput = {
        symbol: parsed.data.symbol,
        type: parsed.data.type,
        quantity: parsed.data.quantity,
        price: parsed.data.price,
      };

      if (!bypassRiskCheck) {
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
          currentDrawdown: Math.abs(portfolioMetrics.maxDrawdown),
        };

        const validation = riskService.validateTrade(tradeInput, portfolioState);

        if (!validation.approved) {
          eventBus.emit("risk:alert", {
            type: "trade_blocked",
            message: validation.errors.join("; "),
            severity: "error",
          });

          return res.status(400).json({
            error: "Trade blocked by risk management",
            riskValidation: validation,
          });
        }

        if (validation.warnings.length > 0) {
          eventBus.emit("risk:alert", {
            type: "trade_warning",
            message: validation.warnings.join("; "),
            severity: "warning",
          });
        }
      }

      const trade = await storage.createTrade(parsed.data);

      eventBus.emit("trade:executed", trade);

      riskService.recordTrade(tradeInput, trade.pnl);

      res.status(201).json({
        trade,
        riskValidation: bypassRiskCheck 
          ? { approved: true, warnings: ["Risk check bypassed"], errors: [] }
          : { approved: true, warnings: [], errors: [] },
      });
    } catch (error) {
      console.error("Trade creation error:", error);
      res.status(500).json({ error: "Failed to create trade" });
    }
  });
}
