# 076 — Intraday VWAP Reversion

**Category:** Intraday mean reversion · **Origin:** Established (VWAP as institutional benchmark; reversion documented in microstructure practice)

## Summary
VWAP is the institutional benchmark: execution algos work orders around it all day, creating gravitational pull. When price stretches far from VWAP without news in a non-trending session, fade the stretch back toward the line — you are trading with the benchmark-tracking flow. Loser: the aggressive taker who paid far above the day's fair value in a balanced session. Critical filter: on genuine trend days VWAP reversion is a wood-chipper, so a trend-day detector gates everything.

## Possible instruments
- Index futures/ETFs (deepest algo participation), liquid large-caps

## Entry rules
1. Session not trending: opening 30-min range NOT broken by more than 0.5x its height in either direction.
2. Stretch: price >= 1.5x intraday-ATR above/below VWAP.
3. Fade toward VWAP on the first 1-minute close back inside the stretch band.

## Exit rules
1. Target: VWAP touch. Stop: 0.75x intraday-ATR beyond the stretch extreme.
2. Max 2 attempts per session; abandon if a trend day declares itself (new session extreme after entry).

## Pseudocode
```
if balanced_session and |price - vwap| >= 1.5*iATR:
    on reversal close: enter toward vwap
    stop = extreme +/- 0.75*iATR; target = vwap
max_trades_per_day = 2; flatten at close
```
