# 025 — Double 7's

**Category:** Mean reversion · **Origin:** Established (Connors & Alvarez)

## Summary
Buy a 7-day closing low in a bull regime, sell the next 7-day closing high — the simplest expression of short-term reversion in index products, deliberately parameter-light (one number). Works because index ETF flows overshoot on multi-day pullbacks while the primary trend is up. Loser: the momentum-chasing seller of week-long weakness. Its simplicity is the appeal for the walk-forward stage: almost nothing to overfit.

## Possible instruments
- SPY, QQQ, DIA, EFA and similar broad index ETFs
- Index futures/micros

## Entry rules
1. Close above the 200-day SMA.
2. Today's close is the lowest close of the last 7 trading days.
3. Buy at the close.

## Exit rules
1. Sell at the close when today's close is the highest close of the last 7 trading days.
2. No stop in the original; add a 5x ATR disaster stop for live discipline.

## Pseudocode
```
each day:
  if flat and close > SMA(close,200) and close == lowest(close,7):
      buy at close
  if long and close == highest(close,7):
      sell at close
```
