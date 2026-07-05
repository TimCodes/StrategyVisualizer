# 005 — MACD Trend Momentum

**Category:** Trend following · **Origin:** Established (Gerald Appel)

## Summary
Use the MACD line/signal crossover as a smoothed momentum trigger, but only in the direction of the long-term trend so the oscillator acts as a re-entry timer rather than a standalone signal. Trend persistence supplies the edge; the below-zero and 200-day filters exist because raw MACD crossovers in ranges are a coin flip with costs. The loser is late capitulation flow re-entering after momentum has already turned.

## Possible instruments
- Index/sector ETFs, large-cap equities (daily)
- FX majors, index futures (4h/daily)

## Entry rules
1. Price above 200-day SMA (bull regime).
2. MACD(12,26,9) line crosses above its signal line while both are below zero (pullback within uptrend — the "reset" entry).
3. Enter next open.

## Exit rules
1. Exit when MACD line crosses below signal while above zero (momentum rolling over from a high), or
2. Hard stop 2.5x ATR(20) below entry; move stop to breakeven at +2R.

## Pseudocode
```
macd, sig = MACD(close, 12, 26, 9)
each bar:
  if flat and close > SMA(close,200) and crossover(macd, sig) and macd < 0:
      buy; stop = close - 2.5*ATR(20)
  if long and ((crossunder(macd, sig) and macd > 0) or close <= stop):
      sell
```
