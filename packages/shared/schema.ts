import { z } from "zod";
import { pgTable, text, boolean, integer, varchar, timestamp, jsonb, real, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const settingsTable = pgTable("settings", {
  id: varchar("id", { length: 50 }).primaryKey().default("default"),
  refreshInterval: text("refresh_interval").notNull().default("30s"),
  darkMode: boolean("dark_mode").notNull().default(true),
  notifications: boolean("notifications").notNull().default(false),
  autoRefresh: boolean("auto_refresh").notNull().default(true),
  defaultPositionSize: integer("default_position_size").notNull().default(1000),
  riskLimit: integer("risk_limit").notNull().default(2),
  maxPositions: integer("max_positions").notNull().default(10),
  autoStopLoss: boolean("auto_stop_loss").notNull().default(false),
  exchange: text("exchange"),
  tradeAlerts: boolean("trade_alerts").notNull().default(true),
  performanceAlerts: boolean("performance_alerts").notNull().default(false),
  systemAlerts: boolean("system_alerts").notNull().default(true),
  email: text("email"),
});

export const insertSettingsDbSchema = createInsertSchema(settingsTable).omit({ id: true });
export type SettingsDb = typeof settingsTable.$inferSelect;
export type InsertSettingsDb = z.infer<typeof insertSettingsDbSchema>;

export const PIPELINE_STAGES = [
  "idea",
  "feasibility",
  "walk_forward",
  "monte_carlo",
  "incubation",
  "diversification_sizing",
  "live",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export const pipelineStageSchema = z.enum(PIPELINE_STAGES);

export function nextStage(stage: PipelineStage): PipelineStage | null {
  const idx = PIPELINE_STAGES.indexOf(stage);
  if (idx === -1 || idx === PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[idx + 1];
}

export const gateStatusSchema = z.enum([
  "in_progress",
  "passed",
  "failed",
  "discarded",
]);
export type GateStatus = z.infer<typeof gateStatusSchema>;

export const gateHistoryEntrySchema = z.object({
  stage: pipelineStageSchema,
  result: z.enum(["passed", "failed", "discarded"]),
  note: z.string().optional(),
  at: z.date(),
});
export type GateHistoryEntry = z.infer<typeof gateHistoryEntrySchema>;

export const incubationObservationSchema = z.object({
  date: z.string(),
  observedReturn: z.number(),
  observedDrawdown: z.number(),
  note: z.string().optional(),
  source: z.enum(["paper", "live", "manual"]).default("manual"),
});
export type IncubationObservation = z.infer<typeof incubationObservationSchema>;

// Davey Ch 13: every walk-forward input — windows, fitness function, and the
// parameter grid — must be chosen BEFORE the analysis. Choosing them after
// seeing results is optimization, so the whole config locks as one unit.
export const fitnessFunctionSchema = z.enum([
  "net_profit",
  "return_on_account",
  "equity_linearity",
]);
export type FitnessFunction = z.infer<typeof fitnessFunctionSchema>;

export const wfParameterSchema = z.object({
  name: z.string().min(1),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
});
export type WfParameter = z.infer<typeof wfParameterSchema>;

export const walkForwardConfigSchema = z.object({
  inSampleDays: z.number().int().positive(),
  outOfSampleDays: z.number().int().positive(),
  anchored: z.boolean(),
  numWindows: z.number().int().positive(),
  /** ISO date (YYYY-MM-DD) the first in-sample window starts at */
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fitnessFunction: fitnessFunctionSchema.default("net_profit"),
  parameters: z.array(wfParameterSchema).default([]),
  lockedAt: z.date().optional(),
});
export type WalkForwardConfig = z.infer<typeof walkForwardConfigSchema>;

export const wfWindowResultSchema = z.object({
  index: z.number(),
  isStart: z.string(),
  isEnd: z.string(),
  oosStart: z.string(),
  oosEnd: z.string(),
  bestParams: z.record(z.number()),
  /** fitness of every combo over this window's IS period (PBO matrix column) */
  comboFitness: z.array(z.number()),
  isMetrics: z.object({
    totalReturn: z.number(),
    maxDrawdown: z.number(),
    sharpeRatio: z.number(),
    totalTrades: z.number(),
  }),
  oosMetrics: z.object({
    totalReturn: z.number(),
    maxDrawdown: z.number(),
    sharpeRatio: z.number(),
    totalTrades: z.number(),
  }),
});
export type WfWindowResult = z.infer<typeof wfWindowResultSchema>;

export const walkForwardRunSchema = z.object({
  id: z.string(),
  strategyId: z.string(),
  projectName: z.string(),
  status: z.enum(["running", "completed", "failed"]),
  config: walkForwardConfigSchema,
  windows: z.array(wfWindowResultSchema).default([]),
  stitchedCurve: z.array(z.object({ date: z.string(), value: z.number() })).default([]),
  wfe: z.number().nullable().optional(),
  pbo: z.number().nullable().optional(),
  verdict: z.enum(["pass", "fail", "cannot_evaluate"]).nullable().optional(),
  reason: z.string().nullable().optional(),
  errorLog: z.string().nullable().optional(),
  startedAt: z.date(),
  completedAt: z.date().nullable().optional(),
});
export type WalkForwardRun = z.infer<typeof walkForwardRunSchema>;

export const insertWalkForwardRunSchema = walkForwardRunSchema.omit({
  id: true,
  startedAt: true,
});
export type InsertWalkForwardRun = z.infer<typeof insertWalkForwardRunSchema>;

export const walkForwardRunsTable = pgTable("walk_forward_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  strategyId: text("strategy_id").notNull(),
  projectName: text("project_name").notNull(),
  status: text("status").notNull(),
  config: jsonb("config").notNull(),
  windows: jsonb("windows").notNull().default([]),
  stitchedCurve: jsonb("stitched_curve").notNull().default([]),
  wfe: real("wfe"),
  pbo: real("pbo"),
  verdict: text("verdict"),
  reason: text("reason"),
  errorLog: text("error_log"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const refinementLogEntrySchema = z.object({
  refinementType: z.enum(["logic_fix", "optimization"]),
  rationale: z.string(),
  at: z.date(),
});
export type RefinementLogEntry = z.infer<typeof refinementLogEntrySchema>;

// Davey Ch 9: goals are declared BEFORE testing and locked — changing them
// after seeing results is optimization. All gates compare against these.
export const strategyGoalsSchema = z.object({
  /** Minimum acceptable annual return / max drawdown ratio (Davey: 2.0) */
  minRetDDRatio: z.number().positive(),
  /** Maximum acceptable drawdown, percent (e.g. 25 = 25%) */
  maxDrawdownPct: z.number().positive(),
  /** Maximum acceptable risk of ruin, fraction 0–1 (Davey: 0.10) */
  maxRiskOfRuin: z.number().min(0).max(1),
  /** Minimum acceptable annualized return, percent */
  minAnnualReturnPct: z.number(),
  /** Minimum trades per year for the strategy to be worth running */
  minTradesPerYear: z.number().int().positive(),
  /** Set server-side when goals are locked; immutable afterwards */
  lockedAt: z.date(),
});
export type StrategyGoals = z.infer<typeof strategyGoalsSchema>;

export const setGoalsBodySchema = strategyGoalsSchema.omit({ lockedAt: true });
export type SetGoalsBody = z.infer<typeof setGoalsBodySchema>;

export const strategySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(["momentum", "mean_reversion", "trend_following", "arbitrage"]),
  status: z.enum(["active", "inactive", "paused"]),
  performance: z.number(),
  sharpeRatio: z.number(),
  maxDrawdown: z.number(),
  winRate: z.number(),
  totalTrades: z.number(),
  stage: pipelineStageSchema.default("idea"),
  gateStatus: gateStatusSchema.default("in_progress"),
  gateHistory: z.array(gateHistoryEntrySchema).default([]),
  edge: z.string().optional(),
  edgeAssessment: z.enum(["strong", "weak", "none"]).optional(),
  goals: strategyGoalsSchema.optional(),
  refinementHistory: z.array(refinementLogEntrySchema).default([]),
  walkForwardConfig: walkForwardConfigSchema.optional(),
  incubationStartedAt: z.date().optional(),
  requiredDays: z.number().optional(),
  incubationObservations: z.array(incubationObservationSchema).default([]),
  createdAt: z.date(),
});

export const marketDataSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number(),
  timestamp: z.date(),
});

export const priceDataSchema = z.object({
  timestamp: z.date(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

export const tradeSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  type: z.enum(["buy", "sell"]),
  quantity: z.number(),
  price: z.number(),
  pnl: z.number(),
  timestamp: z.date(),
  strategyId: z.string(),
});

export const backtestResultSchema = z.object({
  id: z.string(),
  strategyName: z.string(),
  strategyDescription: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  totalReturn: z.number(),
  sharpeRatio: z.number(),
  maxDrawdown: z.number(),
  winRate: z.number(),
  totalTrades: z.number(),
  status: z.enum(["completed", "running", "failed"]),
  dataSource: z.enum(["simulated", "live_engine"]).default("simulated"),
  createdAt: z.date(),
});

export const portfolioMetricsSchema = z.object({
  totalValue: z.number(),
  totalReturn: z.number(),
  totalReturnPercent: z.number(),
  sharpeRatio: z.number(),
  maxDrawdown: z.number(),
  winRate: z.number(),
  volatility: z.number(),
  beta: z.number(),
});

export const performanceDataSchema = z.object({
  date: z.date(),
  portfolioValue: z.number(),
  benchmarkValue: z.number(),
  drawdown: z.number(),
});

export const dateRangeSchema = z.object({
  start: z.date(),
  end: z.date(),
});

export const llmProviderSchema = z.enum(["openai", "anthropic", "gemini"]);
export type LLMProvider = z.infer<typeof llmProviderSchema>;

export const llmModelSchema = z.enum([
  "gpt-5",
  "claude-sonnet-4-5",
  "claude-opus-4-5",
  "claude-haiku-4-5",
  "gemini-pro",
]);
export type LLMModel = z.infer<typeof llmModelSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.date(),
  context: z.any().optional(),
  provider: llmProviderSchema.optional(),
  model: llmModelSchema.optional(),
});

