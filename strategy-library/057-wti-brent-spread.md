# 057 — WTI-Brent Spread Reversion

**Category:** Pairs / commodity spread · **Origin:** Established (inter-market crude spread; well-studied)

## Summary
WTI and Brent price the same underlying good separated by logistics (Cushing storage, shipping, export policy); the spread mean-reverts within a regime because physical arbitrage (storage, transport) caps divergence. Trade z-score extremes of the spread within the current structural regime — and respect that the regime occasionally re-bases (2011 shale glut) which is what the stop is for. Loser: flow pressure on one benchmark (e.g. regional hedging waves) that physical arb later corrects.

## Possible instruments
- CL vs BZ futures/micros; USO vs BNO ETFs for a retail proxy

## Entry rules
1. Spread = WTI - Brent (front month, roll-aligned); z-score over 120 days.
2. Enter at |z| > 2 (long the cheap benchmark, short the rich).
3. Skip around OPEC meetings and inventory-report days (event-driven regime jumps).

## Exit rules
1. Exit at z = 0; hard stop at |z| > 3.25.
2. Time stop 25 sessions; halt the strategy entirely if 3 consecutive stop-outs (regime break).

## Pseudocode
```
z = zscore(WTI - Brent, 120)
if flat and |z| > 2 and not event_window: enter convergence pair
if open and (|z| < 0.1 or |z| > 3.25 or days > 25): close
```
