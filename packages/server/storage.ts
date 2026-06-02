import { randomUUID } from "crypto";
import { eq, desc, count } from "drizzle-orm";
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
  InsertSettingsDb,
  LeanProject,
  InsertLeanProject,
  LeanBacktest,
  InsertLeanBacktest,
  leanProjectsTable,
  leanBacktestsTable,
  GateHistoryEntry,
  nextStage,
  Trial,
  InsertTrial,
  trialsTable,
  GateResult,
  InsertGateResult,
  gateResultsTable,
  IncubationObservation,
  WalkForwardConfig,
} from "@shared/schema";
import { getDb } from "./db";

export interface IStorage {
  getStrategies(): Promise<Strategy[]>;
  getStrategyById(id: string): Promise<Strategy | null>;
  createStrategy(data: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: string, data: Partial<InsertStrategy>): Promise<Strategy>;
  deleteStrategy(id: string): Promise<void>;
  recordGate(id: string, params: { result: "passed" | "failed" | "discarded"; note?: string }): Promise<Strategy>;
  appendRefinementLog(id: string, entry: { refinementType: "logic_fix" | "optimization"; rationale: string }): Promise<void>;

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

  getLeanProjects(): Promise<LeanProject[]>;
  getLeanProjectByName(name: string): Promise<LeanProject | null>;
  createLeanProject(data: InsertLeanProject): Promise<LeanProject>;
  updateLeanProjectCode(name: string, code: string): Promise<LeanProject>;
  updateLeanProjectLastBacktest(name: string, backtestId: string): Promise<void>;
  deleteLeanProject(name: string): Promise<void>;

  createLeanBacktest(data: InsertLeanBacktest): Promise<LeanBacktest>;
  updateLeanBacktest(id: string, data: Partial<InsertLeanBacktest>): Promise<LeanBacktest>;
  getLeanBacktestsByProject(projectId: string): Promise<LeanBacktest[]>;

  recordTrial(data: InsertTrial): Promise<Trial>;
  getTrialCount(strategyId?: string): Promise<{
    total: number;
    byType: { generation: number; refinement: number; optimization: number };
  }>;
  getTrials(limit?: number): Promise<Trial[]>;

  recordGateResult(data: InsertGateResult): Promise<GateResult>;
  getGateResults(strategyId: string): Promise<GateResult[]>;
  startIncubation(strategyId: string, requiredDays: number): Promise<Strategy>;
  addIncubationObservation(strategyId: string, obs: IncubationObservation): Promise<Strategy>;
  updateWalkForwardConfig(strategyId: string, config: WalkForwardConfig): Promise<Strategy>;
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
  private leanProjects: Map<string, LeanProject>;
  private leanBacktests: Map<string, LeanBacktest>;
  private trials: Trial[];
  private gateResults: Map<string, GateResult>;

