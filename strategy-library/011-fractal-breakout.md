# 011 — Williams Fractal Breakout

**Category:** Trend following / swing structure · **Origin:** Established (Bill Williams)

## Summary
Enter on a break of the most recent confirmed fractal high (a 5-bar pattern where the middle bar's high exceeds the two on each side), which marks the last level where sellers overwhelmed buyers. Breaking it means that supply has been absorbed. This is market-structure trend following: the fractal grid provides objective swing points instead of arbitrary lookbacks. The loser is the trader short against structure whose stops sit just above the fractal.

## Possible instruments
- FX majors (1h-daily), index futures/CFDs
- Liquid equities and ETFs, crypto majors

## Entry rules
1. Identify the latest up-fractal (high[2] > high[0,1,3,4] in a 5-bar window, confirmed 2 bars later).
2. Buy stop one tick above that fractal high.
3. Trend filter: only take entries above the Alligator jaw (SMMA 13) or EMA(50).

## Exit rules
1. Stop below the latest confirmed down-fractal.
2. Trail the stop up to each newly confirmed down-fractal as the trend advances.

## Pseudocode
```
each bar:
  up_fx  = confirmed_up_fractal()    # returns price level or none
  dn_fx  = confirmed_down_fractal()
  if flat and up_fx and close > EMA(close,50):
      place buy_stop at up_fx + tick
  if long and dn_fx:
      stop = max(stop, dn_fx - tick)
  if long and low <= stop: sell
```
