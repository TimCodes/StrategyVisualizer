# 071 — Risk Parity Lite (Volatility-Weighted Multi-Asset)

**Category:** Asset allocation / risk balancing · **Origin:** Established (Bridgewater All-Weather lineage; simplified retail forms)

## Summary
Weight a small set of lowly-correlated asset classes inversely to their volatility so each contributes similar risk, rebalancing monthly. Unlevered "lite" version skips the leverage that makes institutional risk parity controversial. The mechanism is diversification across economic regimes (growth/inflation up/down) plus the rebalancing premium. Loser: the cap-weighted allocator whose portfolio risk is secretly one asset (equities) in disguise.

## Possible instruments
- Core four: SPY (equities), TLT (long bonds), GLD (gold), DBC/commodity ETF
- Extendable: international equities, TIPS

## Entry rules
1. Monthly: weight_i proportional to 1/vol_i (60-day realized), normalized to 100%.
2. Optional trend gate per sleeve: zero a sleeve below its 10-month SMA, redistribute to T-bills.

## Exit rules
1. Rebalance monthly to new weights; no discretionary exits.
2. Drift bands: intra-month rebalance only if any weight drifts > 25% relative.

## Pseudocode
```
monthly:
  for a in assets: w[a] = (1/vol(a,60))
  normalize(w)
  if trend_gate and price(a) < SMA10m(a): w[a] -> BIL
  rebalance_to(w)
```
