# 029 — Z-Score Distance-from-Mean Reversion

**Category:** Mean reversion / statistical · **Origin:** Established (generic stat-arb building block)

## Summary
Standardize price's distance from its own moving average by recent volatility (z = (price - SMA)/sigma) and buy extreme negative z-scores in a filtered regime. This is the explicitly statistical statement of every reversion rule in this library, and its virtue is that thresholds transfer across instruments: z = -2 means the same thing everywhere. Loser: the trader who sells volatility-adjusted extremes as if they were trend starts.

## Possible instruments
- ETFs, large-caps, FX pairs, futures — anything liquid with stable regimes

## Entry rules
1. z = (close - SMA(close,20)) / STD(close,20); enter long when z < -2.0.
2. Regime filters: 200-day SMA rising; realized 20-day vol below its 80th percentile (crash guard).
3. Scale-in option: add once at z < -2.75 (max 2 units).

## Exit rules
1. Exit when z >= 0 (mean touched).
2. Time stop 10 days; disaster stop at z < -4 (thesis wrong — this is a regime change, not noise).

## Pseudocode
```
z = (close - SMA(close,20)) / STD(close,20)
each day:
  if flat and z < -2 and SMA(close,200).rising and vol_pctile(20) < 0.8:
      buy; if later z < -2.75 and units < 2: add
  if long and (z >= 0 or days_held >= 10 or z < -4):
      sell
```
