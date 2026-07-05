# 079 — Floor-Trader Pivot Bounce

**Category:** Intraday support/resistance · **Origin:** Established (floor-trader pivots; classic levels framework)

## Summary
Classic pivots (P = (H+L+C)/3 with S1/R1 bands) are computed identically by an enormous population of traders, making them self-fulfilling coordination points: touches of S1/S2 in an up-bias session attract programmed bids. Buy the first touch of S1 when the day opens above P; target P/R1. This is a coordination-game trade, not an information trade. Loser: momentum sellers pressing into a level where the crowd's bids are pre-agreed.

## Possible instruments
- Index futures/CFDs, FX majors (where pivots are most watched), liquid large-caps

## Entry rules
1. Compute daily pivots from yesterday's H/L/C.
2. Bias filter: session opens above P (buyers' day).
3. Buy the first touch of S1 with a rejection signature (1-5 min close back above S1).

## Exit rules
1. Target: P (first), R1 (runner half).
2. Stop: midway between S1 and S2. One attempt per level per day; flat at close.

## Pseudocode
```
P=(H1+L1+C1)/3; S1=2P-H1; R1=2P-L1; S2=P-(H1-L1)
if open > P and touch(S1) and close_1m > S1:
    buy; stop=(S1+S2)/2; targets=[P, R1]
flatten at close
```
