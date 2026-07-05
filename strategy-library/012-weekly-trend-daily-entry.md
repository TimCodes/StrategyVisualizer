# 012 — Weekly Trend, Daily Entry (Timeframe Stack)

**Category:** Trend following / multi-timeframe · **Origin:** Established (classic "triple screen" lineage — Alexander Elder)

## Summary
Let the weekly chart decide direction and the daily chart decide timing: only take daily-timeframe long signals while the weekly trend is up. Separating regime from trigger reduces the biggest failure mode of daily systems — fighting the higher-timeframe tide. The loser is the trader who trades every daily signal symmetrically in both directions regardless of the dominant flow.

## Possible instruments
- Index and sector ETFs, large-cap equities
- FX majors, commodity futures (weekly/daily combo)

## Entry rules
1. Weekly filter: weekly EMA(13) rising and weekly MACD histogram above its prior bar.
2. Daily trigger: daily RSI(5) dips below 40 then closes back above it (pullback resolving) while price > daily EMA(50).
3. Enter next daily open.

## Exit rules
1. Exit when the weekly filter turns down (EMA 13 falling), regardless of daily state.
2. Daily hard stop 2x ATR(14) below entry; trail below latest daily swing low after +1R.

## Pseudocode
```
weekly_up = W.EMA(13).rising and W.MACD_hist > W.MACD_hist[1]
each daily bar:
  trigger = RSI(5)[1] < 40 and RSI(5) > 40 and close > EMA(close,50)
  if flat and weekly_up and trigger:
      buy; stop = close - 2*ATR(14)
  if long and (not weekly_up or close <= stop):
      sell
```
