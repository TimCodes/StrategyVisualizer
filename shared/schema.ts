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

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.date(),
  context: z.any().optional(),
});

export const insertChatMessageSchema = chatMessageSchema.omit({
  id: true,
  timestamp: true,
});

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
  exchange: z.enum(["binance", "coinbase", "kraken", "alpaca"]).optional(),
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
