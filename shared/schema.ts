import { z } from "zod";

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

export const insertStrategySchema = strategySchema.omit({ 
  id: true, 
  createdAt: true 
});

export const insertTradeSchema = tradeSchema.omit({ 
  id: true 
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

export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type InsertBacktest = z.infer<typeof insertBacktestSchema>;
