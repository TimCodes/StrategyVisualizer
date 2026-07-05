# 043 — Multi-Day Range Compression Expansion

**Category:** Volatility breakout · **Origin:** Established (Crabel-family: NR-N plus historical-volatility ratio systems)

## Summary
When short-horizon realized volatility falls to a small fraction of medium-horizon volatility (e.g. 6-day HV under half of 100-day HV), the market is coiled; buy or sell the break of the compression range with brackets. This generalizes NR7 from one bar to a statistical window and travels well across asset classes. Loser: the same compression-complacent crowd; the bracket ensures no directional guess.

## Possible instruments
- Futures across asset classes, FX majors, liquid ETFs, crypto

## Entry rules
1. Condition: HV(6)/HV(100) < 0.5 (both annualized close-to-close).
2. Range = highest high / lowest low of the last 6 sessions.
3. OCO brackets: buy stop above range high, sell stop below range low, while the condition holds.

## Exit rules
1. Initial stop: the opposite side of the compression range.
2. Trail 2.5x ATR(14) once +1.5R; hard time exit after 15 sessions if neither fires.

## Pseudocode
```
if HV(6)/HV(100) < 0.5:
    place OCO: buy_stop @ hh(6)+tick, sell_stop @ ll(6)-tick
on fill: stop = other_side; trail after +1.5R
cancel brackets when condition lapses
```
