# 089 — Streak Survival Ladder

**Category:** Mean reversion / statistical sizing · **Origin:** NOVEL — original design (streak reversion known; sizing the scale-in from the instrument's own empirical streak-survival curve is the original element)

## Summary
For each instrument, build the empirical survival curve of consecutive-down-day streaks from its own history (how often does a 3-day streak become 4? a 4 become 5?). Scale into a long position along the streak with unit sizes proportional to the historical hazard of the streak ENDING at each length — betting more exactly where streaks historically die. Sizing derives from the instrument's own distribution instead of arbitrary martingale doubling. Loser: momentum extrapolators late in streaks, plus the naive averaging-down crowd whose sizing ignores the hazard curve entirely.

## Possible instruments
- Index ETFs/futures (streak statistics are stable), liquid sector ETFs
- Requires >= 15 years of daily history to estimate the curve honestly

## Entry rules
1. Precompute: hazard(n) = P(streak ends | reached n down closes), from >= 15y of data; refresh yearly.
2. Begin scaling at n = 3 down closes in a bull regime (above 200-day SMA).
3. Unit size at each n proportional to hazard(n), capped at 3 adds total; skip if hazard table says streaks of this length are trend signatures for this instrument (hazard < 0.5).

## Exit rules
1. Exit all units on the first up close (streak broken — thesis complete).
2. Disaster stop: total position loss > 2x ATR x units, or streak reaches n = 8.

## Pseudocode
```
precompute hazard[] from history
n = current_down_streak
if close > SMA(close,200) and n >= 3 and hazard[n] >= 0.5 and units < 3:
    buy size = base * hazard[n]
if close > close[1]: sell all
if n >= 8 or loss > 2*ATR*units: sell all (thesis wrong)
```