export const insertChatMessageSchema = chatMessageSchema.omit({
  id: true,
  timestamp: true,
});

export const chatRequestSchema = z.object({
  message: z.string().min(1),
  provider: llmProviderSchema.optional().default("openai"),
  model: llmModelSchema.optional().default("gpt-5"),
  context: z.any().optional(),
  stream: z.boolean().optional().default(false),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const tradeSignalSchema = z.object({
  id: z.string(),
  action: z.enum(["buy", "sell", "hold"]),
  symbol: z.string(),
  confidence: z.number().min(0).max(100),
  entryPrice: z.number().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  reasoning: z.string().optional(),
  provider: llmProviderSchema,
  model: llmModelSchema,
  timestamp: z.date(),
});

export type TradeSignal = z.infer<typeof tradeSignalSchema>;

export const riskSettingsSchema = z.object({
  maxPositionSize: z.number().default(10000),
  maxPositionsPerSymbol: z.number().default(3),
  maxTotalPositions: z.number().default(10),
  maxPortfolioRisk: z.number().default(5),
  defaultStopLoss: z.number().default(5),
  defaultTakeProfit: z.number().default(15),
  maxDrawdown: z.number().default(20),
  dailyLossLimit: z.number().default(2),
  riskPerTrade: z.number().default(1),
  enforceRiskLimits: z.boolean().default(true),
});

export type RiskSettings = z.infer<typeof riskSettingsSchema>;

export const insertStrategySchema = strategySchema.omit({ 
  id: true, 
  createdAt: true 
});

export const strategiesTable = pgTable("strategies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  performance: real("performance").notNull().default(0),
  sharpeRatio: real("sharpe_ratio").notNull().default(0),
  maxDrawdown: real("max_drawdown").notNull().default(0),
  winRate: real("win_rate").notNull().default(0),
  totalTrades: integer("total_trades").notNull().default(0),
  stage: text("stage").notNull().default("idea"),
  gateStatus: text("gate_status").notNull().default("in_progress"),
  gateHistory: jsonb("gate_history").notNull().default([]),
  refinementHistory: jsonb("refinement_history").notNull().default([]),
  incubationObservations: jsonb("incubation_observations").notNull().default([]),
  edge: text("edge"),
  edgeAssessment: text("edge_assessment"),
  goals: jsonb("goals"),
  walkForwardConfig: jsonb("walk_forward_config"),
  incubationStartedAt: timestamp("incubation_started_at"),
  requiredDays: integer("required_days"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTradeSchema = tradeSchema.omit({
  id: true,
  pnl: true,
  timestamp: true
});

export const insertBacktestSchema = backtestResultSchema.omit({
  id: true,
  createdAt: true
});

export const tradesTable = pgTable("trades", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(),
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
  pnl: real("pnl").notNull().default(0),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  strategyId: text("strategy_id").notNull(),
});

export const backtestResultsTable = pgTable("backtest_results", {
  id: text("id").primaryKey(),
  strategyName: text("strategy_name").notNull(),
  strategyDescription: text("strategy_description").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalReturn: real("total_return").notNull().default(0),
  sharpeRatio: real("sharpe_ratio").notNull().default(0),
  maxDrawdown: real("max_drawdown").notNull().default(0),
  winRate: real("win_rate").notNull().default(0),
  totalTrades: integer("total_trades").notNull().default(0),
  status: text("status").notNull(),
  dataSource: text("data_source").notNull().default("simulated"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessagesTable = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  context: jsonb("context"),
  provider: text("provider"),
  model: text("model"),
});

export type Strategy = z.infer<typeof strategySchema>;
export type MarketData = z.infer<typeof marketDataSchema>;
export type PriceData = z.infer<typeof priceDataSchema>;
export type Trade = z.infer<typeof tradeSchema>;
export type BacktestResult = z.infer<typeof backtestResultSchema>;
export type PortfolioMetrics = z.infer<typeof portfolioMetricsSchema>;
export type PerformanceData = z.infer<typeof performanceDataSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;

export const exchangeSchema = z.enum(["binance", "coinbase", "kraken", "alpaca", "coingecko", "ibkr"]);
export type Exchange = z.infer<typeof exchangeSchema>;

export const settingsSchema = z.object({
  id: z.string().default("default"),
  refreshInterval: z.enum(["5s", "10s", "30s", "1m"]).default("30s"),
  darkMode: z.boolean().default(true),
  notifications: z.boolean().default(false),
  autoRefresh: z.boolean().default(true),
  defaultPositionSize: z.number().default(1000),
  riskLimit: z.number().default(2),
  maxPositions: z.number().default(10),
  autoStopLoss: z.boolean().default(false),
  exchange: exchangeSchema.optional().default("coingecko"),
  tradeAlerts: z.boolean().default(true),
  performanceAlerts: z.boolean().default(false),
  systemAlerts: z.boolean().default(true),
  email: z.string().email().optional().or(z.literal("")),
});

export const insertSettingsSchema = settingsSchema.omit({ id: true });

export type Settings = z.infer<typeof settingsSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type InsertBacktest = z.infer<typeof insertBacktestSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export const leanProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().optional(),
  generatedBy: z.string().optional(),
  lastBacktestId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertLeanProjectSchema = leanProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LeanProject = z.infer<typeof leanProjectSchema>;
export type InsertLeanProject = z.infer<typeof insertLeanProjectSchema>;

export const equityCurvePointSchema = z.object({
  date: z.string(),
  value: z.number(),
});

export const leanTradeSchema = z.object({
  entryTime: z.string(),
  exitTime: z.string(),
  entryPrice: z.number(),
  exitPrice: z.number(),
  quantity: z.number(),
  direction: z.enum(["long", "short"]),
  profitLoss: z.number(),
});

export type LeanTrade = z.infer<typeof leanTradeSchema>;

export const leanBacktestSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  totalReturn: z.number(),
  sharpeRatio: z.number(),
  maxDrawdown: z.number(),
  winRate: z.number(),
  totalTrades: z.number(),
  equityCurve: z.array(equityCurvePointSchema),
  trades: z.array(leanTradeSchema).default([]),
  rawResults: z.record(z.unknown()),
  errorLog: z.string().nullable().optional(),
  dataSource: z.enum(["simulated", "live_engine"]).default("simulated"),
  runAt: z.date(),
});

export const insertLeanBacktestSchema = leanBacktestSchema.omit({
  id: true,
  runAt: true,
});

export type LeanBacktest = z.infer<typeof leanBacktestSchema>;
export type InsertLeanBacktest = z.infer<typeof insertLeanBacktestSchema>;

export const leanProjectsTable = pgTable("lean_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  code: text("code").notNull(),
  description: text("description"),
  generatedBy: text("generated_by"),
  lastBacktestId: text("last_backtest_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leanBacktestsTable = pgTable("lean_backtests", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: text("project_id").notNull(),
  status: text("status").notNull(),
  totalReturn: real("total_return").notNull().default(0),
  sharpeRatio: real("sharpe_ratio").notNull().default(0),
  maxDrawdown: real("max_drawdown").notNull().default(0),
  winRate: real("win_rate").notNull().default(0),
  totalTrades: integer("total_trades").notNull().default(0),
  equityCurve: jsonb("equity_curve").notNull().default([]),
  trades: jsonb("trades").notNull().default([]),
  rawResults: jsonb("raw_results").notNull().default({}),
  errorLog: text("error_log"),
  dataSource: text("data_source").notNull().default("simulated"),
  runAt: timestamp("run_at").notNull().defaultNow(),
});

export const trialsTable = pgTable("trials", {
  id: uuid("id").primaryKey().defaultRandom(),
  trialType: text("trial_type").notNull(),
  strategyId: text("strategy_id"),
  leanProjectName: text("lean_project_name"),
  model: text("model"),
  promptSummary: text("prompt_summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trialTypeSchema = z.enum(["generation", "refinement", "optimization"]);
export type TrialType = z.infer<typeof trialTypeSchema>;

export const insertTrialSchema = createInsertSchema(trialsTable).omit({
  id: true,
  createdAt: true,
});
export type Trial = typeof trialsTable.$inferSelect;
export type InsertTrial = z.infer<typeof insertTrialSchema>;

export const orderBookEntrySchema = z.object({
  price: z.number(),
  quantity: z.number(),
  total: z.number(),
});

export const orderBookSchema = z.object({
  symbol: z.string(),
  bids: z.array(orderBookEntrySchema),
  asks: z.array(orderBookEntrySchema),
  spread: z.number(),
  spreadPercent: z.number(),
  lastUpdate: z.date(),
});

export type OrderBookEntry = z.infer<typeof orderBookEntrySchema>;
export type OrderBook = z.infer<typeof orderBookSchema>;

export const gateResultsTable = pgTable("gate_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  strategyId: text("strategy_id").notNull(),
  gate: text("gate").notNull(),
  verdict: text("verdict").notNull(),
  metrics: jsonb("metrics"),
  dataSource: text("data_source"),
  reason: text("reason"),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
});

export const insertGateResultSchema = createInsertSchema(gateResultsTable).omit({
  id: true,
  computedAt: true,
});

export type GateResult = typeof gateResultsTable.$inferSelect;
export type InsertGateResult = z.infer<typeof insertGateResultSchema>;
