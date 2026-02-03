import { z } from "zod";

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

export interface RiskValidationResult {
  approved: boolean;
  warnings: string[];
  errors: string[];
  suggestedSize?: number;
  riskAmount?: number;
  riskPercent?: number;
}

export interface TradeInput {
  symbol: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  stopLoss?: number;
}

export interface PortfolioState {
  totalValue: number;
  positions: Array<{
    symbol: string;
    quantity: number;
    value: number;
  }>;
  dailyPnL: number;
  peakValue: number;
  currentDrawdown: number;
}

export class RiskService {
  private settings: RiskSettings;
  private dailyTrades: TradeInput[] = [];
  private dailyPnL: number = 0;
  private lastResetDate: string = new Date().toDateString();

  constructor(settings?: Partial<RiskSettings>) {
    this.settings = riskSettingsSchema.parse(settings || {});
  }

  updateSettings(settings: Partial<RiskSettings>): void {
    this.settings = riskSettingsSchema.parse({
      ...this.settings,
      ...settings,
    });
  }

  getSettings(): RiskSettings {
    return { ...this.settings };
  }

  private resetDailyIfNeeded(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyTrades = [];
      this.dailyPnL = 0;
      this.lastResetDate = today;
    }
  }

  validateTrade(
    trade: TradeInput,
    portfolio: PortfolioState
  ): RiskValidationResult {
    this.resetDailyIfNeeded();

    if (!this.settings.enforceRiskLimits) {
      return {
        approved: true,
        warnings: ["Risk limits are disabled"],
        errors: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const tradeValue = trade.quantity * trade.price;

    if (tradeValue > this.settings.maxPositionSize) {
      errors.push(
        `Position size $${tradeValue.toLocaleString()} exceeds limit of $${this.settings.maxPositionSize.toLocaleString()}`
      );
    }

    const symbolPositions = portfolio.positions.filter(
      (p) => p.symbol === trade.symbol
    );
    if (symbolPositions.length >= this.settings.maxPositionsPerSymbol) {
      errors.push(
        `Maximum positions for ${trade.symbol} reached (${this.settings.maxPositionsPerSymbol})`
      );
    }

    if (portfolio.positions.length >= this.settings.maxTotalPositions) {
      errors.push(
        `Maximum total positions reached (${this.settings.maxTotalPositions})`
      );
    }

    const riskPercent = (tradeValue / portfolio.totalValue) * 100;
    if (riskPercent > this.settings.maxPortfolioRisk) {
      errors.push(
        `Trade risk ${riskPercent.toFixed(1)}% exceeds portfolio risk limit of ${this.settings.maxPortfolioRisk}%`
      );
    }

    const dailyLossPercent =
      (Math.abs(Math.min(0, this.dailyPnL)) / portfolio.totalValue) * 100;
    if (dailyLossPercent >= this.settings.dailyLossLimit) {
      errors.push(
        `Daily loss limit reached (${dailyLossPercent.toFixed(1)}% / ${this.settings.dailyLossLimit}%)`
      );
    }

    if (portfolio.currentDrawdown >= this.settings.maxDrawdown) {
      errors.push(
        `Maximum drawdown reached (${portfolio.currentDrawdown.toFixed(1)}% / ${this.settings.maxDrawdown}%)`
      );
    }

    if (!trade.stopLoss && trade.type === "buy") {
      warnings.push(
        `No stop-loss set. Recommended: ${this.settings.defaultStopLoss}% below entry`
      );
    }

    if (tradeValue > this.settings.maxPositionSize * 0.8) {
      warnings.push("Position size approaching maximum limit");
    }

    if (portfolio.currentDrawdown > this.settings.maxDrawdown * 0.75) {
      warnings.push(
        `Drawdown at ${portfolio.currentDrawdown.toFixed(1)}% - approaching limit`
      );
    }

    const riskAmount = trade.stopLoss
      ? Math.abs(trade.price - trade.stopLoss) * trade.quantity
      : tradeValue * (this.settings.defaultStopLoss / 100);

    const suggestedSize = this.calculatePositionSize(
      trade.price,
      trade.stopLoss || trade.price * (1 - this.settings.defaultStopLoss / 100),
      portfolio.totalValue
    );

    return {
      approved: errors.length === 0,
      warnings,
      errors,
      suggestedSize,
      riskAmount,
      riskPercent,
    };
  }

  calculatePositionSize(
    entryPrice: number,
    stopLoss: number,
    portfolioValue: number
  ): number {
    const riskAmount = portfolioValue * (this.settings.riskPerTrade / 100);
    const riskPerShare = Math.abs(entryPrice - stopLoss);

    if (riskPerShare === 0) {
      return Math.min(
        this.settings.maxPositionSize / entryPrice,
        (portfolioValue * this.settings.maxPortfolioRisk) / 100 / entryPrice
      );
    }

    const positionSize = riskAmount / riskPerShare;
    const positionValue = positionSize * entryPrice;

    return Math.min(positionSize, this.settings.maxPositionSize / entryPrice);
  }

  calculateStopLoss(entryPrice: number, type: "buy" | "sell"): number {
    const stopPercent = this.settings.defaultStopLoss / 100;
    return type === "buy"
      ? entryPrice * (1 - stopPercent)
      : entryPrice * (1 + stopPercent);
  }

  calculateTakeProfit(entryPrice: number, type: "buy" | "sell"): number {
    const tpPercent = this.settings.defaultTakeProfit / 100;
    return type === "buy"
      ? entryPrice * (1 + tpPercent)
      : entryPrice * (1 - tpPercent);
  }

  checkDrawdownAlert(portfolio: PortfolioState): {
    level: "normal" | "warning" | "danger" | "critical";
    message: string;
  } {
    const drawdownPercent =
      (portfolio.currentDrawdown / this.settings.maxDrawdown) * 100;

    if (drawdownPercent >= 100) {
      return {
        level: "critical",
        message: `Maximum drawdown reached (${portfolio.currentDrawdown.toFixed(1)}%). Trading halted.`,
      };
    }
    if (drawdownPercent >= 75) {
      return {
        level: "danger",
        message: `Drawdown at ${portfolio.currentDrawdown.toFixed(1)}% - approaching limit of ${this.settings.maxDrawdown}%`,
      };
    }
    if (drawdownPercent >= 50) {
      return {
        level: "warning",
        message: `Drawdown at ${portfolio.currentDrawdown.toFixed(1)}% - use caution`,
      };
    }
    return {
      level: "normal",
      message: `Drawdown at ${portfolio.currentDrawdown.toFixed(1)}% - within acceptable range`,
    };
  }

  recordTrade(trade: TradeInput, pnl: number): void {
    this.resetDailyIfNeeded();
    this.dailyTrades.push(trade);
    this.dailyPnL += pnl;
  }

  getDailyStats(): { trades: number; pnl: number; pnlPercent: number } {
    this.resetDailyIfNeeded();
    return {
      trades: this.dailyTrades.length,
      pnl: this.dailyPnL,
      pnlPercent: 0,
    };
  }
}

export const riskService = new RiskService();
