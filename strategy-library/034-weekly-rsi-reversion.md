# 034 — Weekly Oversold Reversion in a Bull Market

**Category:** Mean reversion / position timeframe · **Origin:** Established (weekly-timeframe pullback buying; standard swing playbook)

## Summary
Buy multi-week pullbacks in a bull market using weekly RSI, holding for weeks rather than days — the slow cousin of RSI(2) for traders who cannot watch dailies. Deeper pullbacks in confirmed uptrends mark the capitulation of medium-horizon holders; the recovery is powered by mean reversion plus the primary trend's drift. Loser: the medium-term holder who capitulates at the sixth red week.

## Possible instruments
- Index/sector ETFs, quality large-caps
- Works on monthly bars for very-long-horizon accounts

## Entry rules
1. Weekly close above the 40-week (200-day) SMA.
2. Weekly RSI(4) < 30.
3. Buy the weekly close; one add allowed if RSI(4) < 20 the following week.

## Exit rules
1. Exit when weekly RSI(4) > 60, or
2. Weekly close below the 40-week SMA (regime failed — exit immediately).

## Pseudocode
```
each week:
  if flat and close > SMA(close,40w) and RSI(close,4w) < 30:
      buy; if next_week RSI < 20 and units < 2: add
  if long and (RSI(close,4w) > 60 or close < SMA(close,40w)):
      sell
```
