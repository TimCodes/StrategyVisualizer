# 090 — Liquidity Vacuum Fade

**Category:** Microstructure / mean reversion · **Origin:** NOVEL — original design (price-volume analysis is ancient; the move-per-volume z-score as a systematic fade trigger is the original element)

## Summary
Fade large price moves that occurred on abnormally LOW volume: compute "price displacement per unit volume" and act when a day's move sits in the top decile of displacement but the bottom quartile of participation. Such moves traversed a liquidity vacuum — few hands changed conviction — and refill when normal liquidity returns. The inverse signal (big move + big volume) is repricing and must NOT be faded; the volume denominator is the whole idea. Loser: whoever chased price through an empty book, marking positions at prices with no volume behind them.

## Possible instruments
- Liquid single stocks and mid-caps (vacuum days are common), sector ETFs
- Futures in holiday/half-day sessions

## Entry rules
1. Vacuum score = |day return| / (volume / SMA(volume,50)); z-score over 1 year.
2. Trigger: |day return| >= 1.5x ATR AND volume < 0.75x average AND vacuum z >= 2.
3. Fade the move at the close (opposite direction), bull-regime filter for longs.

## Exit rules
1. Target: 50% retrace of the vacuum day's move.
2. Stop: vacuum day's extreme. Time stop 5 sessions.

## Pseudocode
```
vac = |ret| / (vol/SMA(vol,50)); z = zscore(vac, 252)
if |ret| >= 1.5*ATR and vol < 0.75*SMA(vol,50) and z >= 2:
    enter opposite direction at close
    target = close - 0.5*day_move; stop = day_extreme; expire 5d
```
