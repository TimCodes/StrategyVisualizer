import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { 
  Strategy, 
  MarketData, 
  Trade, 
  BacktestResult, 
  PortfolioMetrics, 
  PerformanceData,
  DateRange,
  InsertStrategy,
  InsertTrade,
  InsertBacktest,
  ChatMessage,
  InsertChatMessage,
  Settings,
  InsertSettings,
  settingsTable,
  SettingsDb,
  InsertSettingsDb
} from "@shared/schema";
import { getDb } from "./db";

export interface IStorage {
  getStrategies(): Promise<Strategy[]>;
  getStrategyById(id: string): Promise<Strategy | null>;
  createStrategy(data: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: string, data: Partial<InsertStrategy>): Promise<Strategy>;
  deleteStrategy(id: string): Promise<void>;

  getTrades(): Promise<Trade[]>;
  getTradesByStrategy(strategyId: string): Promise<Trade[]>;
  createTrade(data: InsertTrade): Promise<Trade>;

  getBacktestResults(): Promise<BacktestResult[]>;
  createBacktest(data: InsertBacktest): Promise<BacktestResult>;
  updateBacktest(id: string, data: Partial<InsertBacktest>): Promise<BacktestResult>;

  getPortfolioMetrics(): Promise<PortfolioMetrics>;
  getPerformanceData(dateRange?: DateRange): Promise<PerformanceData[]>;

  getMarketData(): Promise<MarketData[]>;

  getChatMessages(): Promise<ChatMessage[]>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;
  clearChatHistory(): Promise<void>;

  getSettings(): Promise<Settings>;
  updateSettings(data: InsertSettings): Promise<Settings>;
}

export class MemStorage implements IStorage {
  private strategies: Map<string, Strategy>;
  private marketData: Map<string, MarketData>;
  private trades: Map<string, Trade>;
  private backtestResults: Map<string, BacktestResult>;
  private performanceData: PerformanceData[];
  private portfolioMetrics: PortfolioMetrics;
  private chatMessages: ChatMessage[];
  private memSettings: Settings;

  constructor() {
    this.strategies = new Map();
    this.marketData = new Map();
    this.trades = new Map();
    this.backtestResults = new Map();
    this.performanceData = [];
    this.chatMessages = [];
    this.memSettings = {
      id: "default",
      refreshInterval: "30s",
      darkMode: true,
      notifications: false,
      autoRefresh: true,
      defaultPositionSize: 1000,
      riskLimit: 2,
      maxPositions: 10,
      autoStopLoss: false,
      exchange: undefined,
      tradeAlerts: true,
      performanceAlerts: false,
      systemAlerts: true,
      email: "",
    };
    this.portfolioMetrics = {
      totalValue: 125467.89,
      totalReturn: 25467.89,
      totalReturnPercent: 24.67,
      sharpeRatio: 1.84,
      maxDrawdown: -8.32,
      winRate: 68.4,
      volatility: 15.6,
      beta: 0.92,
    };
    this.seedData();
  }

