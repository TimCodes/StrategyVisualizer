export function isLiveTradingEnabled(): boolean {
  return process.env.LIVE_TRADING_ENABLED === "true";
}

export class LiveTradingDisabledError extends Error {
  constructor() {
    super(
      "Live trading is disabled. Backtests are simulated; live orders are blocked."
    );
    this.name = "LiveTradingDisabledError";
  }
}
