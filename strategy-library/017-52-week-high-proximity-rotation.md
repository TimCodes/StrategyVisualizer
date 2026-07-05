# 017 — 52-Week-High Proximity Rotation

**Category:** Momentum / behavioral · **Origin:** Established (George & Hwang ranking variant)

## Summary
Rank stocks by how close they trade to their own 52-week high (close / 252-day max) and hold the closest cohort. Distinct from return momentum: a stock can rank high while having gone nowhere for months, so this captures the anchoring effect directly — investors under-react near the anchor, and stocks pinned at their highs keep grinding through them. Loser: the "it's at its high, it must be due to fall" fader.

## Possible instruments
- Liquid stock universe (S&P 500 / Russell 1000)
- Works acceptably on industry ETFs

## Entry rules
1. Monthly: proximity[s] = close / max(close, 252).
2. Buy the top 20 by proximity, equal weight, with a 6-month minimum-return sanity floor (> 0) to avoid dead stocks pinned by buyouts.
3. Bear filter: cash when index < 200-day SMA.

## Exit rules
1. Monthly: drop names leaving the cohort.
2. Per-name disaster stop: exit on a 20% drawdown from entry between rebalances.

## Pseudocode
```
monthly:
  for s in universe: prox[s] = close[s]/max(close[s],252)
  targets = top_n(prox, 20) filtered by ret(126) > 0
  targets = [] if index < SMA(index,200)
  rebalance_to(equal_weight(targets))
```
