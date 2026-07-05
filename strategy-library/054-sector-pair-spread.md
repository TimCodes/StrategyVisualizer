# 054 — Sector ETF Pair Spread Reversion

**Category:** Pairs / relative value · **Origin:** Established (ETF stat-arb variant of 053)

## Summary
Trade the relative-performance spread between two heavily-overlapping sector ETFs (e.g. XLE vs IYE, or SPY vs IVV in the degenerate case, more practically XLK vs VGT): near-identical baskets whose spread wanders on flow noise and creation/redemption timing rather than fundamentals. The tighter the overlap, the more mechanical the reversion — and the smaller the edge, so costs decide viability. Loser: flow imbalance between fund complexes, not an informed party.

## Possible instruments
- High-overlap ETF pairs: XLK/VGT, XLE/VDE, QQQ/ONEQ, IWM/VTWO

## Entry rules
1. Ratio = ln(ETF1/ETF2); z = zscore(ratio, 90 days).
2. Enter at |z| > 2: long the laggard, short the leader, dollar-neutral.
3. Verify holdings overlap > 80% quarterly (relationship maintenance).

## Exit rules
1. Exit at z = 0; stop at |z| > 3 or after 20 sessions.

## Pseudocode
```
z = zscore(log(P1/P2), 90)
if flat and z > 2:  short ETF1, long ETF2 (equal dollars)
if flat and z < -2: long ETF1, short ETF2
if open and (|z| < 0.1 or |z| > 3 or days > 20): close
```
