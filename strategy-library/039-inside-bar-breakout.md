# 039 — Inside Bar Breakout

**Category:** Breakout / pattern · **Origin:** Established (classic price-action pattern)

## Summary
An inside bar (today's range entirely within yesterday's) marks pause and agreement after a directional move; trading the break of the mother bar's extreme in the prevailing trend direction catches the continuation while defining risk at the opposite extreme. It is the single-bar version of a consolidation breakout. Loser: counter-trend traders treating the pause as reversal, whose stops sit just beyond the mother bar.

## Possible instruments
- FX majors (4h/daily — its most-traded habitat), index futures
- Liquid equities on daily bars

## Entry rules
1. Inside bar formed: high < high[1] and low > low[1].
2. Trend alignment: only long breaks when close > EMA(50) and EMA(50) rising.
3. Buy stop 1 tick above the mother bar (yesterday's) high, valid for 2 bars.

## Exit rules
1. Stop below the mother bar low (or inside bar low for tighter risk, half size).
2. Target 2R, or trail below subsequent higher lows for trend continuation.

## Pseudocode
```
inside = high < high[1] and low > low[1]
if inside and close > EMA(close,50) and EMA(close,50).rising:
    place buy_stop @ high[1] + tick (expires after 2 bars)
on fill: stop = low[1] - tick; target = entry + 2*(entry-stop)
```
