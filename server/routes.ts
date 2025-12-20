import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerStrategyRoutes } from "./routes/strategies";
import { registerTradeRoutes } from "./routes/trades";
import { registerBacktestRoutes } from "./routes/backtests";
import { registerPortfolioRoutes } from "./routes/portfolio";
import { registerMarketRoutes } from "./routes/markets";
import { registerChatRoutes } from "./routes/chat";
import { registerSettingsRoutes } from "./routes/settings";

export async function registerRoutes(app: Express): Promise<Server> {
  registerStrategyRoutes(app);
  registerTradeRoutes(app);
  registerBacktestRoutes(app);
  registerPortfolioRoutes(app);
  registerMarketRoutes(app);
  registerChatRoutes(app);
  registerSettingsRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
