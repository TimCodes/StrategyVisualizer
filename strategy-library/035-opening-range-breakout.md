# 035 — Opening Range Breakout (ORB)

**Category:** Intraday breakout · **Origin:** Established (Toby Crabel lineage; recent academic validation on stocks/ETFs)

## Summary
Define the first 15-30 minutes' high/low as the opening range; trade the first decisive break of it in the direction of the break, with the opposite side as the stop. The open concentrates overnight order flow; once that auction resolves, the day's dominant flow frequently persists (intraday momentum). Loser: fade traders fighting a resolved opening auction and stopped-out overnight holders. Requires intraday execution but no special data.

## Possible instruments
- Index futures/micros (ES, NQ), liquid ETFs (SPY, QQQ)
- High-beta liquid stocks (gappers with volume), FX at session opens

## Entry rules
1. Opening range = high/low of the first 15 minutes (tune 5-30 at walk-forward).
2. Long on a 1-minute close above OR-high; short below OR-low (one direction only per day, first break wins).
3. Volume/relative-volume filter: today's early volume > 1.2x average.

## Exit rules
1. Stop: opposite side of the opening range.
2. Target: 2R, or trail below 20-period EMA on 5-minute bars.
3. Flatten at session close — no overnight.

## Pseudocode
```
after 15min:
  orh, orl = range_high, range_low
if no_trade_yet and close_1m > orh and relvol > 1.2:  long;  stop = orl
if no_trade_yet and close_1m < orl and relvol > 1.2:  short; stop = orh
manage: exit at 2R target or EMA20(5m) trail; flatten at session end
```
