# 013 — Cross-Sectional Momentum (12-1 Relative Strength)

**Category:** Momentum / rotation · **Origin:** Established (Jegadeesh & Titman 1993)

## Summary
Each month, rank a universe by trailing 12-month return excluding the most recent month (the 12-1 convention avoids short-term reversal), and hold the top decile or top-N names. The academic mechanism is under-reaction to firm-specific news plus herding; the persistent loser is the value-anchored investor who sells winners too early and averages into losers. Momentum's known failure mode — violent crashes when the market snaps back after a downtrend — argues for the crash filter below.

## Possible instruments
- Large/mid-cap stock universe (S&P 500, Russell 1000)
- Country ETFs or sector ETFs for a smaller, cheaper version

## Entry rules
1. Monthly rebalance: score = return(t-252, t-21).
2. Buy the top 10-30 names (equal weight), subject to liquidity floor.
3. Crash filter: only be invested when the index is above its 200-day SMA; otherwise hold cash/T-bills.

## Exit rules
1. Sell anything that drops out of the top cohort at rebalance.
2. Portfolio-wide de-risk when the crash filter trips mid-month (optional weekly check).

## Pseudocode
```
monthly:
  for s in universe: score[s] = close[t-21]/close[t-252] - 1
  targets = top_n(score, 20) if index > SMA(index,200) else []
  rebalance_to(equal_weight(targets))
```
