import type { Express, Request, Response } from "express";
import { storage } from "../storage";

export function registerMarketRoutes(app: Express) {
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

  app.get("/api/markets/orderbook", async (req: Request, res: Response) => {
    try {
      const symbol = (req.query.symbol as string) || "BTC/USD";
      
      const coinMap: Record<string, string> = {
        "BTC/USD": "bitcoin",
        "ETH/USD": "ethereum",
        "SOL/USD": "solana",
        "ADA/USD": "cardano",
        "XRP/USD": "ripple",
      };
      
      const coinId = coinMap[symbol] || "bitcoin";
      
      // Try to get real order book from CoinGecko exchange tickers
      const url = `https://api.coingecko.com/api/v3/coins/${coinId}/tickers?exchange_ids=binance&depth=true`;
      
      let basePrice = 42000;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.tickers && data.tickers.length > 0) {
            basePrice = data.tickers[0].last || basePrice;
          }
        }
      } catch {
        // Use mock price if API fails
      }
      
      // Generate realistic order book data around the current price
      const orderBook = generateOrderBook(symbol, basePrice);
      res.json(orderBook);
    } catch (error) {
      console.error("Order book fetch error:", error);
      res.json(generateOrderBook("BTC/USD", 42000));
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
}

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

function generateOrderBook(symbol: string, basePrice: number) {
  const levels = 15;
  const priceStep = basePrice * 0.0005; // 0.05% step between levels
  
  // Generate bids (buy orders) - below current price
  const bids = Array.from({ length: levels }, (_, i) => {
    const price = basePrice - (i + 1) * priceStep;
    const quantity = (Math.random() * 5 + 0.5) * (1 + i * 0.1); // More volume at lower prices
    return {
      price: Math.round(price * 100) / 100,
      quantity: Math.round(quantity * 10000) / 10000,
      total: 0,
    };
  });
  
  // Generate asks (sell orders) - above current price
  const asks = Array.from({ length: levels }, (_, i) => {
    const price = basePrice + (i + 1) * priceStep;
    const quantity = (Math.random() * 5 + 0.5) * (1 + i * 0.1);
    return {
      price: Math.round(price * 100) / 100,
      quantity: Math.round(quantity * 10000) / 10000,
      total: 0,
    };
  });
  
  // Calculate cumulative totals
  let bidTotal = 0;
  bids.forEach(bid => {
    bidTotal += bid.quantity;
    bid.total = Math.round(bidTotal * 10000) / 10000;
  });
  
  let askTotal = 0;
  asks.forEach(ask => {
    askTotal += ask.quantity;
    ask.total = Math.round(askTotal * 10000) / 10000;
  });
  
  const bestBid = bids[0].price;
  const bestAsk = asks[0].price;
  const spread = bestAsk - bestBid;
  const spreadPercent = (spread / basePrice) * 100;
  
  return {
    symbol,
    bids,
    asks,
    spread: Math.round(spread * 100) / 100,
    spreadPercent: Math.round(spreadPercent * 10000) / 10000,
    lastUpdate: new Date(),
  };
}
