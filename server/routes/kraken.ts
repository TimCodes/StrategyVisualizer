import type { Express, Request, Response } from "express";
import { getKrakenService } from "../services/exchanges/kraken";

export function registerKrakenRoutes(app: Express) {
  app.get("/api/kraken/ticker", async (req: Request, res: Response) => {
    try {
      const symbol = (req.query.symbol as string) || "BTC/USD";
      const kraken = getKrakenService();
      const ticker = await kraken.getTicker(symbol);
      res.json(ticker);
    } catch (error) {
      console.error("Kraken ticker error:", error);
      res.status(500).json({ error: "Failed to fetch Kraken ticker" });
    }
  });

  app.get("/api/kraken/markets", async (_req: Request, res: Response) => {
    try {
      const symbols = ["BTC/USD", "ETH/USD", "SOL/USD", "ADA/USD", "XRP/USD"];
      const kraken = getKrakenService();
      const tickers = await kraken.getMultipleTickers(symbols);
      res.json(tickers);
    } catch (error) {
      console.error("Kraken markets error:", error);
      res.status(500).json({ error: "Failed to fetch Kraken markets" });
    }
  });

  app.get("/api/kraken/ohlc", async (req: Request, res: Response) => {
    try {
      const symbol = (req.query.symbol as string) || "BTC/USD";
      const interval = parseInt(req.query.interval as string) || 1440;
      const kraken = getKrakenService();
      const ohlc = await kraken.getOHLC(symbol, interval);
      res.json(ohlc);
    } catch (error) {
      console.error("Kraken OHLC error:", error);
      res.status(500).json({ error: "Failed to fetch Kraken OHLC data" });
    }
  });

  app.get("/api/kraken/orderbook", async (req: Request, res: Response) => {
    try {
      const symbol = (req.query.symbol as string) || "BTC/USD";
      const count = parseInt(req.query.count as string) || 15;
      const kraken = getKrakenService();
      const orderBook = await kraken.getOrderBook(symbol, count);
      res.json(orderBook);
    } catch (error) {
      console.error("Kraken order book error:", error);
      res.status(500).json({ error: "Failed to fetch Kraken order book" });
    }
  });

  app.get("/api/kraken/pairs", async (_req: Request, res: Response) => {
    try {
      const kraken = getKrakenService();
      const pairs = await kraken.getAssetPairs();
      res.json(pairs);
    } catch (error) {
      console.error("Kraken pairs error:", error);
      res.status(500).json({ error: "Failed to fetch Kraken asset pairs" });
    }
  });

  app.get("/api/kraken/balance", async (_req: Request, res: Response) => {
    try {
      const apiKey = process.env.KRAKEN_API_KEY;
      const apiSecret = process.env.KRAKEN_API_SECRET;

      if (!apiKey || !apiSecret) {
        return res.status(401).json({ 
          error: "Kraken API credentials not configured",
          message: "Please add KRAKEN_API_KEY and KRAKEN_API_SECRET to use this feature"
        });
      }

      const kraken = getKrakenService(apiKey, apiSecret);
      const balance = await kraken.getBalance();
      res.json(balance);
    } catch (error) {
      console.error("Kraken balance error:", error);
      res.status(500).json({ error: "Failed to fetch Kraken balance" });
    }
  });

  app.get("/api/kraken/orders", async (_req: Request, res: Response) => {
    try {
      const apiKey = process.env.KRAKEN_API_KEY;
      const apiSecret = process.env.KRAKEN_API_SECRET;

      if (!apiKey || !apiSecret) {
        return res.status(401).json({ 
          error: "Kraken API credentials not configured",
          message: "Please add KRAKEN_API_KEY and KRAKEN_API_SECRET to use this feature"
        });
      }

      const kraken = getKrakenService(apiKey, apiSecret);
      const orders = await kraken.getOpenOrders();
      res.json(orders);
    } catch (error) {
      console.error("Kraken orders error:", error);
      res.status(500).json({ error: "Failed to fetch Kraken orders" });
    }
  });

  app.post("/api/kraken/order", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.KRAKEN_API_KEY;
      const apiSecret = process.env.KRAKEN_API_SECRET;

      if (!apiKey || !apiSecret) {
        return res.status(401).json({ 
          error: "Kraken API credentials not configured",
          message: "Please add KRAKEN_API_KEY and KRAKEN_API_SECRET to use this feature"
        });
      }

      const { pair, type, ordertype, volume, price } = req.body;

      if (!pair || !type || !ordertype || !volume) {
        return res.status(400).json({ error: "Missing required order parameters" });
      }

      const kraken = getKrakenService(apiKey, apiSecret);
      const result = await kraken.placeOrder({ pair, type, ordertype, volume, price });
      res.json(result);
    } catch (error) {
      console.error("Kraken order error:", error);
      res.status(500).json({ error: "Failed to place Kraken order" });
    }
  });

  app.delete("/api/kraken/order/:txid", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.KRAKEN_API_KEY;
      const apiSecret = process.env.KRAKEN_API_SECRET;

      if (!apiKey || !apiSecret) {
        return res.status(401).json({ 
          error: "Kraken API credentials not configured",
          message: "Please add KRAKEN_API_KEY and KRAKEN_API_SECRET to use this feature"
        });
      }

      const { txid } = req.params;
      const kraken = getKrakenService(apiKey, apiSecret);
      const result = await kraken.cancelOrder(txid);
      res.json(result);
    } catch (error) {
      console.error("Kraken cancel order error:", error);
      res.status(500).json({ error: "Failed to cancel Kraken order" });
    }
  });
}
