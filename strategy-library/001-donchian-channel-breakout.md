# 001 — Donchian Channel Breakout (Turtle-style)

**Category:** Trend following · **Origin:** Established (Richard Donchian; Dennis & Eckhardt's Turtles)

## Summary
Buy when price closes above the highest high of the last N days; the premise is that major trends must begin with a new N-day extreme, and slow-reacting participants (discretionary holders anchored to old prices, hedgers rebalancing late) continue to supply liquidity as the trend develops. The strategy loses often in ranges and pays for it with rare, large trend captures — the win rate is low by design and the edge lives entirely in the tail.

## Possible instruments
- Liquid futures (ES, NQ, CL, GC, ZN) or their CFD/micro equivalents
- Trend-prone FX majors (EURUSD, USDJPY)
- Broad ETFs (SPY, QQQ, GLD, USO) and large-cap trending equities
- BTC/ETH on daily bars

## Entry rules
1. Compute the N-day highest high and lowest low (classic: N=20 entry, 55 for the slower system), excluding today.
2. Long when price breaks above the N-day high; short when it breaks below the N-day low (skip shorts in long-only accounts).
3. Optional regime filter: only take longs above the 200-day SMA, shorts below.

## Exit rules
1. Exit long when price breaks the M-day low (classic M=10); mirror for shorts.
2. Initial protective stop at 2x ATR(20) from entry.
3. No profit target — the exit channel trails the trend.

## Pseudocode
```
N_entry = 20; M_exit = 10; atr_mult = 2
each bar:
  hh = highest(high, N_entry, exclude_today)
  ll = lowest(low, M_exit, exclude_today)
  if flat and close > hh and close > SMA(close, 200):
      buy; stop = close - atr_mult * ATR(20)
  if long and (close < ll or close <= stop):
      sell
```
