# 008 — Parabolic SAR Trend Rider

**Category:** Trend following · **Origin:** Established (Welles Wilder)

## Summary
Ride trends with Wilder's stop-and-reverse dots, whose acceleration factor tightens the trailing stop as the trend ages — an automatic "let it run, then protect it" schedule. It is purely reactive: the edge comes from trend persistence plus disciplined trailing, not prediction. Used long-only with a regime filter, because raw SAR whipsaws badly in ranges (its documented weakness).

## Possible instruments
- Trending FX pairs and index futures (4h/daily)
- Commodity ETFs, BTC/ETH

## Entry rules
1. Regime filter: price above 100-day SMA.
2. Long when SAR flips below price (dot moves from above to below).

## Exit rules
1. Exit when SAR flips back above price (the built-in trailing stop fires).
2. No separate profit target.

## Pseudocode
```
sar = ParabolicSAR(af_start=0.02, af_step=0.02, af_max=0.2)
each bar:
  if flat and sar < close and sar[1] > close[1] and close > SMA(close,100):
      buy
  if long and sar > close:
      sell
```
