# 093 — Level Absorption Failure Reversal

**Category:** Price structure / supply-demand · **Origin:** NOVEL — original systematization (Wyckoff absorption concepts are discretionary canon; the declining-progress test-count trigger is the original element)

## Summary
When price tests the same resistance level 4+ times with each test making LESS progress beyond the prior test (declining highs into the level, contracting ranges), the buyers are being absorbed — each attempt consumes demand without breaking through. Trade the reversal on the first test that fails to even reach the level. Classic tape-reading logic ("the more times a level is tested, the weaker the tests, the more likely the rejection") formalized into countable conditions — the deliberate inverse of the pop-trading belief that more tests weaken a level. Loser: the breakout-anticipation crowd accumulated above the level, unwinding together.

## Possible instruments
- Index futures and FX (clean levels, deep books), liquid large-caps on daily bars

## Entry rules
1. Identify a resistance level tested >= 4 times over 10-40 bars (touches within 0.25 x ATR of each other).
2. Absorption signature: each successive test's high <= prior test's high, AND test-bar ranges contracting.
3. Trigger: a rally attempt that stalls >= 0.5 x ATR BELOW the level (failure to test), then closes below the prior bar's low. Short there (mirror for support).

## Exit rules
1. Target: the origin of the tests (the range low where the sequence began).
2. Stop: above the level. Time stop 15 bars.

## Pseudocode
```
tests = touches(level, tolerance=0.25*ATR, min_count=4)
absorbed = highs_nonincreasing(tests) and ranges_contracting(tests)
if absorbed and rally_high < level - 0.5*ATR and close < low[1]:
    short; stop = level + 0.25*ATR; target = tests.origin_low
```
