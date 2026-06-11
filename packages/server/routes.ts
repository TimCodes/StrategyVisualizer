import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { registerStrategyRoutes } from "./routes/strategies";
import { registerTradeRoutes } from "./routes/trades";
import { registerBacktestRoutes } from "./routes/backtests";
import { registerPortfolioRoutes } from "./routes/portfolio";
import { registerMarketRoutes } from "./routes/markets";
import { registerLLMRoutes } from "./routes/llm";
import { registerRiskRoutes } from "./routes/risk";
import { registerSettingsRoutes } from "./routes/settings";
import { registerKrakenRoutes } from "./routes/kraken";
import { registerIBKRRoutes } from "./routes/ibkr";
import { registerLeanRoutes } from "./routes/lean";
import { registerGateRoutes } from "./routes/gates";
import { initializeWebSocket } from "./ws";
import { isLiveTradingEnabled } from "./lib/liveTrading";
import { isLeanAvailable } from "./services/lean-runner";

export async function registerRoutes(app: Express): Promise<Server> {
  registerStrategyRoutes(app);
  registerTradeRoutes(app);
  registerBacktestRoutes(app);
  registerPortfolioRoutes(app);
  registerMarketRoutes(app);
  registerLLMRoutes(app);
  registerRiskRoutes(app);
  registerSettingsRoutes(app);
  registerKrakenRoutes(app);
  registerIBKRRoutes(app);
  registerLeanRoutes(app);
  registerGateRoutes(app);

  app.get("/api/system/status", (_req: Request, res: Response) => {
    res.json({
      liveTradingEnabled: isLiveTradingEnabled(),
      backtestEngine: isLeanAvailable() ? "lean" : "simulated",
    });
  });

  const httpServer = createServer(app);
  
  initializeWebSocket(httpServer);

  return httpServer;
}
