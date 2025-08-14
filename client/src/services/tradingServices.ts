import {
  mockStrategies,
  mockMarketData,
  mockPriceData,
  mockTrades,
  mockBacktestResults,
  mockPortfolioMetrics,
  mockPerformanceData,
} from "./mockData";

export class TradingService {
  static async getStrategies() {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockStrategies), 500);
    });
  }

  static async getMarketData() {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockMarketData), 300);
    });
  }

  static async getPriceData(symbol: string, timeframe: string = "1d") {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockPriceData), 400);
    });
  }

  static async getTrades() {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockTrades), 300);
    });
  }

  static async getBacktestResults() {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockBacktestResults), 600);
    });
  }

  static async getPortfolioMetrics() {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockPortfolioMetrics), 400);
    });
  }

  static async getPerformanceData() {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockPerformanceData), 500);
    });
  }

  static async runBacktest(strategyId: string, params: any) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: Date.now().toString(),
          status: "running",
          message: "Backtest started successfully",
        });
      }, 1000);
    });
  }
}
