# 009 — Supertrend ATR Following

**Category:** Trend following · **Origin:** Established (Olivier Seban's Supertrend)

## Summary
Follow a volatility-banded trailing line (midpoint +/- multiplier x ATR with ratchet logic) that flips state when price closes through it — functionally a cleaner Keltner/chandelier hybrid. It encodes "stay long until an ATR-sized adverse move," harvesting trend persistence while defining risk in volatility units. Same loser as all trend systems: the fader and the late re-entrant.

## Possible instruments
- Index futures/CFDs, FX majors (1h-daily)
- Liquid equities/ETFs, crypto majors

## Entry rules
1. Supertrend(10, 3.0) flips to bullish (line moves below price).
2. Higher-timeframe agreement: daily Supertrend bullish when trading intraday.

## Exit rules
1. Exit when Supertrend flips bearish.
2. Optional partial: take half off at +2x ATR, let the rest ride the line.

## Pseudocode
```
st = Supertrend(period=10, mult=3.0)
each bar:
  if flat and st.direction == up and st_daily.direction == up:
      buy
  if long and st.direction == down:
      sell
```
