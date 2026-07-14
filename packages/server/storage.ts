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
  StrategyGoals,
  SetGoalsBody,
  PositionSizingPlan,
  SetSizingPlanBody,
  ExpectedPerformance,
  QuitRule,
  SetQuitRuleBody,
  StrategyReview,
  InsertStrategyReview,
  strategyReviewsTable,
  OrderAudit,
  InsertOrderAudit,
  orderAuditTable,
  WalkForwardRun,
  InsertWalkForwardRun,
  walkForwardRunsTable,
  strategiesTable,
  tradesTable,
  backtestResultsTable,
  chatMessagesTable,
} from "@shared/schema";
import { getDb } from "./db";
import { isAuthEnabled } from "./lib/auth";

export interface IStorage {
  getStrategies(): Promise<Strategy[]>;
  getStrategyById(id: string): Promise<Strategy | null>;
  createStrategy(data: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: string, data: Partial<InsertStrategy>): Promise<Strategy>;
  deleteStrategy(id: string): Promise<void>;
  recordGate(id: string, params: { result: "passed" | "failed" | "discarded"; note?: string }): Promise<Strategy>;
  appendRefinementLog(id: string, entry: { refinementType: "logic_fix" | "optimization"; rationale: string }): Promise<void>;
  setStrategyGoals(id: string, goals: SetGoalsBody): Promise<Strategy>;
  setPositionSizingPlan(id: string, plan: SetSizingPlanBody): Promise<Strategy>;
  setExpectedPerformance(id: string, exp: Omit<ExpectedPerformance, "snappedAt">): Promise<Strategy>;
  setQuitRule(id: string, rule: SetQuitRuleBody): Promise<Strategy>;
  createStrategyReview(data: InsertStrategyReview): Promise<StrategyReview>;
  getStrategyReviews(strategyId: string): Promise<StrategyReview[]>;
  recordOrderAudit(data: InsertOrderAudit): Promise<OrderAudit>;
  getOrderAudits(limit?: number): Promise<OrderAudit[]>;

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
  getLeanBacktestById(id: string): Promise<LeanBacktest | null>;

  recordTrial(data: InsertTrial): Promise<Trial>;
  getTrialCount(strategyId?: string): Promise<{
    total: number;
    byType: { generation: number; refinement: number; optimization: number; backtest: number };
  }>;
  getTrials(limit?: number): Promise<Trial[]>;

  recordGateResult(data: InsertGateResult): Promise<GateResult>;
  getGateResults(strategyId: string): Promise<GateResult[]>;
  startIncubation(strategyId: string, requiredDays: number, startedAt?: Date): Promise<Strategy>;
  addIncubationObservation(strategyId: string, obs: IncubationObservation): Promise<Strategy>;
  updateWalkForwardConfig(strategyId: string, config: WalkForwardConfig): Promise<Strategy>;

