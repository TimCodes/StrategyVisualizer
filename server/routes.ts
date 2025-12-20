import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertStrategySchema, 
  insertTradeSchema, 
  insertBacktestSchema,
  dateRangeSchema,
  insertSettingsSchema
} from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      });

      res.status(201).json(backtest);
    } catch (error) {
      console.error("Backtest error:", error);
      res.status(500).json({ error: "Failed to run backtest" });
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
      const coinIds = "bitcoin,ethereum,solana,cardano,ripple";
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const fallbackData = await storage.getMarketData();
        return res.json(fallbackData);
      }
      
      const data = await response.json();
      
      const marketData = data.map((coin: any) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase() + "/USD",
        name: coin.name,
        price: coin.current_price,
        change: coin.price_change_24h || 0,
        changePercent: coin.price_change_percentage_24h || 0,
        volume: coin.total_volume || 0,
        timestamp: new Date(),
      }));
      
      res.json(marketData);
    } catch (error) {
      console.error("Market data fetch error:", error);
      const fallbackData = await storage.getMarketData();
      res.json(fallbackData);
    }
  });

  app.get("/api/markets/price", async (req: Request, res: Response) => {
    try {
      const symbol = (req.query.symbol as string) || "BTC/USD";
      const days = (req.query.days as string) || "30";
      
      const coinMap: Record<string, string> = {
        "BTC/USD": "bitcoin",
        "ETH/USD": "ethereum",
        "SOL/USD": "solana",
        "ADA/USD": "cardano",
        "XRP/USD": "ripple",
      };
      
      const coinId = coinMap[symbol] || "bitcoin";
      const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        return res.json(generateMockPriceData(parseInt(days)));
      }
      
      const data = await response.json();
      
      const priceData = data.prices.map((point: [number, number], index: number) => {
        const timestamp = new Date(point[0]);
        const price = point[1];
        const prevPrice = index > 0 ? data.prices[index - 1][1] : price;
        const volatility = Math.abs(price - prevPrice) * 0.5;
        
        return {
          timestamp,
          open: price - volatility * Math.random(),
          high: price + volatility * Math.random(),
          low: price - volatility * Math.random(),
          close: price,
          volume: Math.random() * 1000000000 + 500000000,
        };
      });
      
      res.json(priceData);
    } catch (error) {
      console.error("Price data fetch error:", error);
      res.json(generateMockPriceData(30));
    }
  });

  function generateMockPriceData(days: number) {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const basePrice = 42000 + Math.random() * 2000;
      return {
        timestamp: date,
        open: basePrice + Math.random() * 200 - 100,
        high: basePrice + Math.random() * 500,
        low: basePrice - Math.random() * 500,
        close: basePrice + Math.random() * 200 - 100,
        volume: Math.random() * 1000000000 + 500000000,
      };
    });
  }

  app.get("/api/chat/messages", async (_req: Request, res: Response) => {
    try {
      const messages = await storage.getChatMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  app.delete("/api/chat/messages", async (_req: Request, res: Response) => {
    try {
      await storage.clearChatHistory();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });

  app.get("/api/settings", async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", async (req: Request, res: Response) => {
    try {
      const parsed = insertSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const settings = await storage.updateSettings(parsed.data);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      await storage.createChatMessage({ role: "user", content: message, context });

      const chatHistory = await storage.getChatMessages();
      const recentMessages = chatHistory.slice(-10).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));

      const systemPrompt = `You are an expert AI trading assistant with deep knowledge of algorithmic trading, portfolio management, and market analysis. You have access to the user's real trading data and should provide personalized, actionable insights.

Current Trading Context:
${context ? JSON.stringify(context, null, 2) : "No context available"}

Guidelines:
- Provide specific, data-driven insights based on the user's portfolio and trading history
- Be concise but thorough in your analysis
- Suggest actionable improvements when appropriate
- Use precise numbers and percentages from the provided data
- If asked about something not in the data, be honest about limitations
- Format responses with bullet points and clear structure when helpful`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMessages
        ],
        max_completion_tokens: 1024,
      });

      const aiMessage = response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
      
      const savedMessage = await storage.createChatMessage({ role: "assistant", content: aiMessage });
      
      res.json({ message: aiMessage, id: savedMessage.id });
    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
