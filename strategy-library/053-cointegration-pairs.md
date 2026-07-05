# 053 — Cointegration Pairs Trading

**Category:** Pairs / statistical arbitrage · **Origin:** Established (Gatev, Goetzmann & Rouwenhorst 2006; Engle-Granger method)

## Summary
Find two economically-linked instruments whose price spread is stationary (cointegrated), then short the rich one and buy the cheap one when the spread's z-score stretches, betting on reconvergence. The economics (same industry, same inputs, cross-listing) provide the tether; the statistics time the entry. Loser: single-name flow that pushes one leg away from its partner without new relative information. The known killer is structural breaks — hence the correlation/cointegration re-test and the hard stop.

## Possible instruments
- Same-sector large-cap pairs (KO/PEP, XOM/CVX style)
- ETF pairs (XLE vs OIH), dual-listed shares, index vs futures basis for pros

## Entry rules
1. Universe scan: Engle-Granger/ADF test on 2 years of daily closes; keep pairs with p < 0.05 and hedge ratio beta from the regression.
2. Spread = A - beta x B; z = (spread - mean(60)) / std(60).
3. Enter when |z| > 2: long the cheap leg, short the rich leg, dollar-balanced by beta.

## Exit rules
1. Exit at z = 0 (reconvergence).
2. Stop-out at |z| > 3.5 (relationship may have broken) and suspend the pair pending re-test.
3. Time stop 30 sessions.

## Pseudocode
```
beta = ols(A, B, 504).beta
z = zscore(A - beta*B, 60)
if flat and z > 2:  short A, long beta*B
if flat and z < -2: long A, short beta*B
if open and (|z| < 0.1 or |z| > 3.5 or days > 30): close both legs
```
