# 030 — VIX-Spike Equity Reversion

**Category:** Mean reversion / cross-asset filter · **Origin:** Established (VIX stretch entries documented in Connors and vol literature)

## Summary
Buy broad equities only when panic is measurable: VIX stretched far above its own short-term average while the market sits in a long-term uptrend. The VIX stretch identifies forced de-risking (vol-target funds, margin calls) whose selling is price-insensitive — the definition of the counterparty you want. Loser: the fund that must sell because volatility rose, regardless of price. This is the cross-asset cousin of RSI(2).

## Possible instruments
- SPY/ES, QQQ/NQ (VIX applies to US large-cap complex)
- Analogous: VSTOXX filter for European indices

## Entry rules
1. VIX closes >= 15% above its 10-day SMA (stretch condition).
2. SPY above its 200-day SMA.
3. Buy SPY at the close; optional second unit if the stretch exceeds 25%.

## Exit rules
1. Exit when VIX closes back below its 10-day SMA, or
2. Time stop 10 trading days.

## Pseudocode
```
stretch = VIX / SMA(VIX,10) - 1
each day:
  if flat and stretch >= 0.15 and SPY > SMA(SPY,200):
      buy SPY at close
      if later stretch >= 0.25 and units < 2: add
  if long and (stretch < 0 or days_held >= 10):
      sell at close
```
