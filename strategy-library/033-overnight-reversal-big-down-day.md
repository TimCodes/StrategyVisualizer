# 033 — Overnight Hold After a Big Down Day

**Category:** Mean reversion / overnight effect · **Origin:** Established (overnight-return anomaly literature + panic-close reversion)

## Summary
After a large single-day decline that closes near the lows, buy the close and exit at the next open. The overnight session in US equities carries a documented positive return premium, and it concentrates after panic closes: end-of-day forced selling (margin, MOC imbalances, vol-target funds) exhausts itself at the bell, and overnight/foreign flows mark prices back up. Loser: whoever must be flat by the close, at any price.

## Possible instruments
- SPY/QQQ ETFs (close-to-open), index futures for precision
- Avoid single stocks (overnight headline risk is unbounded)

## Entry rules
1. Day return <= -1.5% AND close in the bottom 25% of the day's range (IBS < 0.25).
2. Index above its 200-day SMA (skip in confirmed bear regimes), and no scheduled overnight event (FOMC next morning etc.).
3. Buy at/near the closing auction.

## Exit rules
1. Sell at the next regular-session open. Always. The edge is the overnight window only.

## Pseudocode
```
each day near close:
  ibs = (close-low)/(high-low)
  if day_ret <= -0.015 and ibs < 0.25 and close > SMA(close,200) and not macro_event_tonight:
      buy at close
next day: sell at open
```
