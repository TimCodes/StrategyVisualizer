# 082 — Nested Squeeze Chain

**Category:** Volatility breakout / multi-timeframe · **Origin:** NOVEL — original design (squeeze components documented; the multi-timeframe simultaneity requirement is the original element)

## Summary
Require volatility compression to be simultaneously present on three nested timeframes (e.g. weekly, daily, 4h) before trading a breakout — a "squeeze chain." Single-timeframe squeezes fire constantly and fail often; simultaneous multi-scale compression is rare and implies broad, cross-horizon agreement whose resolution recruits sellers-turned-buyers on every scale at once. Loser: premium sellers and range traders on all three horizons simultaneously, whose hedging cascades in the breakout direction.

## Possible instruments
- Liquid futures/CFDs (indices, energy, metals), FX majors, crypto majors
- Liquid single stocks with clean multi-timeframe structure

## Entry rules
1. Squeeze on each timeframe: BB(20,2) width in its lowest decile of the last 120 bars of that timeframe.
2. All three timeframes squeezed simultaneously for >= 3 daily bars ("chain armed").
3. Enter on the daily close outside the daily band, direction of the break; require the 4h bar to agree.

## Exit rules
1. Stop: the daily squeeze range's opposite extreme.
2. Exit half at +2R; trail the remainder with the weekly Keltner midline (the largest compressed scale sets the ride horizon).

## Pseudocode
```
sq(tf) = bbwidth(tf) <= decile1(bbwidth(tf), 120)
armed = sq(W) and sq(D) and sq(H4) for >= 3 daily bars
if armed and daily_close > bb_up(D) and h4_close > bb_up(H4):
    buy; stop = squeeze_range(D).low
manage: half @ +2R; trail = keltner_mid(W)
```