  constructor() {
    this.strategies = new Map();
    this.marketData = new Map();
    this.trades = new Map();
    this.backtestResults = new Map();
    this.performanceData = [];
    this.chatMessages = [];
    this.leanProjects = new Map();
    this.leanBacktests = new Map();
    this.trials = [];
    this.gateResults = new Map();
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
      exchange: "coingecko",
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
        stage: "live",
        gateStatus: "passed",
        gateHistory: [{ stage: "live", result: "passed", at: new Date("2024-01-01") }],
        refinementHistory: [],
        incubationObservations: [],
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
        stage: "live",
        gateStatus: "passed",
        gateHistory: [{ stage: "live", result: "passed", at: new Date("2024-01-15") }],
        refinementHistory: [],
        incubationObservations: [],
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
        stage: "idea",
        gateStatus: "in_progress",
        gateHistory: [],
        refinementHistory: [],
        incubationObservations: [],
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
        dataSource: "simulated",
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
        dataSource: "simulated",
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
        dataSource: "simulated",
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
      ...data,
      id,
      createdAt: new Date(),
      stage: data.stage ?? "idea",
      gateStatus: data.gateStatus ?? "in_progress",
      gateHistory: data.gateHistory ?? [],
      refinementHistory: data.refinementHistory ?? [],
      incubationObservations: data.incubationObservations ?? [],
    };
    this.strategies.set(id, strategy);
    return strategy;
  }

  async appendRefinementLog(
    id: string,
    entry: { refinementType: "logic_fix" | "optimization"; rationale: string }
  ): Promise<void> {
    const existing = this.strategies.get(id);
    if (!existing) return;
    const updated: Strategy = {
      ...existing,
      refinementHistory: [
        ...(existing.refinementHistory ?? []),
        { refinementType: entry.refinementType, rationale: entry.rationale, at: new Date() },
      ],
    };
    this.strategies.set(id, updated);
  }

  async updateStrategy(id: string, data: Partial<InsertStrategy>): Promise<Strategy> {
    const existing = this.strategies.get(id);
    if (!existing) {
      throw new Error("Strategy not found");
    }
    // Gate transition fields are managed exclusively by recordGate
    const { stage: _s, gateStatus: _gs, gateHistory: _gh, ...safeData } = data as any;
    const updated: Strategy = { ...existing, ...safeData };
    this.strategies.set(id, updated);
    return updated;
  }

  async recordGate(
    id: string,
    params: { result: "passed" | "failed" | "discarded"; note?: string }
  ): Promise<Strategy> {
    const existing = this.strategies.get(id);
    if (!existing) {
      throw new Error("Strategy not found");
    }
    const entry: GateHistoryEntry = {
      stage: existing.stage,
      result: params.result,
      note: params.note,
      at: new Date(),
    };
    const gateHistory = [...existing.gateHistory, entry];
    let stage = existing.stage;
    let gateStatus = existing.gateStatus;

    if (params.result === "passed") {
      const next = nextStage(existing.stage);
      if (next !== null) {
        stage = next;
        gateStatus = "in_progress";
      } else {
        gateStatus = "passed";
      }
    } else if (params.result === "failed") {
      gateStatus = "failed";
    } else if (params.result === "discarded") {
      gateStatus = "discarded";
    }

    const updated: Strategy = { ...existing, stage, gateStatus, gateHistory };
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
      exchange: (dbSettings.exchange ?? "coingecko") as "binance" | "coinbase" | "kraken" | "alpaca" | "coingecko" | "ibkr",
      tradeAlerts: dbSettings.tradeAlerts,
      performanceAlerts: dbSettings.performanceAlerts,
      systemAlerts: dbSettings.systemAlerts,
      email: dbSettings.email ?? "",
    };
  }

  async getLeanProjects(): Promise<LeanProject[]> {
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(leanProjectsTable).orderBy(desc(leanProjectsTable.updatedAt));
        return rows.map(this.mapDbLeanProject);
      }
    } catch {
      // fall through to in-memory
    }
    return Array.from(this.leanProjects.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async getLeanProjectByName(name: string): Promise<LeanProject | null> {
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(leanProjectsTable).where(eq(leanProjectsTable.name, name));
        return rows[0] ? this.mapDbLeanProject(rows[0]) : null;
      }
    } catch {
      // fall through to in-memory
    }
    return this.leanProjects.get(name) ?? null;
  }

  async createLeanProject(data: InsertLeanProject): Promise<LeanProject> {
    const now = new Date();
    const project: LeanProject = {
      id: randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.leanProjects.set(project.name, project);
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.insert(leanProjectsTable).values({
          name: data.name,
          code: data.code,
          description: data.description ?? null,
          generatedBy: data.generatedBy ?? null,
          lastBacktestId: data.lastBacktestId ?? null,
        }).returning();
        return this.mapDbLeanProject(rows[0]);
      }
    } catch {
      // in-memory copy already set above
    }
    return project;
  }

  async updateLeanProjectCode(name: string, code: string): Promise<LeanProject> {
    const existing = this.leanProjects.get(name);
    if (!existing) throw new Error("Project not found");
    const updated: LeanProject = { ...existing, code, updatedAt: new Date() };
    this.leanProjects.set(name, updated);
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.update(leanProjectsTable)
          .set({ code, updatedAt: new Date() })
          .where(eq(leanProjectsTable.name, name))
          .returning();
        if (rows[0]) return this.mapDbLeanProject(rows[0]);
      }
    } catch {
      // in-memory copy already updated above
    }
    return updated;
  }

  async updateLeanProjectLastBacktest(name: string, backtestId: string): Promise<void> {
    const existing = this.leanProjects.get(name);
    if (existing) {
      this.leanProjects.set(name, {
        ...existing,
        lastBacktestId: backtestId,
        updatedAt: new Date(),
      });
    }
    try {
      const db = await getDb();
      if (db) {
        await db.update(leanProjectsTable)
          .set({ lastBacktestId: backtestId, updatedAt: new Date() })
          .where(eq(leanProjectsTable.name, name));
      }
    } catch {
      // in-memory copy already updated above
    }
  }

  async deleteLeanProject(name: string): Promise<void> {
    if (!this.leanProjects.has(name)) throw new Error("Project not found");
    this.leanProjects.delete(name);
    try {
      const db = await getDb();
      if (db) {
        await db.delete(leanProjectsTable).where(eq(leanProjectsTable.name, name));
      }
    } catch {
      // in-memory copy already deleted above
    }
  }

  async createLeanBacktest(data: InsertLeanBacktest): Promise<LeanBacktest> {
    const backtest: LeanBacktest = {
      id: randomUUID(),
      ...data,
      runAt: new Date(),
    };
    this.leanBacktests.set(backtest.id, backtest);
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.insert(leanBacktestsTable).values({
          projectId: data.projectId,
          status: data.status,
          totalReturn: data.totalReturn,
          sharpeRatio: data.sharpeRatio,
          maxDrawdown: data.maxDrawdown,
          winRate: data.winRate,
          totalTrades: data.totalTrades,
          equityCurve: data.equityCurve,
          rawResults: data.rawResults,
          errorLog: data.errorLog ?? null,
        }).returning();
        return this.mapDbLeanBacktest(rows[0]);
      }
    } catch {
      // in-memory copy already set above
    }
    return backtest;
  }

  async updateLeanBacktest(id: string, data: Partial<InsertLeanBacktest>): Promise<LeanBacktest> {
    const existing = this.leanBacktests.get(id);
    if (!existing) throw new Error("Backtest not found");
    const updated: LeanBacktest = { ...existing, ...data };
    this.leanBacktests.set(id, updated);
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.update(leanBacktestsTable)
          .set(data)
          .where(eq(leanBacktestsTable.id, id))
          .returning();
        if (rows[0]) return this.mapDbLeanBacktest(rows[0]);
      }
    } catch {
      // in-memory copy already updated above
    }
    return updated;
  }

  async getLeanBacktestsByProject(projectId: string): Promise<LeanBacktest[]> {
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(leanBacktestsTable)
          .where(eq(leanBacktestsTable.projectId, projectId))
          .orderBy(desc(leanBacktestsTable.runAt));
        return rows.map(this.mapDbLeanBacktest);
      }
    } catch {
      // fall through to in-memory
    }
    return Array.from(this.leanBacktests.values())
      .filter((b) => b.projectId === projectId)
      .sort((a, b) => b.runAt.getTime() - a.runAt.getTime());
  }

  private mapDbLeanProject(row: typeof leanProjectsTable.$inferSelect): LeanProject {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description ?? undefined,
      generatedBy: row.generatedBy ?? undefined,
      lastBacktestId: row.lastBacktestId ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapDbLeanBacktest(row: typeof leanBacktestsTable.$inferSelect): LeanBacktest {
    return {
      id: row.id,
      projectId: row.projectId,
      status: row.status as LeanBacktest["status"],
      totalReturn: row.totalReturn,
      sharpeRatio: row.sharpeRatio,
      maxDrawdown: row.maxDrawdown,
      winRate: row.winRate,
      totalTrades: row.totalTrades,
      equityCurve: row.equityCurve as LeanBacktest["equityCurve"],
      rawResults: row.rawResults as LeanBacktest["rawResults"],
      dataSource: (row.dataSource as "simulated" | "live_engine") ?? "simulated",
      errorLog: row.errorLog ?? null,
      runAt: row.runAt,
    };
  }

  async recordTrial(data: InsertTrial): Promise<Trial> {
    const trial: Trial = {
      id: randomUUID(),
      trialType: data.trialType,
      strategyId: data.strategyId ?? null,
      leanProjectName: data.leanProjectName ?? null,
      model: data.model ?? null,
      promptSummary: data.promptSummary ?? null,
      createdAt: new Date(),
    };
    this.trials.push(trial);
    try {
      const db = await getDb();
      if (db) {
        await db.insert(trialsTable).values({
          trialType: trial.trialType,
          strategyId: trial.strategyId,
          leanProjectName: trial.leanProjectName,
          model: trial.model,
          promptSummary: trial.promptSummary,
        });
      }
    } catch {
      // DB write failed; in-memory copy already pushed above
    }
    return trial;
  }

  async getTrialCount(strategyId?: string): Promise<{
    total: number;
    byType: { generation: number; refinement: number; optimization: number };
  }> {
    const byType = { generation: 0, refinement: 0, optimization: 0 };
    let source: { trialType: string }[] = strategyId
      ? this.trials.filter((t) => t.strategyId === strategyId)
      : this.trials;
    try {
      const db = await getDb();
      if (db) {
        source = strategyId
          ? await db.select({ trialType: trialsTable.trialType }).from(trialsTable).where(eq(trialsTable.strategyId, strategyId))
          : await db.select({ trialType: trialsTable.trialType }).from(trialsTable);
      }
    } catch {
      // fall through to in-memory source already set above
    }
    for (const r of source) {
      if (r.trialType === "generation") byType.generation++;
      else if (r.trialType === "refinement") byType.refinement++;
      else if (r.trialType === "optimization") byType.optimization++;
    }
    return { total: source.length, byType };
  }

  async getTrials(limit = 50): Promise<Trial[]> {
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(trialsTable)
          .orderBy(desc(trialsTable.createdAt))
          .limit(limit);
        return rows.map((row) => this.mapDbTrial(row));
      }
    } catch {
      // fall through to in-memory
    }
    return [...this.trials]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  private mapDbTrial(row: typeof trialsTable.$inferSelect): Trial {
    return {
      id: row.id,
      trialType: row.trialType,
      strategyId: row.strategyId,
      leanProjectName: row.leanProjectName,
      model: row.model,
      promptSummary: row.promptSummary,
      createdAt: row.createdAt,
    };
  }

  // ─── Gate Results ────────────────────────────────────────────

  async recordGateResult(data: InsertGateResult): Promise<GateResult> {
    const record: GateResult = {
      id: randomUUID(),
      strategyId: data.strategyId,
      gate: data.gate,
      verdict: data.verdict,
      metrics: data.metrics ?? null,
      dataSource: data.dataSource ?? null,
      reason: data.reason ?? null,
      computedAt: new Date(),
    };
    this.gateResults.set(record.id, record);
    try {
      const db = await getDb();
      if (db) {
        const [row] = await db.insert(gateResultsTable).values({
          strategyId: record.strategyId,
          gate: record.gate,
          verdict: record.verdict,
          metrics: record.metrics,
          dataSource: record.dataSource,
          reason: record.reason,
        }).returning();
        if (row) {
          const mapped: GateResult = { ...row, computedAt: row.computedAt };
          this.gateResults.set(mapped.id, mapped);
          return mapped;
        }
      }
    } catch {
      // fall through to in-memory
    }
    return record;
  }

  async getGateResults(strategyId: string): Promise<GateResult[]> {
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(gateResultsTable)
          .where(eq(gateResultsTable.strategyId, strategyId))
          .orderBy(desc(gateResultsTable.computedAt));
        return rows;
      }
    } catch {
      // fall through to in-memory
    }
    return Array.from(this.gateResults.values())
      .filter(r => r.strategyId === strategyId)
      .sort((a, b) => b.computedAt.getTime() - a.computedAt.getTime());
  }

  // ─── Incubation ──────────────────────────────────────────────

  async startIncubation(strategyId: string, requiredDays: number): Promise<Strategy> {
    const existing = this.strategies.get(strategyId);
    if (!existing) throw new Error("Strategy not found");
    const updated: Strategy = {
      ...existing,
      incubationStartedAt: new Date(),
      requiredDays,
      incubationObservations: [],
    };
    this.strategies.set(strategyId, updated);
    return updated;
  }

  async addIncubationObservation(strategyId: string, obs: IncubationObservation): Promise<Strategy> {
    const existing = this.strategies.get(strategyId);
    if (!existing) throw new Error("Strategy not found");
    const updated: Strategy = {
      ...existing,
      incubationObservations: [...(existing.incubationObservations ?? []), obs],
    };
    this.strategies.set(strategyId, updated);
    return updated;
  }

  // ─── Walk-Forward Config ─────────────────────────────────────

  async updateWalkForwardConfig(strategyId: string, config: WalkForwardConfig): Promise<Strategy> {
    const existing = this.strategies.get(strategyId);
    if (!existing) throw new Error("Strategy not found");
    const entry: GateHistoryEntry = {
      stage: existing.stage,
      result: "passed",
      note: `Walk-forward config updated: ${config.numWindows} windows, IS=${config.inSampleDays}d / OOS=${config.outOfSampleDays}d, anchored=${config.anchored}`,
      at: new Date(),
    };
    const updated: Strategy = {
      ...existing,
      walkForwardConfig: { ...config, lockedAt: new Date() },
      gateHistory: [...existing.gateHistory, entry],
    };
    this.strategies.set(strategyId, updated);
    return updated;
  }
}

export const storage = new MemStorage();
