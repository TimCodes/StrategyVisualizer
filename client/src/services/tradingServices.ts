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
} from "@shared/schema";

export class TradingService {
  static async getStrategies(): Promise<Strategy[]> {
    const res = await fetch('/api/strategies');
    if (!res.ok) throw new Error('Failed to fetch strategies');
    return res.json();
  }

  static async getStrategyById(id: string): Promise<Strategy> {
    const res = await fetch(`/api/strategies/${id}`);
    if (!res.ok) throw new Error('Failed to fetch strategy');
    return res.json();
  }

  static async createStrategy(data: InsertStrategy): Promise<Strategy> {
    const res = await fetch('/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create strategy');
    return res.json();
  }

  static async updateStrategy(id: string, data: Partial<InsertStrategy>): Promise<Strategy> {
    const res = await fetch(`/api/strategies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update strategy');
    return res.json();
  }

  static async deleteStrategy(id: string): Promise<void> {
    const res = await fetch(`/api/strategies/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete strategy');
  }

  static async getMarketData(): Promise<MarketData[]> {
    const res = await fetch('/api/markets');
    if (!res.ok) throw new Error('Failed to fetch market data');
    return res.json();
  }

  static async getPriceData(symbol: string, timeframe: string = "1d"): Promise<PriceData[]> {
    const res = await fetch(`/api/markets/price?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`);
    if (!res.ok) {
      return Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
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
    return res.json();
  }

  static async getTrades(): Promise<Trade[]> {
    const res = await fetch('/api/trades');
    if (!res.ok) throw new Error('Failed to fetch trades');
    return res.json();
  }

  static async createTrade(data: InsertTrade): Promise<Trade> {
    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create trade');
    return res.json();
  }

  static async getBacktestResults(): Promise<BacktestResult[]> {
    const res = await fetch('/api/backtests');
    if (!res.ok) throw new Error('Failed to fetch backtests');
    return res.json();
  }

  static async createBacktest(data: InsertBacktest): Promise<BacktestResult> {
    const res = await fetch('/api/backtests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create backtest');
    return res.json();
  }

  static async updateBacktest(id: string, data: Partial<InsertBacktest>): Promise<BacktestResult> {
    const res = await fetch(`/api/backtests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update backtest');
    return res.json();
  }

  static async getPortfolioMetrics(): Promise<PortfolioMetrics> {
    const res = await fetch('/api/portfolio/metrics');
    if (!res.ok) throw new Error('Failed to fetch portfolio metrics');
    return res.json();
  }

  static async getPerformanceData(startDate?: Date, endDate?: Date): Promise<PerformanceData[]> {
    let url = '/api/portfolio/performance';
    if (startDate && endDate) {
      url += `?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch performance data');
    return res.json();
  }

  static async runBacktest(strategyId: string, params: {
    startDate: Date;
    endDate: Date;
    initialCapital?: number;
    symbol?: string;
  }): Promise<{ id: string; status: string; message: string }> {
    const strategy = await this.getStrategyById(strategyId);
    const backtest = await this.createBacktest({
      strategyName: strategy.name,
      strategyDescription: strategy.description,
      startDate: params.startDate,
      endDate: params.endDate,
      totalReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0,
      status: "running",
    });
    return {
      id: backtest.id,
      status: "running",
      message: "Backtest started successfully",
    };
  }
}
