import { z } from "zod";
import { pgTable, text, boolean, integer, varchar } from "drizzle-orm/pg-core";
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

export const insertTradeSchema = tradeSchema.omit({ 
  id: true,
  pnl: true,
  timestamp: true
});

export const insertBacktestSchema = backtestResultSchema.omit({ 
  id: true, 
  createdAt: true 
});

export type Strategy = z.infer<typeof strategySchema>;
export type MarketData = z.infer<typeof marketDataSchema>;
export type PriceData = z.infer<typeof priceDataSchema>;
export type Trade = z.infer<typeof tradeSchema>;
export type BacktestResult = z.infer<typeof backtestResultSchema>;
export type PortfolioMetrics = z.infer<typeof portfolioMetricsSchema>;
export type PerformanceData = z.infer<typeof performanceDataSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;

export const exchangeSchema = z.enum(["binance", "coinbase", "kraken", "alpaca", "coingecko"]);
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
  rawResults: z.record(z.unknown()),
  errorLog: z.string().nullable().optional(),
  runAt: z.date(),
});

export const insertLeanBacktestSchema = leanBacktestSchema.omit({
  id: true,
  runAt: true,
});

export type LeanBacktest = z.infer<typeof leanBacktestSchema>;
export type InsertLeanBacktest = z.infer<typeof insertLeanBacktestSchema>;

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
