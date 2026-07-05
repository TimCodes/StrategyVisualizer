# 007 — 52-Week High Breakout

**Category:** Trend following / behavioral · **Origin:** Established (George & Hwang 2004, "The 52-Week High and Momentum Investing")

## Summary
Buy stocks breaking to new 52-week highs. The documented mechanism is anchoring: investors treat the 52-week high as a ceiling and under-react to good news near it (sellers "take profits" at the anchor), so price drifts upward after the level finally breaks. The persistent loser is the anchored profit-taker and the short-seller who treats a new high as "too expensive."

## Possible instruments
- Liquid single stocks (where the anomaly was documented)
- Country/sector ETFs as a milder version

## Entry rules
1. Today's close makes a new 252-day closing high.
2. Liquidity filter: price > $5, 20-day average dollar volume above a floor.
3. Avoid event risk: skip if earnings within the next 5 sessions.

## Exit rules
1. Time-based: hold 20-60 trading days (the drift horizon in the literature), or
2. Trail: exit on close below the 50-day SMA, whichever comes first.
3. Hard stop 15% below entry.

## Pseudocode
```
each day, for stock in universe:
  if flat and close == highest(close, 252) and dollar_vol_ok and not earnings_soon:
      buy; entry_day = today; stop = close * 0.85
  if long and (days_held >= 40 or close < SMA(close,50) or close <= stop):
      sell
```
