# 098 — Crypto Funding-Rate Contrarian

**Category:** Sentiment / positioning extreme (crypto) · **Origin:** NOVEL-variant — original systematization (funding-rate dynamics widely discussed in crypto practice; the percentile-gated fade with basis confirmation is the original element)

## Summary
Perpetual-futures funding rates are a direct, quantitative gauge of leveraged retail positioning: extreme positive funding means crowded leveraged longs paying dearly to stay long. Fade funding extremes on the majors — short (or exit longs) at top-percentile funding, long at deeply negative funding — because crowded leverage liquidates violently in the opposite direction. The counterparty is the definition of a forced loser: the liquidation cascade. Confirm with the spot-futures basis to avoid fighting genuine spot-led demand.

## Possible instruments
- BTC/ETH perpetuals (or spot positioning informed by the perp signal)
- Funding data is free from every major exchange

## Entry rules
1. Funding percentile over 1 year: > 95th (crowded longs) or < 5th (crowded shorts).
2. Basis confirmation: futures premium to spot must agree with the crowding read (premium stretched the same way).
3. Enter opposite to the crowd at the next funding timestamp; majors only.

## Exit rules
1. Exit when funding returns inside the 40th-60th percentile band.
2. Stop: 1.5x ATR adverse. Time stop 10 days.

## Pseudocode
```
fp = percentile_rank(funding, 365d)
if fp > 0.95 and basis_stretched_up:  short (or exit longs)
if fp < 0.05 and basis_stretched_dn:  long
exit when 0.4 < fp < 0.6, or stop/time
```