  createWalkForwardRun(data: InsertWalkForwardRun): Promise<WalkForwardRun>;
  updateWalkForwardRun(id: string, data: Partial<InsertWalkForwardRun>): Promise<WalkForwardRun>;
  getWalkForwardRuns(strategyId: string): Promise<WalkForwardRun[]>;
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
  private wfRuns: Map<string, WalkForwardRun>;
  private strategyReviews: StrategyReview[];
  private orderAudits: OrderAudit[];

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
    this.wfRuns = new Map();
    this.strategyReviews = [];
    this.orderAudits = [];
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
    this.seedMapData();
    this.seedDbIfNeeded().catch(console.error);
  }

  private seedMapData() {
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
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(strategiesTable).orderBy(strategiesTable.createdAt);
        return rows.map((r) => this.mapDbStrategy(r));
      }
    } catch {
      // DB unavailable — fall through to Map
    }
    return Array.from(this.strategies.values());
  }

  async getStrategyById(id: string): Promise<Strategy | null> {
    try {
      const db = await getDb();
      if (db) {
        const [row] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, id));
        return row ? this.mapDbStrategy(row) : null;
      }
    } catch {
      // DB unavailable — fall through to Map
    }
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
    try {
      const db = await getDb();
      if (db) {
        const [row] = await db
          .insert(strategiesTable)
          .values(this.strategyToDbValues(strategy))
          .returning();
        return row ? this.mapDbStrategy(row) : strategy;
      }
    } catch {
      // DB unavailable — fall through to Map
    }
    this.strategies.set(id, strategy);
    return strategy;
  }

  async appendRefinementLog(
    id: string,
    entry: { refinementType: "logic_fix" | "optimization"; rationale: string }
  ): Promise<void> {
    const newEntry = { refinementType: entry.refinementType, rationale: entry.rationale, at: new Date() };
    try {
      const db = await getDb();
      if (db) {
        const [existing] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, id));
        if (!existing) return;
        const current = this.mapDbStrategy(existing);
        const updated: Strategy = {
          ...current,
          refinementHistory: [...(current.refinementHistory ?? []), newEntry],
        };
        await db.update(strategiesTable)
          .set(this.strategyToDbValues(updated))
          .where(eq(strategiesTable.id, id));
        return;
      }
    } catch {
      // DB unavailable — fall through to Map
    }
    const existing = this.strategies.get(id);
    if (!existing) return;
    const updated: Strategy = {
      ...existing,
      refinementHistory: [...(existing.refinementHistory ?? []), newEntry],
    };
    this.strategies.set(id, updated);
  }

  async setStrategyGoals(id: string, goals: SetGoalsBody): Promise<Strategy> {
    // Davey Ch 9: goals are locked once, at the idea stage, before any
    // testing. Changing them after seeing results is optimization.
    const applyGoals = (s: Strategy): Strategy => {
      if (s.goals) throw new Error("Goals already locked");
      if (s.stage !== "idea") throw new Error("Goals can only be set at the idea stage");
      const locked: StrategyGoals = { ...goals, lockedAt: new Date() };
      return { ...s, goals: locked };
    };
    try {
      const db = await getDb();
      if (db) {
        const [existing] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, id));
        if (!existing) throw new Error("Strategy not found");
        const updated = applyGoals(this.mapDbStrategy(existing));
        const [row] = await db
          .update(strategiesTable)
          .set(this.strategyToDbValues(updated))
          .where(eq(strategiesTable.id, id))
          .returning();
        return row ? this.mapDbStrategy(row) : updated;
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "Strategy not found" || msg === "Goals already locked" || msg === "Goals can only be set at the idea stage") {
        throw err;
      }
      // DB connection error — fall through to Map
    }
    const existing = this.strategies.get(id);
    if (!existing) throw new Error("Strategy not found");
    const updated = applyGoals(existing);
    this.strategies.set(id, updated);
    return updated;
  }

  async setPositionSizingPlan(id: string, plan: SetSizingPlanBody): Promise<Strategy> {
    // Davey Ch 16/20: the sizing plan is written before going live and
    // never improvised afterwards. One shot, any stage before live.
    const applyPlan = (s: Strategy): Strategy => {
      if (s.positionSizingPlan) throw new Error("Position sizing plan already locked");
      if (s.stage === "live") throw new Error("Position sizing plan must be locked before going live");
      const locked: PositionSizingPlan = { ...plan, lockedAt: new Date() };
      return { ...s, positionSizingPlan: locked };
    };
    try {
      const db = await getDb();
      if (db) {
        const [existing] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, id));
        if (!existing) throw new Error("Strategy not found");
        const updated = applyPlan(this.mapDbStrategy(existing));
        const [row] = await db
          .update(strategiesTable)
          .set(this.strategyToDbValues(updated))
          .where(eq(strategiesTable.id, id))
          .returning();
        return row ? this.mapDbStrategy(row) : updated;
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (
        msg === "Strategy not found" ||
        msg === "Position sizing plan already locked" ||
        msg === "Position sizing plan must be locked before going live"
      ) {
        throw err;
      }
      // DB connection error — fall through to Map
    }
    const existing = this.strategies.get(id);
    if (!existing) throw new Error("Strategy not found");
    const updated = applyPlan(existing);
    this.strategies.set(id, updated);
    return updated;
  }

  /**
   * Shared helper for the lock-once strategy mutations (goals, sizing plan,
   * quit rule, expected performance). Applies `mutate` against the db copy
   * when available, falling back to the Map; rethrows domain errors.
   */
  private async mutateStrategy(
    id: string,
    mutate: (s: Strategy) => Strategy,
    domainErrors: string[]
  ): Promise<Strategy> {
    try {
      const db = await getDb();
      if (db) {
        const [existing] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, id));
        if (!existing) throw new Error("Strategy not found");
        const updated = mutate(this.mapDbStrategy(existing));
        const [row] = await db
          .update(strategiesTable)
          .set(this.strategyToDbValues(updated))
          .where(eq(strategiesTable.id, id))
          .returning();
        return row ? this.mapDbStrategy(row) : updated;
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "Strategy not found" || domainErrors.includes(msg)) throw err;
      // DB connection error — fall through to Map
    }
    const existing = this.strategies.get(id);
    if (!existing) throw new Error("Strategy not found");
    const updated = mutate(existing);
    this.strategies.set(id, updated);
    return updated;
  }

  async setExpectedPerformance(
    id: string,
    exp: Omit<ExpectedPerformance, "snappedAt">
  ): Promise<Strategy> {
    // The baseline freezes once forward testing begins — re-snapshotting
    // after incubation starts would be moving the goalposts.
    return this.mutateStrategy(
      id,
      (s) => {
        if (s.stage === "incubation" || s.stage === "live") {
          throw new Error("Expected performance is frozen once incubation begins");
        }
        return { ...s, expectedPerformance: { ...exp, snappedAt: new Date() } };
      },
      ["Expected performance is frozen once incubation begins"]
    );
  }

  async setQuitRule(id: string, rule: SetQuitRuleBody): Promise<Strategy> {
    // Davey Ch 24: "As long as I stick to the rule I create at the start,
    // I'd be doing fine." One shot, before going live.
    return this.mutateStrategy(
      id,
      (s) => {
        if (s.quitRule) throw new Error("Quit rule already locked");
        if (s.stage === "live") throw new Error("Quit rule must be locked before going live");
        return { ...s, quitRule: { ...rule, lockedAt: new Date() } };
      },
      ["Quit rule already locked", "Quit rule must be locked before going live"]
    );
  }

  async createStrategyReview(data: InsertStrategyReview): Promise<StrategyReview> {
    const review: StrategyReview = { ...data, id: randomUUID(), createdAt: new Date() };
    this.strategyReviews.push(review);
    try {
      const db = await getDb();
      if (db) {
        const [row] = await db.insert(strategyReviewsTable).values({
          id: review.id,
          strategyId: review.strategyId,
          periodLabel: review.periodLabel,
          surprised: review.surprised,
          resultsInLineWithExpectations: review.resultsInLineWithExpectations,
          fillsComparable: review.fillsComparable,
          reasonToStop: review.reasonToStop,
          reasonToChangeSizing: review.reasonToChangeSizing,
          note: review.note ?? null,
          createdAt: review.createdAt,
        }).returning();
        if (row) return this.mapDbReview(row);
      }
    } catch {
      // in-memory copy already pushed above
    }
    return review;
  }

  async getStrategyReviews(strategyId: string): Promise<StrategyReview[]> {
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(strategyReviewsTable)
          .where(eq(strategyReviewsTable.strategyId, strategyId))
          .orderBy(desc(strategyReviewsTable.createdAt));
        return rows.map((r) => this.mapDbReview(r));
      }
    } catch {
      // fall through to in-memory
    }
    return this.strategyReviews
      .filter((r) => r.strategyId === strategyId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async recordOrderAudit(data: InsertOrderAudit): Promise<OrderAudit> {
    const audit: OrderAudit = {
      id: randomUUID(),
      connector: data.connector,
      symbol: data.symbol,
      side: data.side,
      quantity: data.quantity ?? null,
      price: data.price ?? null,
      orderType: data.orderType ?? null,
      status: data.status,
      detail: data.detail ?? null,
      requestBody: data.requestBody ?? null,
      at: new Date(),
    };
    this.orderAudits.push(audit);
    try {
      const db = await getDb();
      if (db) {
        const [row] = await db.insert(orderAuditTable).values({
          id: audit.id,
          connector: audit.connector,
          symbol: audit.symbol,
          side: audit.side,
          quantity: audit.quantity,
          price: audit.price,
          orderType: audit.orderType,
          status: audit.status,
          detail: audit.detail,
          requestBody: audit.requestBody,
          at: audit.at,
        }).returning();
        if (row) return row;
      }
    } catch {
      // in-memory copy already pushed above
    }
    return audit;
  }

  async getOrderAudits(limit = 100): Promise<OrderAudit[]> {
    try {
      const db = await getDb();
      if (db) {
        return await db.select().from(orderAuditTable)
          .orderBy(desc(orderAuditTable.at))
          .limit(limit);
      }
    } catch {
      // fall through to in-memory
    }
    return [...this.orderAudits]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, limit);
  }

  private mapDbReview(row: typeof strategyReviewsTable.$inferSelect): StrategyReview {
    return {
      id: row.id,
      strategyId: row.strategyId,
      periodLabel: row.periodLabel,
      surprised: row.surprised,
      resultsInLineWithExpectations: row.resultsInLineWithExpectations,
      fillsComparable: row.fillsComparable,
      reasonToStop: row.reasonToStop,
      reasonToChangeSizing: row.reasonToChangeSizing,
      note: row.note ?? undefined,
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    };
  }

  async updateStrategy(id: string, data: Partial<InsertStrategy>): Promise<Strategy> {
    // Gate transition fields are managed exclusively by recordGate;
    // goals, sizing plan, quit rule, and the expected-performance baseline
    // are locked via their dedicated setters only
    const {
      stage: _s, gateStatus: _gs, gateHistory: _gh, goals: _g,
      positionSizingPlan: _p, quitRule: _q, expectedPerformance: _e,
      ...safeData
    } = data as any;
    try {
      const db = await getDb();
      if (db) {
        const [existing] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, id));
        if (!existing) throw new Error("Strategy not found");
        const current = this.mapDbStrategy(existing);
        const updated: Strategy = { ...current, ...safeData };
        const [row] = await db
          .update(strategiesTable)
          .set(this.strategyToDbValues(updated))
          .where(eq(strategiesTable.id, id))
          .returning();
        return row ? this.mapDbStrategy(row) : updated;
      }
    } catch (err) {
      if ((err as Error).message === "Strategy not found") throw err;
      // DB connection error — fall through to Map
    }
    const existing = this.strategies.get(id);
    if (!existing) throw new Error("Strategy not found");
    const updated: Strategy = { ...existing, ...safeData };
    this.strategies.set(id, updated);
    return updated;
  }

  /**
   * Phase 8 pre-live checklist (Davey Ch 20/24). Enforced on ANY path that
   * would advance a strategy into the live stage — the manual gate endpoint
   * and gate auto-advance both funnel through recordGate.
   */
  private async assertLiveChecklist(s: Strategy): Promise<void> {
    if (!s.positionSizingPlan) {
      throw new Error("Cannot go live: lock a position sizing plan first");
    }
    if (!s.quitRule) {
      throw new Error("Cannot go live: lock a quit rule first");
    }
    if (!isAuthEnabled()) {
      throw new Error("Cannot go live: enable authentication first (AUTH_ENABLED=true)");
    }
    const results = await this.getGateResults(s.id);
    const latest = (gate: string) => results.find((r) => r.gate === gate);

    const incubation = latest("incubation");
    if (
      incubation?.verdict !== "pass" ||
      !["live", "paper"].includes(incubation.dataSource ?? "")
    ) {
      throw new Error(
        "Cannot go live: latest incubation gate result must be a pass on live or paper forward data"
      );
    }
    const diversification = latest("diversification");
    if (diversification?.verdict !== "pass" || diversification.dataSource !== "live_engine") {
      throw new Error(
        "Cannot go live: latest diversification gate result must be a live_engine pass"
      );
    }
  }

  async recordGate(
    id: string,
    params: { result: "passed" | "failed" | "discarded"; note?: string }
  ): Promise<Strategy> {
    // Run the full pre-live checklist before any transition into live.
    if (params.result === "passed") {
      const current = await this.getStrategyById(id);
      if (!current) throw new Error("Strategy not found");
      if (nextStage(current.stage) === "live") {
        await this.assertLiveChecklist(current);
      }
    }

    const applyTransition = (s: Strategy): Strategy => {
      const entry: GateHistoryEntry = { stage: s.stage, result: params.result, note: params.note, at: new Date() };
      const gateHistory = [...s.gateHistory, entry];
      let stage = s.stage;
      let gateStatus = s.gateStatus;
      if (params.result === "passed") {
        const next = nextStage(s.stage);
        // Davey Ch 20/24: going live requires the pre-declared artifacts.
        if (next === "live") {
          if (!s.positionSizingPlan) {
            throw new Error("Cannot go live: lock a position sizing plan first");
          }
          if (!s.quitRule) {
            throw new Error("Cannot go live: lock a quit rule first");
          }
        }
        if (next !== null) { stage = next; gateStatus = "in_progress"; }
        else { gateStatus = "passed"; }
      } else if (params.result === "failed") {
        gateStatus = "failed";
      } else if (params.result === "discarded") {
        gateStatus = "discarded";
      }
      return { ...s, stage, gateStatus, gateHistory };
    };
    try {
      const db = await getDb();
      if (db) {
        const [existing] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, id));
        if (!existing) throw new Error("Strategy not found");
        const updated = applyTransition(this.mapDbStrategy(existing));
        const [row] = await db
          .update(strategiesTable)
          .set(this.strategyToDbValues(updated))
          .where(eq(strategiesTable.id, id))
          .returning();
        return row ? this.mapDbStrategy(row) : updated;
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "Strategy not found" || msg.startsWith("Cannot go live:")) throw err;
      // DB connection error — fall through to Map
    }
    const existing = this.strategies.get(id);
    if (!existing) throw new Error("Strategy not found");
    const updated = applyTransition(existing);
    this.strategies.set(id, updated);
    return updated;
  }

  async deleteStrategy(id: string): Promise<void> {
    try {
      const db = await getDb();
      if (db) {
        const [existing] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, id));
        if (!existing) throw new Error("Strategy not found");
        await db.delete(strategiesTable).where(eq(strategiesTable.id, id));
        return;
      }
    } catch (err) {
      if ((err as Error).message === "Strategy not found") throw err;
      // DB connection error — fall through to Map
    }
    if (!this.strategies.has(id)) throw new Error("Strategy not found");
    this.strategies.delete(id);
  }

  async getMarketData(): Promise<MarketData[]> {
    return Array.from(this.marketData.values());
  }

  async getTrades(): Promise<Trade[]> {
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(tradesTable).orderBy(tradesTable.timestamp);
        return rows.map((r) => this.mapDbTrade(r));
      }
    } catch {
      // DB unavailable — fall through to Map
    }
    return Array.from(this.trades.values());
  }

  async getTradesByStrategy(strategyId: string): Promise<Trade[]> {
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(tradesTable)
          .where(eq(tradesTable.strategyId, strategyId))
          .orderBy(tradesTable.timestamp);
        return rows.map((r) => this.mapDbTrade(r));
      }
    } catch {
      // DB unavailable — fall through to Map
    }
    return Array.from(this.trades.values()).filter(
      (trade) => trade.strategyId === strategyId
    );
  }

  async createTrade(data: InsertTrade): Promise<Trade> {
    const id = randomUUID();

    // FIFO cost basis must consider all prior trades for the symbol,
    // from the DB when available so P&L survives restarts.
    const allTrades = await this.getTrades();
    const existingTrades = allTrades
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
    try {
      const db = await getDb();
      if (db) {
        const [row] = await db.insert(tradesTable).values({
          id: trade.id,
          symbol: trade.symbol,
          type: trade.type,
          quantity: trade.quantity,
          price: trade.price,
          pnl: trade.pnl,
          timestamp: trade.timestamp,
          strategyId: trade.strategyId,
        }).returning();
        if (row) return this.mapDbTrade(row);
      }
    } catch {
      // in-memory copy already set above
    }
    return trade;
  }

  async getBacktestResults(): Promise<BacktestResult[]> {
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(backtestResultsTable)
          .orderBy(desc(backtestResultsTable.createdAt));
        return rows.map((r) => this.mapDbBacktest(r));
      }
    } catch {
      // DB unavailable — fall through to Map
    }
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
    try {
      const db = await getDb();
      if (db) {
        const [row] = await db.insert(backtestResultsTable)
          .values(this.backtestToDbValues(backtest))
          .returning();
        if (row) return this.mapDbBacktest(row);
      }
    } catch {
      // in-memory copy already set above
    }
    return backtest;
  }

  async updateBacktest(id: string, data: Partial<InsertBacktest>): Promise<BacktestResult> {
    try {
      const db = await getDb();
      if (db) {
        const [existing] = await db.select().from(backtestResultsTable)
          .where(eq(backtestResultsTable.id, id));
        if (!existing) throw new Error("Backtest not found");
        const updated: BacktestResult = { ...this.mapDbBacktest(existing), ...data };
        const [row] = await db.update(backtestResultsTable)
          .set(this.backtestToDbValues(updated))
          .where(eq(backtestResultsTable.id, id))
          .returning();
        return row ? this.mapDbBacktest(row) : updated;
      }
    } catch (err) {
      if ((err as Error).message === "Backtest not found") throw err;
      // DB connection error — fall through to Map
    }
    const existing = this.backtestResults.get(id);
    if (!existing) {
      throw new Error("Backtest not found");
    }
    const updated: BacktestResult = { ...existing, ...data };
    this.backtestResults.set(id, updated);
    return updated;
  }

  async getPortfolioMetrics(): Promise<PortfolioMetrics> {
    const trades = await this.getTrades();

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
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(chatMessagesTable)
          .orderBy(chatMessagesTable.timestamp);
        return rows.map((r) => this.mapDbChatMessage(r));
      }
    } catch {
      // DB unavailable — fall through to memory
    }
    return this.chatMessages;
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: randomUUID(),
      ...data,
      timestamp: new Date(),
    };
    this.chatMessages.push(message);
    try {
      const db = await getDb();
      if (db) {
        const [row] = await db.insert(chatMessagesTable).values({
          id: message.id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          context: message.context ?? null,
          provider: message.provider ?? null,
          model: message.model ?? null,
        }).returning();
        if (row) return this.mapDbChatMessage(row);
      }
    } catch {
      // in-memory copy already pushed above
    }
    return message;
  }

  async clearChatHistory(): Promise<void> {
    this.chatMessages = [];
    try {
      const db = await getDb();
      if (db) {
        await db.delete(chatMessagesTable);
      }
    } catch {
      // in-memory copy already cleared above
    }
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
    // A missing memory copy is not an error while a database exists —
    // after a restart the project lives only in Postgres.
    const existing = this.leanProjects.get(name);
    const updatedMem: LeanProject | undefined = existing
      ? { ...existing, code, updatedAt: new Date() }
      : undefined;
    if (updatedMem) this.leanProjects.set(name, updatedMem);
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
      // fall through to in-memory result
    }
    if (!updatedMem) throw new Error("Project not found");
    return updatedMem;
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
    const inMemory = this.leanProjects.delete(name);
    let inDb = false;
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.delete(leanProjectsTable)
          .where(eq(leanProjectsTable.name, name))
          .returning();
        inDb = rows.length > 0;
      }
    } catch {
      // in-memory deletion already attempted above
    }
    if (!inMemory && !inDb) throw new Error("Project not found");
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
        // The id MUST match the in-memory copy — a db-generated uuid here
        // orphans the memory record and breaks later updates by id.
        const rows = await db.insert(leanBacktestsTable).values({
          id: backtest.id,
          projectId: data.projectId,
          status: data.status,
          totalReturn: data.totalReturn,
          sharpeRatio: data.sharpeRatio,
          maxDrawdown: data.maxDrawdown,
          winRate: data.winRate,
          totalTrades: data.totalTrades,
          equityCurve: data.equityCurve,
          trades: data.trades ?? [],
          rawResults: data.rawResults,
          errorLog: data.errorLog ?? null,
          dataSource: data.dataSource ?? "simulated",
        }).returning();
        return this.mapDbLeanBacktest(rows[0]);
      }
    } catch {
      // in-memory copy already set above
    }
    return backtest;
  }

  async updateLeanBacktest(id: string, data: Partial<InsertLeanBacktest>): Promise<LeanBacktest> {
    // Update memory when present, but a missing memory copy is not an
    // error while a database exists — try the db before giving up.
    const existing = this.leanBacktests.get(id);
    const updatedMem: LeanBacktest | undefined = existing
      ? { ...existing, ...data }
      : undefined;
    if (updatedMem) this.leanBacktests.set(id, updatedMem);
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
      // fall through to in-memory result
    }
    if (!updatedMem) throw new Error("Backtest not found");
    return updatedMem;
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

  async getLeanBacktestById(id: string): Promise<LeanBacktest | null> {
    try {
      const db = await getDb();
      if (db) {
        const [row] = await db.select().from(leanBacktestsTable)
          .where(eq(leanBacktestsTable.id, id));
        return row ? this.mapDbLeanBacktest(row) : null;
      }
    } catch {
      // fall through to in-memory
    }
    return this.leanBacktests.get(id) ?? null;
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
      trades: (row.trades as LeanBacktest["trades"]) ?? [],
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
    byType: { generation: number; refinement: number; optimization: number; backtest: number };
  }> {
    const byType = { generation: 0, refinement: 0, optimization: 0, backtest: 0 };
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
      else if (r.trialType === "backtest") byType.backtest++;
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

  async startIncubation(strategyId: string, requiredDays: number, startedAt?: Date): Promise<Strategy> {
    // Backdating is allowed (aligning the window to a real approval date),
    // but never a future start — that would fabricate elapsed time.
    const start = startedAt && startedAt.getTime() <= Date.now() ? startedAt : new Date();
    try {
      const db = await getDb();
      if (db) {
        const [existing] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, strategyId));
        if (!existing) throw new Error("Strategy not found");
        const current = this.mapDbStrategy(existing);
        const updated: Strategy = { ...current, incubationStartedAt: start, requiredDays, incubationObservations: [] };
        const [row] = await db.update(strategiesTable)
          .set(this.strategyToDbValues(updated))
          .where(eq(strategiesTable.id, strategyId))
          .returning();
        return row ? this.mapDbStrategy(row) : updated;
      }
    } catch (err) {
      if ((err as Error).message === "Strategy not found") throw err;
    }
    const existing = this.strategies.get(strategyId);
    if (!existing) throw new Error("Strategy not found");
    const updated: Strategy = { ...existing, incubationStartedAt: start, requiredDays, incubationObservations: [] };
    this.strategies.set(strategyId, updated);
    return updated;
  }

  async addIncubationObservation(strategyId: string, obs: IncubationObservation): Promise<Strategy> {
    try {
      const db = await getDb();
      if (db) {
        const [existing] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, strategyId));
        if (!existing) throw new Error("Strategy not found");
        const current = this.mapDbStrategy(existing);
        const updated: Strategy = {
          ...current,
          incubationObservations: [...(current.incubationObservations ?? []), obs],
        };
        const [row] = await db.update(strategiesTable)
          .set(this.strategyToDbValues(updated))
          .where(eq(strategiesTable.id, strategyId))
          .returning();
        return row ? this.mapDbStrategy(row) : updated;
      }
    } catch (err) {
      if ((err as Error).message === "Strategy not found") throw err;
    }
    const existing = this.strategies.get(strategyId);
    if (!existing) throw new Error("Strategy not found");
    const updated: Strategy = { ...existing, incubationObservations: [...(existing.incubationObservations ?? []), obs] };
    this.strategies.set(strategyId, updated);
    return updated;
  }

  // ─── Walk-Forward Config ─────────────────────────────────────

  async updateWalkForwardConfig(strategyId: string, config: WalkForwardConfig): Promise<Strategy> {
    const buildUpdate = (existing: Strategy): Strategy => {
      // Davey Ch 13: testing multiple in/out combinations and keeping the
      // best one is optimization. The config locks on first set.
      if (existing.walkForwardConfig?.lockedAt) {
        throw new Error("Walk-forward config already locked");
      }
      const entry: GateHistoryEntry = {
        stage: existing.stage,
        result: "passed",
        note: `Walk-forward config updated: ${config.numWindows} windows, IS=${config.inSampleDays}d / OOS=${config.outOfSampleDays}d, anchored=${config.anchored}`,
        at: new Date(),
      };
      return {
        ...existing,
        walkForwardConfig: { ...config, lockedAt: new Date() },
        gateHistory: [...existing.gateHistory, entry],
      };
    };
    try {
      const db = await getDb();
      if (db) {
        const [existing] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, strategyId));
        if (!existing) throw new Error("Strategy not found");
        const updated = buildUpdate(this.mapDbStrategy(existing));
        const [row] = await db.update(strategiesTable)
          .set(this.strategyToDbValues(updated))
          .where(eq(strategiesTable.id, strategyId))
          .returning();
        return row ? this.mapDbStrategy(row) : updated;
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "Strategy not found" || msg === "Walk-forward config already locked") throw err;
    }
    const existing = this.strategies.get(strategyId);
    if (!existing) throw new Error("Strategy not found");
    const updated = buildUpdate(existing);
    this.strategies.set(strategyId, updated);
    return updated;
  }

  // ─── Walk-Forward Runs ───────────────────────────────────────

  async createWalkForwardRun(data: InsertWalkForwardRun): Promise<WalkForwardRun> {
    const run: WalkForwardRun = {
      ...data,
      id: randomUUID(),
      startedAt: new Date(),
    };
    this.wfRuns.set(run.id, run);
    try {
      const db = await getDb();
      if (db) {
        const [row] = await db.insert(walkForwardRunsTable).values({
          id: run.id,
          strategyId: run.strategyId,
          projectName: run.projectName,
          status: run.status,
          config: this.wfConfigToJson(run.config),
          windows: run.windows as any,
          stitchedCurve: run.stitchedCurve as any,
          wfe: run.wfe ?? null,
          pbo: run.pbo ?? null,
          verdict: run.verdict ?? null,
          reason: run.reason ?? null,
          errorLog: run.errorLog ?? null,
          startedAt: run.startedAt,
          completedAt: run.completedAt ?? null,
        }).returning();
        if (row) return this.mapDbWfRun(row);
      }
    } catch {
      // in-memory copy already set above
    }
    return run;
  }

  async updateWalkForwardRun(id: string, data: Partial<InsertWalkForwardRun>): Promise<WalkForwardRun> {
    const existing = this.wfRuns.get(id);
    const updatedMem: WalkForwardRun | undefined = existing
      ? { ...existing, ...data, config: data.config ?? existing.config }
      : undefined;
    if (updatedMem) this.wfRuns.set(id, updatedMem);
    try {
      const db = await getDb();
      if (db) {
        const values: Record<string, unknown> = {};
        if (data.status !== undefined) values.status = data.status;
        if (data.windows !== undefined) values.windows = data.windows;
        if (data.stitchedCurve !== undefined) values.stitchedCurve = data.stitchedCurve;
        if (data.wfe !== undefined) values.wfe = data.wfe;
        if (data.pbo !== undefined) values.pbo = data.pbo;
        if (data.verdict !== undefined) values.verdict = data.verdict;
        if (data.reason !== undefined) values.reason = data.reason;
        if (data.errorLog !== undefined) values.errorLog = data.errorLog;
        if (data.completedAt !== undefined) values.completedAt = data.completedAt;
        const [row] = await db.update(walkForwardRunsTable)
          .set(values as any)
          .where(eq(walkForwardRunsTable.id, id))
          .returning();
        if (row) return this.mapDbWfRun(row);
      }
    } catch {
      // in-memory copy already updated above
    }
    if (!updatedMem) throw new Error("Walk-forward run not found");
    return updatedMem;
  }

  async getWalkForwardRuns(strategyId: string): Promise<WalkForwardRun[]> {
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(walkForwardRunsTable)
          .where(eq(walkForwardRunsTable.strategyId, strategyId))
          .orderBy(desc(walkForwardRunsTable.startedAt));
        return rows.map((r) => this.mapDbWfRun(r));
      }
    } catch {
      // fall through to in-memory
    }
    return Array.from(this.wfRuns.values())
      .filter((r) => r.strategyId === strategyId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  private wfConfigToJson(config: WalkForwardConfig) {
    return {
      ...config,
      lockedAt: config.lockedAt instanceof Date ? config.lockedAt.toISOString() : config.lockedAt,
    } as any;
  }

  private mapDbWfRun(row: typeof walkForwardRunsTable.$inferSelect): WalkForwardRun {
    const cfg = row.config as any;
    return {
      id: row.id,
      strategyId: row.strategyId,
      projectName: row.projectName,
      status: row.status as WalkForwardRun["status"],
      config: {
        ...cfg,
        lockedAt: cfg?.lockedAt ? new Date(cfg.lockedAt) : undefined,
      },
      windows: (row.windows as any) ?? [],
      stitchedCurve: (row.stitchedCurve as any) ?? [],
      wfe: row.wfe ?? null,
      pbo: row.pbo ?? null,
      verdict: (row.verdict as WalkForwardRun["verdict"]) ?? null,
      reason: row.reason ?? null,
      errorLog: row.errorLog ?? null,
      startedAt: row.startedAt instanceof Date ? row.startedAt : new Date(row.startedAt),
      completedAt: row.completedAt
        ? row.completedAt instanceof Date ? row.completedAt : new Date(row.completedAt)
        : null,
    };
  }

  // ─── DB helpers ──────────────────────────────────────────────

  private strategyToDbValues(s: Strategy) {
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      type: s.type,
      status: s.status,
      performance: s.performance,
      sharpeRatio: s.sharpeRatio,
      maxDrawdown: s.maxDrawdown,
      winRate: s.winRate,
      totalTrades: s.totalTrades,
      stage: s.stage,
      gateStatus: s.gateStatus,
      gateHistory: (s.gateHistory ?? []).map((e) => ({
        stage: e.stage,
        result: e.result,
        note: e.note,
        at: e.at instanceof Date ? e.at.toISOString() : e.at,
      })) as any,
      refinementHistory: (s.refinementHistory ?? []).map((e) => ({
        refinementType: e.refinementType,
        rationale: e.rationale,
        at: e.at instanceof Date ? e.at.toISOString() : e.at,
      })) as any,
      incubationObservations: (s.incubationObservations ?? []) as any,
      edge: s.edge ?? null,
      edgeAssessment: s.edgeAssessment ?? null,
      leanProjectName: s.leanProjectName ?? null,
      goals: s.goals
        ? ({
            ...s.goals,
            lockedAt: s.goals.lockedAt instanceof Date
              ? s.goals.lockedAt.toISOString()
              : s.goals.lockedAt,
          } as any)
        : null,
      positionSizingPlan: s.positionSizingPlan
        ? ({
            ...s.positionSizingPlan,
            lockedAt: s.positionSizingPlan.lockedAt instanceof Date
              ? s.positionSizingPlan.lockedAt.toISOString()
              : s.positionSizingPlan.lockedAt,
          } as any)
        : null,
      expectedPerformance: s.expectedPerformance
        ? ({
            ...s.expectedPerformance,
            snappedAt: s.expectedPerformance.snappedAt instanceof Date
              ? s.expectedPerformance.snappedAt.toISOString()
              : s.expectedPerformance.snappedAt,
          } as any)
        : null,
      quitRule: s.quitRule
        ? ({
            ...s.quitRule,
            lockedAt: s.quitRule.lockedAt instanceof Date
              ? s.quitRule.lockedAt.toISOString()
              : s.quitRule.lockedAt,
          } as any)
        : null,
      walkForwardConfig: s.walkForwardConfig
        ? ({
            ...s.walkForwardConfig,
            lockedAt: s.walkForwardConfig.lockedAt instanceof Date
              ? s.walkForwardConfig.lockedAt.toISOString()
              : s.walkForwardConfig.lockedAt,
          } as any)
        : null,
      incubationStartedAt: s.incubationStartedAt ?? null,
      requiredDays: s.requiredDays ?? null,
    };
  }

  private mapDbStrategy(row: typeof strategiesTable.$inferSelect): Strategy {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type as Strategy["type"],
      status: row.status as Strategy["status"],
      performance: row.performance,
      sharpeRatio: row.sharpeRatio,
      maxDrawdown: row.maxDrawdown,
      winRate: row.winRate,
      totalTrades: row.totalTrades,
      stage: row.stage as Strategy["stage"],
      gateStatus: row.gateStatus as Strategy["gateStatus"],
      gateHistory: ((row.gateHistory as any[]) ?? []).map((e: any) => ({
        stage: e.stage,
        result: e.result,
        note: e.note,
        at: new Date(e.at),
      })),
      refinementHistory: ((row.refinementHistory as any[]) ?? []).map((e: any) => ({
        refinementType: e.refinementType,
        rationale: e.rationale,
        at: new Date(e.at),
      })),
      incubationObservations: ((row.incubationObservations as any[]) ?? []) as IncubationObservation[],
      edge: row.edge ?? undefined,
      edgeAssessment: (row.edgeAssessment as Strategy["edgeAssessment"]) ?? undefined,
      leanProjectName: row.leanProjectName ?? undefined,
      goals: row.goals
        ? ({
            ...(row.goals as any),
            lockedAt: new Date((row.goals as any).lockedAt),
          } as StrategyGoals)
        : undefined,
      positionSizingPlan: row.positionSizingPlan
        ? ({
            ...(row.positionSizingPlan as any),
            lockedAt: new Date((row.positionSizingPlan as any).lockedAt),
          } as PositionSizingPlan)
        : undefined,
      expectedPerformance: row.expectedPerformance
        ? ({
            ...(row.expectedPerformance as any),
            snappedAt: new Date((row.expectedPerformance as any).snappedAt),
          } as ExpectedPerformance)
        : undefined,
      quitRule: row.quitRule
        ? ({
            ...(row.quitRule as any),
            lockedAt: new Date((row.quitRule as any).lockedAt),
          } as QuitRule)
        : undefined,
      walkForwardConfig: row.walkForwardConfig
        ? ({
            ...(row.walkForwardConfig as any),
            lockedAt: (row.walkForwardConfig as any).lockedAt
              ? new Date((row.walkForwardConfig as any).lockedAt)
              : undefined,
          } as WalkForwardConfig)
        : undefined,
      incubationStartedAt: row.incubationStartedAt ? new Date(row.incubationStartedAt) : undefined,
      requiredDays: row.requiredDays ?? undefined,
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    };
  }

  private mapDbTrade(row: typeof tradesTable.$inferSelect): Trade {
    return {
      id: row.id,
      symbol: row.symbol,
      type: row.type as Trade["type"],
      quantity: row.quantity,
      price: row.price,
      pnl: row.pnl,
      timestamp: row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp),
      strategyId: row.strategyId,
    };
  }

  private backtestToDbValues(b: BacktestResult) {
    return {
      id: b.id,
      strategyName: b.strategyName,
      strategyDescription: b.strategyDescription,
      startDate: b.startDate,
      endDate: b.endDate,
      totalReturn: b.totalReturn,
      sharpeRatio: b.sharpeRatio,
      maxDrawdown: b.maxDrawdown,
      winRate: b.winRate,
      totalTrades: b.totalTrades,
      status: b.status,
      dataSource: b.dataSource,
      createdAt: b.createdAt,
    };
  }

  private mapDbBacktest(row: typeof backtestResultsTable.$inferSelect): BacktestResult {
    return {
      id: row.id,
      strategyName: row.strategyName,
      strategyDescription: row.strategyDescription,
      startDate: row.startDate instanceof Date ? row.startDate : new Date(row.startDate),
      endDate: row.endDate instanceof Date ? row.endDate : new Date(row.endDate),
      totalReturn: row.totalReturn,
      sharpeRatio: row.sharpeRatio,
      maxDrawdown: row.maxDrawdown,
      winRate: row.winRate,
      totalTrades: row.totalTrades,
      status: row.status as BacktestResult["status"],
      dataSource: (row.dataSource as BacktestResult["dataSource"]) ?? "simulated",
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    };
  }

  private mapDbChatMessage(row: typeof chatMessagesTable.$inferSelect): ChatMessage {
    return {
      id: row.id,
      role: row.role as ChatMessage["role"],
      content: row.content,
      timestamp: row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp),
      context: row.context ?? undefined,
      provider: (row.provider as ChatMessage["provider"]) ?? undefined,
      model: (row.model as ChatMessage["model"]) ?? undefined,
    };
  }

  private async seedDbIfNeeded(): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      // Each table seeds independently and idempotently (count-guarded)
      const [{ cnt: tradeCnt }] = await db.select({ cnt: count() }).from(tradesTable);
      if (tradeCnt === 0) {
        for (const t of Array.from(this.trades.values())) {
          await db.insert(tradesTable).values({
            id: t.id,
            symbol: t.symbol,
            type: t.type,
            quantity: t.quantity,
            price: t.price,
            pnl: t.pnl,
            timestamp: t.timestamp,
            strategyId: t.strategyId,
          });
        }
      }

      const [{ cnt: btCnt }] = await db.select({ cnt: count() }).from(backtestResultsTable);
      if (btCnt === 0) {
        for (const b of Array.from(this.backtestResults.values())) {
          await db.insert(backtestResultsTable).values(this.backtestToDbValues(b));
        }
      }

      const [{ cnt }] = await db.select({ cnt: count() }).from(strategiesTable);
      if (cnt > 0) return;
      const seeds: Strategy[] = [
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
      for (const s of seeds) {
        await db.insert(strategiesTable).values(this.strategyToDbValues(s));
      }
    } catch {
      // DB seeding failed; Map is already seeded as fallback
    }
  }
}

export const storage = new MemStorage();
