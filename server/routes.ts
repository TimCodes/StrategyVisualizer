import type { Express } from "express";
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
import { initializeWebSocket } from "./ws";

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

  const httpServer = createServer(app);
  
  initializeWebSocket(httpServer);

  return httpServer;
}
