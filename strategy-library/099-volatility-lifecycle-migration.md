# 099 — Volatility Lifecycle Migration

**Category:** Volatility regime / trend timing · **Origin:** NOVEL — original design (volatility percentile tools are common; trading the MIGRATION between percentile zones as the entry trigger is the original element)

## Summary
Volatility has a lifecycle: instruments spend months dormant (low ATR percentile), then "wake up" as vol migrates from the bottom decile into the middle band — and major trends disproportionately begin during that migration, not at the extremes. Screen a universe for ATR-percentile migration (from <10th to 25-50th percentile within a month) and take trend entries only in migrating names. Vol level says nothing about direction; vol *migration* says something is starting. Loser: holders of dormant names who tune out and react late when the regime wakes.

## Possible instruments
- Broad stock/ETF universe (screening strategy), futures across asset classes, crypto majors

## Entry rules
1. Vol percentile: ATR(20) rank within its own 1-year history.
2. Migration: percentile was < 10 within the last 21 sessions AND is now in 25-50.
3. Direction: take the trend side — close above/below the 50-day SMA with a 20-day extreme in that direction.

## Exit rules
1. Exit when the vol percentile exceeds 85 (lifecycle maturity — the crowd has arrived).
2. Standard trail: 2.5x ATR(20); stop below the migration month's low.

## Pseudocode
```
p = percentile_rank(ATR(20), 252)
migrating = min(p, last 21) < 0.10 and 0.25 <= p <= 0.50
if migrating and close > SMA(close,50) and close == highest(close,20):
    buy; stop = lowest(low, 21)
if long and (p > 0.85 or close <= trail(2.5*ATR)): sell
```
