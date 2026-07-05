# 027 — Internal Bar Strength (IBS) Reversion

**Category:** Mean reversion · **Origin:** Established (documented in quant blogs/academic notes; robust on equity index ETFs)

## Summary
IBS = (close - low) / (high - low): where within the day's range did we close? Closes pinned near the low (IBS < 0.2) in equity index products have shown a persistent next-day upward tilt — end-of-day capitulation and MOC selling pressure reverse overnight. The loser is the panicked seller into the close and mechanical end-of-day flows. Almost embarrassing in its simplicity, which makes it a good honesty test for the pipeline.

## Possible instruments
- Equity index ETFs (SPY, QQQ, EWG, EWU and other country funds — where it was documented)
- Index futures for the leveraged version

## Entry rules
1. IBS = (close - low)/(high - low) < 0.2.
2. Optional stack: combine with down-day (close < open) and bull regime filter.
3. Buy at the close.

## Exit rules
1. Sell at the first close with IBS > 0.8, or
2. Time stop 3-5 days.

## Pseudocode
```
ibs = (close - low) / max(high - low, tick)
each day:
  if flat and ibs < 0.2 and close > SMA(close,200):
      buy at close; exit_day = today + 4
  if long and (ibs > 0.8 or today >= exit_day):
      sell at close
```
