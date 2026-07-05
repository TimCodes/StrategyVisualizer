# 080 — Breakout-Pullback Hybrid (Buy the First Retest)

**Category:** Trend / entry-timing hybrid · **Origin:** Established (breakout-retest playbook; systematized)

## Summary
Instead of buying a Donchian breakout at the extreme (bad average entry price) or a pullback with no trend confirmation (catching knives), require both in sequence: a fresh N-day breakout that then retraces to the old resistance level within a few bars — buy the retest holding. The breakout proves demand; the shallow retest proves absent supply; the entry price is materially better than 001's. Loser: breakout chasers shaken out at the retest low, whose capitulation is the fill.

## Possible instruments
- Everything strategy 001 trades: futures, FX, ETFs, liquid stocks, crypto

## Entry rules
1. Event: close above the 55-day high (breakout registered, no trade yet).
2. Within the next 10 bars, price pulls back to within 0.5x ATR of the old breakout level and holds (no close below it).
3. Buy on the first close back above the pullback bar's high. Cancel the setup if the level closes broken.

## Exit rules
1. Stop 1.5x ATR below the breakout level.
2. Trail with a 20-day Donchian low once the trade exceeds +2R.

## Pseudocode
```
if close > highest(close,55): armed = true; level = highest(close,55)[1]
if armed and bars_since <= 10 and low <= level + 0.5*ATR(20) and close > level:
    if close > pullback_bar.high: buy; stop = level - 1.5*ATR(20)
if close < level: armed = false
if long and R >= 2: trail = lowest(low, 20)
```
