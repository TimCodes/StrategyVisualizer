# 026 — Three Lower Closes in an Uptrend

**Category:** Mean reversion · **Origin:** Established (multiple-days-down pattern, documented across short-term trading literature)

## Summary
Three consecutive lower closes inside a bull regime statistically tilt the next few sessions positive in index products: short-horizon sellers exhaust themselves while the structural bid remains. This is the streak version of RSI(2) — same overreaction mechanism, expressed as consecutive-day psychology rather than an oscillator. Loser: the trader who extrapolates a three-day slide into a new downtrend.

## Possible instruments
- Broad index ETFs and futures
- Liquid sector ETFs

## Entry rules
1. Close above the 200-day SMA.
2. Three consecutive lower closes (close < close[1] < close[2] < close[3]... i.e., three down days).
3. Buy at the third down close.

## Exit rules
1. Exit at the first close above yesterday's high, or
2. Time stop 5 days; disaster stop 4x ATR(20).

## Pseudocode
```
down3 = close < close[1] and close[1] < close[2] and close[2] < close[3]
each day:
  if flat and close > SMA(close,200) and down3:
      buy at close; exit_day = today + 5
  if long and (close > high[1] or today >= exit_day):
      sell at close
```
