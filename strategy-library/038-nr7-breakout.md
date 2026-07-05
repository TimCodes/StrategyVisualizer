# 038 — NR7 (Narrowest Range 7) Breakout

**Category:** Volatility breakout / pattern day trade · **Origin:** Established (Toby Crabel, "Day Trading with Short Term Price Patterns")

## Summary
A day whose range is the narrowest of the last seven flags maximum short-term agreement; Crabel documented that the following day's range expands and tends to trend from the break of the NR7 bar's extremes. Trade the break with a stop at the opposite extreme. Purely a volatility-cycle trade — no directional opinion until the market shows its hand. Loser: participants asleep inside the compression whose stops feed the expansion.

## Possible instruments
- Index and commodity futures (native habitat), liquid ETFs
- FX majors on daily bars

## Entry rules
1. Yesterday was NR7: range(high-low) smallest of the last 7 sessions.
2. Buy stop at yesterday's high + 1 tick; sell stop at yesterday's low - 1 tick (OCO). First fill wins.
3. Optional inside-day requirement (NR7 + inside day = "ID/NR7", stronger but rarer).

## Exit rules
1. Stop: the opposite bracket order level.
2. Exit at market close (day trade), or hold with a 2R target for the swing variant.

## Pseudocode
```
if range(yesterday) == min(range, last 7):
    place OCO: buy_stop @ y.high+tick, sell_stop @ y.low-tick
on fill: stop = other_side; exit at session close or 2R
cancel unfilled orders at close
```