  private seedData() {
    const strategies: Strategy[] = [
      {
        id: "1",
        name: "Moving Average Crossover",
        description: "RSI + MACD signals",
        type: "trend_following",
        status: "active",
        performance: 12.4,
        sharpeRatio: 1.84,
        maxDrawdown: -8.32,
        winRate: 68.4,
        totalTrades: 247,
        createdAt: new Date("2024-01-01"),
      },
      {
        id: "2",
        name: "Momentum Strategy",
        description: "Price breakout detection",
        type: "momentum",
        status: "active",
        performance: 8.7,
        sharpeRatio: 1.42,
        maxDrawdown: -12.45,
        winRate: 61.2,
        totalTrades: 189,
        createdAt: new Date("2024-01-15"),
      },
      {
        id: "3",
        name: "Mean Reversion",
        description: "Contrarian approach",
        type: "mean_reversion",
        status: "paused",
        performance: -2.1,
        sharpeRatio: -0.23,
        maxDrawdown: -18.67,
        winRate: 45.8,
        totalTrades: 312,
        createdAt: new Date("2024-02-01"),
      },
    ];
    strategies.forEach((s) => this.strategies.set(s.id, s));

    const marketData: MarketData[] = [
      {
        id: "btc",
        symbol: "BTC/USD",
        name: "Bitcoin",
        price: 43281.50,
        change: 1059.25,
        changePercent: 2.45,
        volume: 28450000000,
        timestamp: new Date(),
      },
      {
        id: "eth",
        symbol: "ETH/USD",
        name: "Ethereum",
        price: 2680.75,
        change: -45.20,
        changePercent: -1.65,
        volume: 12350000000,
        timestamp: new Date(),
      },
      {
        id: "aapl",
        symbol: "AAPL",
        name: "Apple Inc.",
        price: 182.40,
        change: 8.90,
        changePercent: 5.12,
        volume: 85400000,
        timestamp: new Date(),
      },
    ];
    marketData.forEach((m) => this.marketData.set(m.id, m));

    const trades: Trade[] = [
      {
        id: "1",
        symbol: "BTC",
        type: "buy",
        quantity: 0.5,
        price: 43150,
        pnl: 127.50,
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        strategyId: "1",
      },
      {
        id: "2",
        symbol: "ETH",
        type: "sell",
        quantity: 2.0,
        price: 2680,
        pnl: -45.20,
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        strategyId: "2",
      },
      {
        id: "3",
        symbol: "AAPL",
        type: "buy",
        quantity: 10,
        price: 182.40,
        pnl: 89.00,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        strategyId: "1",
      },
    ];
    trades.forEach((t) => this.trades.set(t.id, t));

    const backtestResults: BacktestResult[] = [
      {
        id: "1",
        strategyName: "Moving Average Crossover",
        strategyDescription: "SMA 20/50",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2024-01-01"),
        totalReturn: 24.67,
        sharpeRatio: 1.84,
        maxDrawdown: -8.32,
        winRate: 68.4,
        totalTrades: 247,
        status: "completed",
        createdAt: new Date("2024-01-02"),
      },
      {
        id: "2",
        strategyName: "RSI Divergence",
        strategyDescription: "RSI 14 + Price",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2024-01-01"),
        totalReturn: 18.23,
        sharpeRatio: 1.42,
        maxDrawdown: -12.45,
        winRate: 61.2,
        totalTrades: 189,
        status: "completed",
        createdAt: new Date("2024-01-03"),
      },
      {
        id: "3",
        strategyName: "Bollinger Bands",
        strategyDescription: "BB 20,2 Mean Reversion",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2024-01-01"),
        totalReturn: -3.15,
        sharpeRatio: -0.23,
        maxDrawdown: -18.67,
        winRate: 45.8,
        totalTrades: 312,
        status: "failed",
        createdAt: new Date("2024-01-04"),
      },
    ];
    backtestResults.forEach((b) => this.backtestResults.set(b.id, b));

    this.performanceData = Array.from({ length: 12 }, (_, i) => {
      const date = new Date("2024-01-01");
      date.setMonth(i);
      const portfolioGrowth = 100 + (i * 3.5) + Math.random() * 5;
      const benchmarkGrowth = 100 + (i * 1.8) + Math.random() * 3;
      return {
        date,
        portfolioValue: portfolioGrowth,
        benchmarkValue: benchmarkGrowth,
        drawdown: Math.random() * -10,
      };
    });
  }

  async getStrategies(): Promise<Strategy[]> {
    return Array.from(this.strategies.values());
  }

  async getStrategyById(id: string): Promise<Strategy | null> {
    return this.strategies.get(id) ?? null;
  }

  async createStrategy(data: InsertStrategy): Promise<Strategy> {
    const id = randomUUID();
    const strategy: Strategy = {
      id,
      ...data,
      createdAt: new Date(),
    };
    this.strategies.set(id, strategy);
    return strategy;
  }

  async updateStrategy(id: string, data: Partial<InsertStrategy>): Promise<Strategy> {
    const existing = this.strategies.get(id);
    if (!existing) {
      throw new Error("Strategy not found");
    }
    const updated: Strategy = { ...existing, ...data };
    this.strategies.set(id, updated);
    return updated;
  }

