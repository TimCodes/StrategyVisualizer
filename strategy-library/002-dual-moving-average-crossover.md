# 002 — Dual Moving Average Crossover with Trend Filter

**Category:** Trend following · **Origin:** Established (classic; ubiquitous in CTA systems)

## Summary
Hold long while a fast moving average is above a slow one, with a higher-timeframe filter to avoid whipsaw regimes. The mechanism is trend persistence driven by gradual information diffusion and herding; the persistent loser is the mean-reversion seller who fades every strong move and the investor who waits for "confirmation" long after the average has turned. Expect long flat or losing stretches in choppy markets — the filter exists to shrink them, not eliminate them.

## Possible instruments
- Index ETFs (SPY, QQQ, EFA, EEM), sector ETFs
- Futures/CFDs on indices and commodities
- FX majors on daily/4h bars
- BTC/ETH daily

## Entry rules
1. Fast MA (e.g. EMA 20) crosses above slow MA (e.g. EMA 100) → long next open.
2. Filter: only enter if price is above the 200-day SMA and ADX(14) > 15.
3. One position per instrument; no pyramiding in the base version.

## Exit rules
1. Fast MA crosses back below slow MA → exit next open.
2. Hard stop at 3x ATR(20) below entry, whichever hits first.

## Pseudocode
```
fast = EMA(close, 20); slow = EMA(close, 100)
each bar:
  if flat and crossover(fast, slow) and close > SMA(close,200) and ADX(14) > 15:
      buy; stop = close - 3*ATR(20)
  if long and (crossunder(fast, slow) or close <= stop):
      sell
```
