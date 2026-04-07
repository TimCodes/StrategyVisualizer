import type { Express, Request, Response } from "express";
import { getIBKRService, IBKRService } from "../services/exchanges/ibkr";

function getCredentials(): { accessToken: string; accountId: string } | null {
  const accessToken = process.env.IBKR_ACCESS_TOKEN;
  const accountId = process.env.IBKR_ACCOUNT_ID;
  if (!accessToken || !accountId) return null;
  return { accessToken, accountId };
}

function requireCredentials(res: Response): boolean {
  const creds = getCredentials();
  if (!creds) {
    res.status(401).json({
      error: "IBKR credentials not configured",
      message: "Please add IBKR_ACCESS_TOKEN and IBKR_ACCOUNT_ID as environment secrets.",
    });
    return false;
  }
  return true;
}

export function registerIBKRRoutes(app: Express) {
  app.get("/api/ibkr/status", async (_req: Request, res: Response) => {
    try {
      const creds = getCredentials();
      if (!creds) {
        return res.json({ configured: false, authenticated: false });
      }
      const ibkr = getIBKRService(creds.accessToken, creds.accountId);
      const status = await ibkr.getAuthStatus();
      res.json({ configured: true, ...status });
    } catch (error) {
      console.error("IBKR status error:", error);
      res.json({ configured: true, authenticated: false, message: String(error) });
    }
  });

  app.get("/api/ibkr/ticker", async (req: Request, res: Response) => {
    try {
      if (!requireCredentials(res)) return;
      const symbol = (req.query.symbol as string) || "AAPL";
      const creds = getCredentials()!;
      const ibkr = getIBKRService(creds.accessToken, creds.accountId);
      const ticker = await ibkr.getTicker(symbol);
      res.json(ticker);
    } catch (error) {
      console.error("IBKR ticker error:", error);
      res.status(500).json({ error: "Failed to fetch IBKR ticker", details: String(error) });
    }
  });

  app.get("/api/ibkr/markets", async (_req: Request, res: Response) => {
    try {
      if (!requireCredentials(res)) return;
      const creds = getCredentials()!;
      const ibkr = getIBKRService(creds.accessToken, creds.accountId);
      const symbols = IBKRService.getDefaultSymbols();
      const tickers = await ibkr.getMultipleTickers(symbols);
      res.json(tickers);
    } catch (error) {
      console.error("IBKR markets error:", error);
      res.status(500).json({ error: "Failed to fetch IBKR markets", details: String(error) });
    }
  });

  app.get("/api/ibkr/ohlc", async (req: Request, res: Response) => {
    try {
      if (!requireCredentials(res)) return;
      const symbol = (req.query.symbol as string) || "AAPL";
      const period = (req.query.period as string) || "1y";
      const bar = (req.query.bar as string) || "1d";
      const creds = getCredentials()!;
      const ibkr = getIBKRService(creds.accessToken, creds.accountId);
      const ohlc = await ibkr.getOHLC(symbol, period, bar);
      res.json(ohlc);
    } catch (error) {
      console.error("IBKR OHLC error:", error);
      res.status(500).json({ error: "Failed to fetch IBKR OHLC data", details: String(error) });
    }
  });

  app.get("/api/ibkr/orderbook", async (req: Request, res: Response) => {
    try {
      if (!requireCredentials(res)) return;
      const symbol = (req.query.symbol as string) || "AAPL";
      const creds = getCredentials()!;
      const ibkr = getIBKRService(creds.accessToken, creds.accountId);
      const orderBook = await ibkr.getOrderBook(symbol);
      res.json(orderBook);
    } catch (error) {
      console.error("IBKR order book error:", error);
      res.status(500).json({ error: "Failed to fetch IBKR order book", details: String(error) });
    }
  });

  app.get("/api/ibkr/balance", async (_req: Request, res: Response) => {
    try {
      if (!requireCredentials(res)) return;
      const creds = getCredentials()!;
      const ibkr = getIBKRService(creds.accessToken, creds.accountId);
      const balance = await ibkr.getBalance();
      res.json(balance);
    } catch (error) {
      console.error("IBKR balance error:", error);
      res.status(500).json({ error: "Failed to fetch IBKR balance", details: String(error) });
    }
  });

  app.get("/api/ibkr/positions", async (_req: Request, res: Response) => {
    try {
      if (!requireCredentials(res)) return;
      const creds = getCredentials()!;
      const ibkr = getIBKRService(creds.accessToken, creds.accountId);
      const positions = await ibkr.getPositions();
      res.json(positions);
    } catch (error) {
      console.error("IBKR positions error:", error);
      res.status(500).json({ error: "Failed to fetch IBKR positions", details: String(error) });
    }
  });

  app.get("/api/ibkr/orders", async (_req: Request, res: Response) => {
    try {
      if (!requireCredentials(res)) return;
      const creds = getCredentials()!;
      const ibkr = getIBKRService(creds.accessToken, creds.accountId);
      const orders = await ibkr.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("IBKR orders error:", error);
      res.status(500).json({ error: "Failed to fetch IBKR orders", details: String(error) });
    }
  });

  app.post("/api/ibkr/order", async (req: Request, res: Response) => {
    try {
      if (!requireCredentials(res)) return;
      const { symbol, action, orderType, quantity, price, tif } = req.body;

      if (!symbol || !action || !orderType || !quantity) {
        return res.status(400).json({ error: "Missing required fields: symbol, action, orderType, quantity" });
      }
      if (!["BUY", "SELL"].includes(action)) {
        return res.status(400).json({ error: "action must be BUY or SELL" });
      }
      if (!["MKT", "LMT"].includes(orderType)) {
        return res.status(400).json({ error: "orderType must be MKT or LMT" });
      }
      if (orderType === "LMT" && !price) {
        return res.status(400).json({ error: "price is required for limit orders" });
      }

      const creds = getCredentials()!;
      const ibkr = getIBKRService(creds.accessToken, creds.accountId);
      const result = await ibkr.placeOrder({ symbol, action, orderType, quantity, price, tif });
      res.json(result);
    } catch (error) {
      console.error("IBKR place order error:", error);
      res.status(500).json({ error: "Failed to place IBKR order", details: String(error) });
    }
  });

  app.delete("/api/ibkr/order/:orderId", async (req: Request, res: Response) => {
    try {
      if (!requireCredentials(res)) return;
      const { orderId } = req.params;
      const creds = getCredentials()!;
      const ibkr = getIBKRService(creds.accessToken, creds.accountId);
      const result = await ibkr.cancelOrder(orderId);
      res.json(result);
    } catch (error) {
      console.error("IBKR cancel order error:", error);
      res.status(500).json({ error: "Failed to cancel IBKR order", details: String(error) });
    }
  });
}
