# 032 — %B Oscillator Reversion

**Category:** Mean reversion · **Origin:** Established (Bollinger's %B; Connors' multiple-days-low %B variant)

## Summary
%B expresses price's position within the Bollinger bands as a 0-1 number; requiring several consecutive days of very low %B (below 0.2) filters one-day noise and identifies a persistent hug of the lower band — a stronger washout than a single tag. The multi-day condition is what distinguishes this from strategy 024. Loser: sellers persisting into a statistically stretched zone in a bull regime.

## Possible instruments
- Index ETFs and liquid large-caps (daily)

## Entry rules
1. %B = (close - lowerBB) / (upperBB - lowerBB), bands (20, 2).
2. %B < 0.2 for 3 consecutive days.
3. Close above 200-day SMA. Buy at the third day's close.

## Exit rules
1. Exit when %B > 0.8, or
2. Time stop 6 days.

## Pseudocode
```
pb = (close - bb_lower(20,2)) / (bb_upper(20,2) - bb_lower(20,2))
each day:
  if flat and pb < 0.2 and pb[1] < 0.2 and pb[2] < 0.2 and close > SMA(close,200):
      buy at close; exit_day = today + 6
  if long and (pb > 0.8 or today >= exit_day):
      sell at close
```
