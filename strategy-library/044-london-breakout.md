# 044 — London Session Breakout (FX)

**Category:** Intraday breakout / session-based · **Origin:** Established (well-known FX session pattern)

## Summary
Bracket the range built during the quiet Asian session and trade the breakout that occurs when London liquidity arrives (07:00-09:00 UK) — the day's dominant FX flow frequently sets its direction at the London open. The Asian range represents thin, information-light positioning; London's institutional flow resolves it. Loser: Asian-session range traders holding into the liquidity regime change.

## Possible instruments
- EURUSD, GBPUSD (primary), EURGBP, USDJPY
- Also observable in gold and index CFDs at the same boundary

## Entry rules
1. Range: high/low between 00:00-06:59 UK time.
2. OCO stops 2-3 pips beyond each side, active 07:00-10:00 UK only.
3. Skip days when the range is abnormally wide (> 1.3x its 20-day average — news polluted) or major UK/EU data drops at 07:00.

## Exit rules
1. Stop: opposite side of the Asian range.
2. Target 1.5-2x range height, or exit at 12:00 UK (before the US session muddies it).

## Pseudocode
```
asian = range(00:00..06:59 UK)
if asian.width <= 1.3*avg_width and no_open_news:
    07:00: place OCO beyond asian.high/low
on fill: stop = other_side; target = entry +/- 1.75*asian.width
12:00 UK: flatten and cancel
```
