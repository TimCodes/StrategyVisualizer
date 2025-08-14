import { randomUUID } from "crypto";
import { Strategy, MarketData, Trade, BacktestResult } from "@shared/schema";

// Trading data storage interface
export interface IStorage {
  getStrategies(): Promise<Strategy[]>;
  getMarketData(): Promise<MarketData[]>;
  getTrades(): Promise<Trade[]>;
  getBacktestResults(): Promise<BacktestResult[]>;
}

export class MemStorage implements IStorage {
  private strategies: Map<string, Strategy>;
  private marketData: Map<string, MarketData>;
  private trades: Map<string, Trade>;
  private backtestResults: Map<string, BacktestResult>;

  constructor() {
    this.strategies = new Map();
    this.marketData = new Map();
    this.trades = new Map();
    this.backtestResults = new Map();
  }

  async getStrategies(): Promise<Strategy[]> {
    return Array.from(this.strategies.values());
  }

  async getMarketData(): Promise<MarketData[]> {
    return Array.from(this.marketData.values());
  }

  async getTrades(): Promise<Trade[]> {
    return Array.from(this.trades.values());
  }

  async getBacktestResults(): Promise<BacktestResult[]> {
    return Array.from(this.backtestResults.values());
  }
}

export const storage = new MemStorage();
