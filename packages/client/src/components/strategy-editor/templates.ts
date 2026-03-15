export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  code: string;
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: "ma-crossover",
    name: "Moving Average Crossover",
    description: "SMA 20/50 crossover on SPY",
    category: "Trend Following",
    code: `from AlgorithmImports import *

class MovingAverageCrossover(QCAlgorithm):
    """
    Moving Average Crossover Strategy
    Buys when the fast SMA crosses above the slow SMA,
    sells when it crosses below.
    """

    def initialize(self):
        self.set_start_date(2022, 1, 1)
        self.set_end_date(2023, 12, 31)
        self.set_cash(100000)

        self.spy = self.add_equity("SPY", Resolution.DAILY).symbol
        self.fast = self.sma(self.spy, 20, Resolution.DAILY)
        self.slow = self.sma(self.spy, 50, Resolution.DAILY)
        self.set_warm_up(50)

        self.set_benchmark("SPY")

    def on_data(self, data):
        if self.is_warming_up:
            return

        if not self.fast.is_ready or not self.slow.is_ready:
            return

        fast_val = self.fast.current.value
        slow_val = self.slow.current.value

        if fast_val > slow_val and not self.portfolio[self.spy].invested:
            self.set_holdings(self.spy, 1.0)
            self.log(f"BUY SPY: Fast SMA {fast_val:.2f} > Slow SMA {slow_val:.2f}")
        elif fast_val < slow_val and self.portfolio[self.spy].invested:
            self.liquidate(self.spy)
            self.log(f"SELL SPY: Fast SMA {fast_val:.2f} < Slow SMA {slow_val:.2f}")

        self.plot("SMA", "Fast", fast_val)
        self.plot("SMA", "Slow", slow_val)
`,
  },
  {
    id: "rsi-mean-reversion",
    name: "RSI Mean Reversion",
    description: "RSI(14) overbought/oversold signals",
    category: "Mean Reversion",
    code: `from AlgorithmImports import *

class RSIMeanReversion(QCAlgorithm):
    """
    RSI Mean Reversion Strategy
    Buys when RSI is oversold (< 30), sells when overbought (> 70).
    """

    def initialize(self):
        self.set_start_date(2022, 1, 1)
        self.set_end_date(2023, 12, 31)
        self.set_cash(100000)

        self.spy = self.add_equity("SPY", Resolution.DAILY).symbol
        self.rsi = self.rsi(self.spy, 14, MovingAverageType.SIMPLE, Resolution.DAILY)
        self.set_warm_up(14)

        self.oversold = 30
        self.overbought = 70

    def on_data(self, data):
        if self.is_warming_up or not self.rsi.is_ready:
            return

        rsi_val = self.rsi.current.value

        if rsi_val < self.oversold and not self.portfolio[self.spy].invested:
            self.set_holdings(self.spy, 1.0)
            self.log(f"BUY SPY: RSI oversold at {rsi_val:.2f}")
        elif rsi_val > self.overbought and self.portfolio[self.spy].invested:
            self.liquidate(self.spy)
            self.log(f"SELL SPY: RSI overbought at {rsi_val:.2f}")

        self.plot("RSI", "RSI", rsi_val)
        self.plot("RSI", "Oversold", self.oversold)
        self.plot("RSI", "Overbought", self.overbought)
`,
  },
  {
    id: "bollinger-bands",
    name: "Bollinger Bands",
    description: "BB(20,2) mean reversion strategy",
    category: "Mean Reversion",
    code: `from AlgorithmImports import *

class BollingerBandsStrategy(QCAlgorithm):
    """
    Bollinger Bands Mean Reversion
    Buys when price touches the lower band, sells at middle band.
    """

    def initialize(self):
        self.set_start_date(2022, 1, 1)
        self.set_end_date(2023, 12, 31)
        self.set_cash(100000)

        self.spy = self.add_equity("SPY", Resolution.DAILY).symbol
        self.bb = self.bb(self.spy, 20, 2, MovingAverageType.SIMPLE, Resolution.DAILY)
        self.set_warm_up(20)

    def on_data(self, data):
        if self.is_warming_up or not self.bb.is_ready:
            return

        price = self.securities[self.spy].price
        lower = self.bb.lower_band.current.value
        middle = self.bb.middle_band.current.value
        upper = self.bb.upper_band.current.value

        if price <= lower and not self.portfolio[self.spy].invested:
            self.set_holdings(self.spy, 1.0)
            self.log(f"BUY: Price {price:.2f} at lower band {lower:.2f}")
        elif price >= middle and self.portfolio[self.spy].invested:
            self.liquidate(self.spy)
            self.log(f"SELL: Price {price:.2f} at middle band {middle:.2f}")

        self.plot("BB", "Price", price)
        self.plot("BB", "Lower", lower)
        self.plot("BB", "Middle", middle)
        self.plot("BB", "Upper", upper)
`,
  },
  {
    id: "macd-momentum",
    name: "MACD Momentum",
    description: "MACD crossover momentum strategy",
    category: "Momentum",
    code: `from AlgorithmImports import *

class MACDMomentum(QCAlgorithm):
    """
    MACD Momentum Strategy
    Buys when MACD line crosses above signal, sells when it crosses below.
    """

    def initialize(self):
        self.set_start_date(2022, 1, 1)
        self.set_end_date(2023, 12, 31)
        self.set_cash(100000)

        self.spy = self.add_equity("SPY", Resolution.DAILY).symbol
        self.macd = self.macd(self.spy, 12, 26, 9, MovingAverageType.EXPONENTIAL, Resolution.DAILY)
        self.set_warm_up(26)

        self.previous_signal = None

    def on_data(self, data):
        if self.is_warming_up or not self.macd.is_ready:
            return

        macd_val = self.macd.current.value
        signal_val = self.macd.signal.current.value
        histogram = macd_val - signal_val

        if macd_val > signal_val and not self.portfolio[self.spy].invested:
            self.set_holdings(self.spy, 1.0)
            self.log(f"BUY: MACD {macd_val:.4f} crossed above signal {signal_val:.4f}")
        elif macd_val < signal_val and self.portfolio[self.spy].invested:
            self.liquidate(self.spy)
            self.log(f"SELL: MACD {macd_val:.4f} crossed below signal {signal_val:.4f}")

        self.plot("MACD", "MACD", macd_val)
        self.plot("MACD", "Signal", signal_val)
        self.plot("MACD", "Histogram", histogram)
`,
  },
  {
    id: "multi-asset-momentum",
    name: "Multi-Asset Momentum",
    description: "Monthly rotation across sectors",
    category: "Momentum",
    code: `from AlgorithmImports import *

class MultiAssetMomentum(QCAlgorithm):
    """
    Multi-Asset Momentum Rotation
    Monthly rotation into the top 2 performing ETFs based on 12-month momentum.
    """

    def initialize(self):
        self.set_start_date(2021, 1, 1)
        self.set_end_date(2023, 12, 31)
        self.set_cash(100000)

        tickers = ["SPY", "QQQ", "IWM", "EFA", "EEM", "GLD", "TLT", "VNQ"]
        self.symbols = [self.add_equity(t, Resolution.DAILY).symbol for t in tickers]
        self.lookback = 252
        self.top_n = 2

        self.schedule.on(
            self.date_rules.month_start(),
            self.time_rules.after_market_open("SPY", 30),
            self.rebalance
        )
        self.set_warm_up(self.lookback)

    def rebalance(self):
        if self.is_warming_up:
            return

        momentum = {}
        for symbol in self.symbols:
            history = self.history(symbol, self.lookback, Resolution.DAILY)
            if not history.empty:
                returns = (history["close"].iloc[-1] / history["close"].iloc[0]) - 1
                momentum[symbol] = returns

        if not momentum:
            return

        sorted_symbols = sorted(momentum, key=momentum.get, reverse=True)
        top = sorted_symbols[:self.top_n]

        for symbol in self.symbols:
            if symbol in top:
                self.set_holdings(symbol, 1.0 / self.top_n)
            else:
                self.liquidate(symbol)

        self.log(f"Rebalanced into: {[str(s) for s in top]}")

    def on_data(self, data):
        pass
`,
  },
  {
    id: "pairs-trading",
    name: "Pairs Trading",
    description: "Statistical arbitrage on correlated assets",
    category: "Arbitrage",
    code: `from AlgorithmImports import *
import numpy as np

class PairsTrading(QCAlgorithm):
    """
    Pairs Trading Strategy
    Trades the spread between two correlated assets (SPY/QQQ).
    """

    def initialize(self):
        self.set_start_date(2022, 1, 1)
        self.set_end_date(2023, 12, 31)
        self.set_cash(100000)

        self.spy = self.add_equity("SPY", Resolution.DAILY).symbol
        self.qqq = self.add_equity("QQQ", Resolution.DAILY).symbol

        self.lookback = 30
        self.z_score_threshold = 2.0
        self.set_warm_up(self.lookback)

    def on_data(self, data):
        if self.is_warming_up:
            return

        history = self.history([self.spy, self.qqq], self.lookback, Resolution.DAILY)
        if history.empty:
            return

        spy_prices = history.loc[self.spy]["close"] if self.spy in history.index.get_level_values(0) else None
        qqq_prices = history.loc[self.qqq]["close"] if self.qqq in history.index.get_level_values(0) else None

        if spy_prices is None or qqq_prices is None:
            return

        spread = np.log(spy_prices) - np.log(qqq_prices)
        mean = spread.mean()
        std = spread.std()

        if std == 0:
            return

        current_spread = np.log(self.securities[self.spy].price) - np.log(self.securities[self.qqq].price)
        z_score = (current_spread - mean) / std

        spy_invested = self.portfolio[self.spy].invested
        qqq_invested = self.portfolio[self.qqq].invested

        if z_score > self.z_score_threshold:
            self.set_holdings(self.spy, -0.5)
            self.set_holdings(self.qqq, 0.5)
            self.log(f"SHORT SPY, LONG QQQ: Z-score {z_score:.2f}")
        elif z_score < -self.z_score_threshold:
            self.set_holdings(self.spy, 0.5)
            self.set_holdings(self.qqq, -0.5)
            self.log(f"LONG SPY, SHORT QQQ: Z-score {z_score:.2f}")
        elif abs(z_score) < 0.5 and (spy_invested or qqq_invested):
            self.liquidate()
            self.log(f"EXIT: Z-score normalized to {z_score:.2f}")

        self.plot("Spread", "Z-Score", z_score)
`,
  },
  {
    id: "crypto-momentum",
    name: "Crypto Momentum",
    description: "BTC/ETH momentum with hourly data",
    category: "Crypto",
    code: `from AlgorithmImports import *

class CryptoMomentum(QCAlgorithm):
    """
    Crypto Momentum Strategy
    Trades BTC and ETH based on short-term momentum using hourly data.
    """

    def initialize(self):
        self.set_start_date(2022, 1, 1)
        self.set_end_date(2023, 12, 31)
        self.set_cash(100000)
        self.set_brokerage_model(BrokerageName.COINBASE_PRO, AccountType.CASH)

        self.btc = self.add_crypto("BTCUSD", Resolution.HOUR).symbol
        self.eth = self.add_crypto("ETHUSD", Resolution.HOUR).symbol

        self.fast_btc = self.ema(self.btc, 12, Resolution.HOUR)
        self.slow_btc = self.ema(self.btc, 26, Resolution.HOUR)
        self.fast_eth = self.ema(self.eth, 12, Resolution.HOUR)
        self.slow_eth = self.ema(self.eth, 26, Resolution.HOUR)

        self.set_warm_up(26)

    def on_data(self, data):
        if self.is_warming_up:
            return

        if self.fast_btc.is_ready and self.slow_btc.is_ready:
            btc_bullish = self.fast_btc.current.value > self.slow_btc.current.value
            if btc_bullish and not self.portfolio[self.btc].invested:
                self.set_holdings(self.btc, 0.5)
            elif not btc_bullish and self.portfolio[self.btc].invested:
                self.liquidate(self.btc)

        if self.fast_eth.is_ready and self.slow_eth.is_ready:
            eth_bullish = self.fast_eth.current.value > self.slow_eth.current.value
            if eth_bullish and not self.portfolio[self.eth].invested:
                self.set_holdings(self.eth, 0.5)
            elif not eth_bullish and self.portfolio[self.eth].invested:
                self.liquidate(self.eth)
`,
  },
  {
    id: "volatility-breakout",
    name: "Volatility Breakout",
    description: "ATR-based breakout with dynamic stops",
    category: "Trend Following",
    code: `from AlgorithmImports import *

class VolatilityBreakout(QCAlgorithm):
    """
    Volatility Breakout Strategy
    Enters on price breakouts confirmed by ATR, uses dynamic ATR stops.
    """

    def initialize(self):
        self.set_start_date(2022, 1, 1)
        self.set_end_date(2023, 12, 31)
        self.set_cash(100000)

        self.spy = self.add_equity("SPY", Resolution.DAILY).symbol
        self.atr = self.atr(self.spy, 14, MovingAverageType.SIMPLE, Resolution.DAILY)
        self.highest = self.max(self.spy, 20, Resolution.DAILY)
        self.lowest = self.min(self.spy, 20, Resolution.DAILY)

        self.stop_loss_price = None
        self.atr_multiplier = 2.0
        self.set_warm_up(20)

    def on_data(self, data):
        if self.is_warming_up or not self.atr.is_ready:
            return

        price = self.securities[self.spy].price
        atr_val = self.atr.current.value
        highest = self.highest.current.value
        lowest = self.lowest.current.value

        if not self.portfolio[self.spy].invested:
            if price >= highest:
                self.set_holdings(self.spy, 1.0)
                self.stop_loss_price = price - (atr_val * self.atr_multiplier)
                self.log(f"BUY breakout at {price:.2f}, stop at {self.stop_loss_price:.2f}")
        else:
            new_stop = price - (atr_val * self.atr_multiplier)
            if self.stop_loss_price:
                self.stop_loss_price = max(self.stop_loss_price, new_stop)

            if price <= self.stop_loss_price or price <= lowest:
                self.liquidate(self.spy)
                self.stop_loss_price = None
                self.log(f"SELL: Stop hit at {price:.2f}")

        self.plot("Breakout", "Price", price)
        self.plot("Breakout", "High", highest)
        self.plot("Breakout", "Low", lowest)
`,
  },
];

export const DEFAULT_LEAN_TEMPLATE = STRATEGY_TEMPLATES[0].code;
