# 004 — ADX-Filtered Trend Pullback Entry

**Category:** Trend following · **Origin:** Established (Wilder's ADX/DMI toolkit)

## Summary
Only trade in the direction of a trend that ADX confirms is strong, and enter on a shallow pullback rather than at the extreme. Strong trends attract systematic and discretionary followers whose buy-the-dip behavior makes shallow pullbacks self-fulfilling; the loser is the counter-trend trader picking tops in a trending regime. ADX filters out the ranging state where trend entries bleed.

## Possible instruments
- FX majors and crosses (4h/daily), index futures/CFDs
- Liquid trending equities and ETFs

## Entry rules
1. ADX(14) > 25 and +DI > -DI (established uptrend).
2. Price pulls back to touch or dip below EMA(20) while remaining above EMA(50).
3. Long when price closes back above EMA(20).

## Exit rules
1. Exit if ADX falls below 20 (trend dying) or -DI crosses above +DI.
2. Initial stop below the pullback swing low; trail at 2.5x ATR(14) once at least 1R in profit.

## Pseudocode
```
each bar:
  trending = ADX(14) > 25 and plusDI > minusDI
  pulled_back = any(low[i] <= EMA(close,20)[i] for i in 1..3) and close > EMA(close,50)
  if flat and trending and pulled_back and close > EMA(close,20):
      buy; stop = lowest(low, 5)
  if long:
      if profit >= 1R: stop = max(stop, close - 2.5*ATR(14))
      if ADX(14) < 20 or minusDI > plusDI or close <= stop: sell
```