  async deleteStrategy(id: string): Promise<void> {
    if (!this.strategies.has(id)) {
      throw new Error("Strategy not found");
    }
    this.strategies.delete(id);
  }

  async getMarketData(): Promise<MarketData[]> {
    return Array.from(this.marketData.values());
  }

  async getTrades(): Promise<Trade[]> {
    return Array.from(this.trades.values());
  }

  async getTradesByStrategy(strategyId: string): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(
      (trade) => trade.strategyId === strategyId
    );
  }

  async createTrade(data: InsertTrade): Promise<Trade> {
    const id = randomUUID();
    
    const existingTrades = Array.from(this.trades.values())
      .filter((t) => t.symbol.toUpperCase() === data.symbol.toUpperCase())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    let position = 0;
    let totalCost = 0;
    
    for (const t of existingTrades) {
      if (t.type === 'buy') {
        totalCost += t.price * t.quantity;
        position += t.quantity;
      } else {
        if (position > 0) {
          const avgCost = totalCost / position;
          const sharesSold = Math.min(t.quantity, position);
          totalCost -= avgCost * sharesSold;
          position -= sharesSold;
        }
      }
    }
    
    let pnl = 0;
    
    if (data.type === 'sell') {
      if (position > 0) {
        const avgCost = totalCost / position;
        const sharesSold = Math.min(data.quantity, position);
        pnl = (data.price - avgCost) * sharesSold;
      }
    }
    
    pnl = Math.round(pnl * 100) / 100;
    
    const trade: Trade = {
      id,
      symbol: data.symbol,
      type: data.type,
      quantity: data.quantity,
      price: data.price,
      strategyId: data.strategyId,
      timestamp: new Date(),
      pnl,
    };
    this.trades.set(id, trade);
    return trade;
  }

  async getBacktestResults(): Promise<BacktestResult[]> {
    return Array.from(this.backtestResults.values());
  }

  async createBacktest(data: InsertBacktest): Promise<BacktestResult> {
    const id = randomUUID();
    const backtest: BacktestResult = {
      id,
      ...data,
      createdAt: new Date(),
    };
    this.backtestResults.set(id, backtest);
    return backtest;
  }

  async updateBacktest(id: string, data: Partial<InsertBacktest>): Promise<BacktestResult> {
    const existing = this.backtestResults.get(id);
    if (!existing) {
      throw new Error("Backtest not found");
    }
    const updated: BacktestResult = { ...existing, ...data };
    this.backtestResults.set(id, updated);
    return updated;
  }

  async getPortfolioMetrics(): Promise<PortfolioMetrics> {
    const trades = Array.from(this.trades.values());
    
    if (trades.length === 0) {
      return {
        totalValue: 100000,
        totalReturn: 0,
        totalReturnPercent: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        volatility: 0,
        beta: 1,
      };
    }

    const initialCapital = 100000;
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalValue = initialCapital + totalPnL;
    const totalReturnPercent = (totalPnL / initialCapital) * 100;
    
    const profitableTrades = trades.filter((t) => t.pnl > 0).length;
    const winRate = (profitableTrades / trades.length) * 100;

    const returns = trades.map((t) => t.pnl / initialCapital);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * 100;
    
    const riskFreeRate = 0.02 / 252;
    const sharpeRatio = volatility > 0 ? (avgReturn - riskFreeRate) / (volatility / 100) * Math.sqrt(252) : 0;

    let peak = initialCapital;
    let maxDrawdown = 0;
    let runningValue = initialCapital;
    
    const sortedTrades = [...trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    for (const trade of sortedTrades) {
      runningValue += trade.pnl;
      if (runningValue > peak) {
        peak = runningValue;
      }
      const drawdown = ((peak - runningValue) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      totalValue,
      totalReturn: totalPnL,
      totalReturnPercent,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      maxDrawdown: -maxDrawdown,
      winRate: Math.round(winRate * 10) / 10,
      volatility: Math.round(volatility * 10) / 10,
      beta: 0.92,
    };
  }

  async getPerformanceData(dateRange?: DateRange): Promise<PerformanceData[]> {
    if (!dateRange) {
      return this.performanceData;
    }
    return this.performanceData.filter(
      (p) => p.date >= dateRange.start && p.date <= dateRange.end
    );
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    return this.chatMessages;
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: randomUUID(),
      ...data,
      timestamp: new Date(),
    };
    this.chatMessages.push(message);
    return message;
  }

  async clearChatHistory(): Promise<void> {
    this.chatMessages = [];
  }

  async getSettings(): Promise<Settings> {
    const db = await getDb();
    
    if (!db) {
      return this.memSettings;
    }

    try {
      const results = await db.select().from(settingsTable).where(eq(settingsTable.id, "default"));
      
      if (results.length === 0) {
        const defaultSettings: InsertSettingsDb = {
          refreshInterval: "30s",
          darkMode: true,
          notifications: false,
          autoRefresh: true,
          defaultPositionSize: 1000,
          riskLimit: 2,
          maxPositions: 10,
          autoStopLoss: false,
          exchange: null,
          tradeAlerts: true,
          performanceAlerts: false,
          systemAlerts: true,
          email: null,
        };
        
        const inserted = await db.insert(settingsTable).values({ id: "default", ...defaultSettings }).returning();
        return this.dbSettingsToSettings(inserted[0]);
      }
      
      return this.dbSettingsToSettings(results[0]);
    } catch (error) {
      console.error("Database error fetching settings, using in-memory fallback:", error);
      return this.memSettings;
    }
  }

  async updateSettings(data: InsertSettings): Promise<Settings> {
    const db = await getDb();
    
    if (!db) {
      this.memSettings = { ...this.memSettings, ...data };
      return this.memSettings;
    }

    try {
      const dbData: Partial<InsertSettingsDb> = {
        refreshInterval: data.refreshInterval,
        darkMode: data.darkMode,
        notifications: data.notifications,
        autoRefresh: data.autoRefresh,
        defaultPositionSize: data.defaultPositionSize,
        riskLimit: data.riskLimit,
        maxPositions: data.maxPositions,
        autoStopLoss: data.autoStopLoss,
        exchange: data.exchange ?? null,
        tradeAlerts: data.tradeAlerts,
        performanceAlerts: data.performanceAlerts,
        systemAlerts: data.systemAlerts,
        email: data.email ?? null,
      };
      
      const existing = await db.select().from(settingsTable).where(eq(settingsTable.id, "default"));
      
      if (existing.length === 0) {
        const inserted = await db.insert(settingsTable).values({ id: "default", ...dbData }).returning();
        return this.dbSettingsToSettings(inserted[0]);
      }
      
      const updated = await db.update(settingsTable).set(dbData).where(eq(settingsTable.id, "default")).returning();
      return this.dbSettingsToSettings(updated[0]);
    } catch (error) {
      console.error("Database error updating settings, using in-memory fallback:", error);
      this.memSettings = { ...this.memSettings, ...data };
      return this.memSettings;
    }
  }

  private dbSettingsToSettings(dbSettings: SettingsDb): Settings {
    return {
      id: dbSettings.id,
      refreshInterval: dbSettings.refreshInterval as "5s" | "10s" | "30s" | "1m",
      darkMode: dbSettings.darkMode,
      notifications: dbSettings.notifications,
      autoRefresh: dbSettings.autoRefresh,
      defaultPositionSize: dbSettings.defaultPositionSize,
      riskLimit: dbSettings.riskLimit,
      maxPositions: dbSettings.maxPositions,
      autoStopLoss: dbSettings.autoStopLoss,
      exchange: dbSettings.exchange as "binance" | "coinbase" | "kraken" | "alpaca" | undefined,
      tradeAlerts: dbSettings.tradeAlerts,
      performanceAlerts: dbSettings.performanceAlerts,
      systemAlerts: dbSettings.systemAlerts,
      email: dbSettings.email ?? "",
    };
  }
}

export const storage = new MemStorage();
