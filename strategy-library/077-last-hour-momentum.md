# 077 — Last-Hour Momentum (Power Hour)

**Category:** Intraday momentum / flow · **Origin:** Established (intraday momentum literature — Gao, Han, Li & Zhou 2018: first half-hour predicts last half-hour)

## Summary
The first half-hour's direction predicts the last half-hour's: morning flow reveals the day's institutional imbalance, and unfinished business (benchmarked execution, hedge rebalancing, MOC pressure) completes it into the close. Enter in the first half-hour's direction at 15:00, exit at the bell. Loser: whoever must finish executing before the close in the direction the market already revealed. Documented on SPY with decades of data.

## Possible instruments
- SPY/ES (the documented case), QQQ/NQ
- Leveraged ETF variant for small accounts (SSO) — mind the sizing

## Entry rules
1. Signal = sign of return from 09:30 open to 10:00.
2. At 15:00 ET, enter in the signal's direction (long-only variant: only positive signals).
3. Optional strength filter: |first-half-hour return| >= 0.25% (skip indecisive days).

## Exit rules
1. Exit at the closing auction. No overnight.
2. Intraday stop 0.75% adverse.

## Pseudocode
```
sig = sign(ret(09:30 -> 10:00))
if |ret| >= 0.25% at 15:00: enter direction sig; stop = 0.75% adverse
16:00: flatten (use MOC order)
```
