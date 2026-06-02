export function isLiveTradingEnabled(): boolean {
  const val = process.env.LIVE_TRADING_ENABLED;
  return val === "true" || val === "1";
}

export const LIVE_TRADING_BLOCKED_MSG =
  "Live trading is disabled. Backtests are simulated; live orders are blocked.";
