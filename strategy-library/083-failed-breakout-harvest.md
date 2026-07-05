# 083 — Failed-Breakout Harvest

**Category:** Contrarian / structure · **Origin:** NOVEL — original systematization (failure patterns known discretionarily as "turtle soup"; the systematic two-bar failure test and target logic are the original element)

## Summary
Systematically trade the *failure* of highly-visible breakouts: when price breaks an N-day high that thousands of systematic and retail traders act on, but closes back inside the range within two bars, the trapped breakout buyers become forced sellers and their unwind is predictable fuel for the opposite move. This inverts strategy 001 — same level, opposite bet, conditional on failure. Loser: the late breakout chaser, whose stop-out IS the strategy's profit mechanism. The two populations coexist: breakouts that run pay 001; breakouts that fail pay this.

## Possible instruments
- FX majors and index futures (where breakout systems are most crowded)
- Liquid ETFs; avoid thin stocks where "failure" may just be noise

## Entry rules
1. Event: close breaks the 20-day high (a level the maximum number of systems watch).
2. Failure test: within 2 bars, a close back below the old 20-day-high level.
3. Short on that failure close (long-only accounts: use the mirrored long at failed 20-day-low breaks).

## Exit rules
1. Target: the midpoint of the prior 20-day range (where trapped longs finish liquidating).
2. Stop: above the breakout bar's high. Time stop 7 bars.

## Pseudocode
```
if close > highest(close,20)[1]: breakout_bar = today; level = highest(close,20)[1]
if breakout_bar within 2 bars and close < level:
    short; stop = breakout_bar.high + tick
    target = midpoint(range(20)); expire = 7 bars
```
