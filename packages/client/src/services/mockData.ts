import {
  Strategy,
  MarketData,
  PriceData,
  Trade,
  BacktestResult,
  PortfolioMetrics,
  PerformanceData,
} from "@shared/schema";

export const mockStrategies: Strategy[] = [
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
    gateHistory: [],
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
    gateHistory: [],
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

export const mockMarketData: MarketData[] = [
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

export const mockPriceData: PriceData[] = Array.from({ length: 30 }, (_, i) => {
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

export const mockTrades: Trade[] = [
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

export const mockBacktestResults: BacktestResult[] = [
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

export const mockPortfolioMetrics: PortfolioMetrics = {
  totalValue: 125467.89,
  totalReturn: 25467.89,
  totalReturnPercent: 24.67,
  sharpeRatio: 1.84,
  maxDrawdown: -8.32,
  winRate: 68.4,
  volatility: 15.6,
  beta: 0.92,
};

export const mockPerformanceData: PerformanceData[] = Array.from({ length: 12 }, (_, i) => {
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
