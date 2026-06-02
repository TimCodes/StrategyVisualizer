import {
  Strategy,
  MarketData,
  PriceData,
  Trade,
  BacktestResult,
  PortfolioMetrics,
  PerformanceData,
  InsertStrategy,
  InsertTrade,
  InsertBacktest,
  OrderBook,
} from "@shared/schema";

function hydrateStrategy(data: any): Strategy {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    gateHistory: (data.gateHistory ?? []).map((e: any) => ({
      ...e,
      at: new Date(e.at),
    })),
  };
}

function hydrateTrade(data: any): Trade {
  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}

function hydrateBacktest(data: any): BacktestResult {
  return {
    ...data,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    createdAt: new Date(data.createdAt),
  };
}

function hydrateMarketData(data: any): MarketData {
  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}

function hydratePriceData(data: any): PriceData {
  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}

function hydratePerformanceData(data: any): PerformanceData {
  return {
    ...data,
    date: new Date(data.date),
  };
}

function hydrateOrderBook(data: any): OrderBook {
  return {
    ...data,
    lastUpdate: new Date(data.lastUpdate),
  };
}

export class TradingService {
  static async getStrategies(): Promise<Strategy[]> {
    const res = await fetch('/api/strategies');
    if (!res.ok) throw new Error('Failed to fetch strategies');
    const data = await res.json();
    return data.map(hydrateStrategy);
  }

  static async getStrategyById(id: string): Promise<Strategy> {
    const res = await fetch(`/api/strategies/${id}`);
    if (!res.ok) throw new Error('Failed to fetch strategy');
    const data = await res.json();
    return hydrateStrategy(data);
  }

  static async createStrategy(data: InsertStrategy): Promise<Strategy> {
    const res = await fetch('/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create strategy');
    const result = await res.json();
    return hydrateStrategy(result);
  }

  static async updateStrategy(id: string, data: Partial<InsertStrategy>): Promise<Strategy> {
    const res = await fetch(`/api/strategies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update strategy');
    const result = await res.json();
    return hydrateStrategy(result);
  }

  static async deleteStrategy(id: string): Promise<void> {
    const res = await fetch(`/api/strategies/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete strategy');
  }

  static async recordGate(
    id: string,
    params: { result: "passed" | "failed" | "discarded"; note?: string }
  ): Promise<Strategy> {
    const res = await fetch(`/api/strategies/${id}/gate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to record gate transition');
    const data = await res.json();
    return hydrateStrategy(data);
  }

  static async getMarketData(): Promise<MarketData[]> {
    const res = await fetch('/api/markets');
    if (!res.ok) throw new Error('Failed to fetch market data');
    const data = await res.json();
    return data.map(hydrateMarketData);
  }

  static async getPriceData(symbol: string, days: number = 30): Promise<PriceData[]> {
    const res = await fetch(`/api/markets/price?symbol=${encodeURIComponent(symbol)}&days=${days}`);
    if (!res.ok) {
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
          volume: Math.random() * 1000000 + 500000,
        };
      });
    }
    const data = await res.json();
    return data.map(hydratePriceData);
  }

  static async getTrades(): Promise<Trade[]> {
    const res = await fetch('/api/trades');
    if (!res.ok) throw new Error('Failed to fetch trades');
    const data = await res.json();
    return data.map(hydrateTrade);
  }

  static async createTrade(data: InsertTrade): Promise<Trade> {
    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create trade');
    const result = await res.json();
    return hydrateTrade(result);
  }

  static async getBacktestResults(): Promise<BacktestResult[]> {
    const res = await fetch('/api/backtests');
    if (!res.ok) throw new Error('Failed to fetch backtests');
    const data = await res.json();
    return data.map(hydrateBacktest);
  }

  static async createBacktest(data: InsertBacktest): Promise<BacktestResult> {
    const res = await fetch('/api/backtests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create backtest');
    const result = await res.json();
    return hydrateBacktest(result);
  }

  static async updateBacktest(id: string, data: Partial<InsertBacktest>): Promise<BacktestResult> {
    const res = await fetch(`/api/backtests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update backtest');
    const result = await res.json();
    return hydrateBacktest(result);
  }

  static async getPortfolioMetrics(): Promise<PortfolioMetrics> {
    const res = await fetch('/api/portfolio/metrics');
    if (!res.ok) throw new Error('Failed to fetch portfolio metrics');
    return res.json();
  }

  static async getPerformanceData(): Promise<PerformanceData[]> {
    const res = await fetch('/api/portfolio/performance');
    if (!res.ok) throw new Error('Failed to fetch performance data');
    const data = await res.json();
    return data.map(hydratePerformanceData);
  }

  static async getPerformanceDataWithRange(startDate: Date, endDate: Date): Promise<PerformanceData[]> {
    const url = `/api/portfolio/performance?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch performance data');
    const data = await res.json();
    return data.map(hydratePerformanceData);
  }

  static async runBacktest(params: {
    strategyId: string;
    startDate: string;
    endDate: string;
    initialCapital: number;
    symbol: string;
  }): Promise<BacktestResult> {
    const res = await fetch('/api/backtests/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to run backtest');
    const result = await res.json();
    return hydrateBacktest(result);
  }

  static async getOrderBook(symbol: string): Promise<OrderBook> {
    const res = await fetch(`/api/markets/orderbook?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error('Failed to fetch order book');
    const data = await res.json();
    return hydrateOrderBook(data);
  }
}
