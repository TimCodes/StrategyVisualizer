# 003 — Triple Moving Average Alignment

**Category:** Trend following · **Origin:** Established (classic CTA variant)

## Summary
Trade only when three moving averages of increasing length are stacked in order (fast > mid > slow for longs), treating full alignment as evidence the trend has survived multiple horizons. The extra layer trades later entries for fewer whipsaws relative to the dual crossover. The loser being harvested is the same trend-fader, but the alignment requirement means the system deliberately gives up the first leg of every move.

## Possible instruments
- Index and commodity ETFs, futures, FX majors (daily)
- Trending large-cap equities

## Entry rules
1. EMA(10) > EMA(50) > EMA(200) and price > EMA(10) → long next open.
2. Enter only on the first bar the full alignment appears (not continuously while it persists).

## Exit rules
1. Exit when EMA(10) crosses below EMA(50) (alignment broken at the fast end).
2. Hard stop 3x ATR(20) below entry.

## Pseudocode
```
f = EMA(close,10); m = EMA(close,50); s = EMA(close,200)
aligned = f > m and m > s
each bar:
  if flat and aligned and not aligned[1] and close > f:
      buy; stop = close - 3*ATR(20)
  if long and (crossunder(f, m) or close <= stop):
      sell
```
