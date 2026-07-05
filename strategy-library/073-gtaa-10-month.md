# 073 — Global Tactical Asset Allocation (10-Month SMA)

**Category:** Trend / asset allocation · **Origin:** Established (Meb Faber 2007, "A Quantitative Approach to Tactical Asset Allocation")

## Summary
Hold each of five global asset classes when it trades above its 10-month SMA; otherwise hold its share in cash. One of the most replicated results in retail quant: equity-like returns with drawdowns cut roughly in half, because the SMA gate sidesteps the deep bear phases of each asset independently. Loser: the full-time holder of each asset through its worst regimes. Its virtue for the pipeline: one parameter, monthly bars, brutally hard to overfit.

## Possible instruments
- Faber's five: US stocks (SPY/VTI), foreign stocks (EFA), bonds (IEF), commodities (DBC), REITs (VNQ)

## Entry rules
1. Monthly close: for each sleeve, invest 20% if price > 10-month SMA.
2. Below the SMA, that 20% sits in T-bills.

## Exit rules
1. Signals checked only at month-end (intra-month noise is ignored by design).

## Pseudocode
```
month_end, for a in [VTI, EFA, IEF, DBC, VNQ]:
  target[a] = 0.20 if close(a) > SMA(close(a), 10 months) else 0
cash = 1 - sum(target)
rebalance_to(target + {BIL: cash})
```
