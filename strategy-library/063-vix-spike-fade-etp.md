# 063 — VIX Spike Fade via Options

**Category:** Volatility mean reversion · **Origin:** Established (vol mean-reversion literature; VIX spike decay statistics)

## Summary
Volatility spikes decay: VIX cannot compound like a price, and historical spikes above the 80-90th percentile have reverted toward the median within weeks. Fade extreme spikes with defined-risk structures (VIX put spreads or SVXY calls), never naked shorts. The counterparty is panic hedging bought at the peak of fear — the most overpriced insurance in markets. The hazard is clustering: 2008/2020 spikes kept spiking, hence defined risk only.

## Possible instruments
- VIX options (put spreads 1-2 months out), SVXY calls
- Do not use spot-following ETPs for this without understanding roll

## Entry rules
1. VIX closes above 28 AND at least 40% above its 63-day SMA (genuine spike, not drift).
2. Structure: buy VIX put spread at next monthly expiry (e.g. long 25-strike put, short 20), risking premium only.
3. Scale: one unit per 5 VIX points above trigger, max 3 units.

## Exit rules
1. Take profit at 60% of max spread value, or when VIX closes below its 63-day SMA.
2. Let expire if wrong (premium was the full risk).

## Pseudocode
```
if VIX > 28 and VIX > 1.4*SMA(VIX,63):
    buy vix_put_spread(next_monthly, ~25/20); risk = premium
if spread_value >= 0.6*max_value or VIX < SMA(VIX,63): close
```
