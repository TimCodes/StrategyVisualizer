# 061 — VIX Term-Structure Contango Harvest

**Category:** Volatility premium / futures curve · **Origin:** Established (VIX futures roll-down literature; post-2018 "Volmageddon" risk canon)

## Summary
When VIX futures trade in contango, short-vol ETPs (SVXY-style) and short VIX-futures positions harvest the roll-down as futures converge toward the lower spot. The premium exists because investors persistently overpay for crash protection. This is picking up large coins in front of a slow but real steamroller: February 2018 destroyed naive versions overnight. Only tradable with a strict term-structure gate, small size, and a hard exit. Loser: the structural buyer of VIX futures insurance.

## Possible instruments
- SVXY (half-leverage short-vol ETP), short VX futures/micros for pros
- Never unhedged short VIX calls

## Entry rules
1. Contango gate: front-month VIX future at least 5% below the second month AND spot VIX below 20.
2. Equity regime gate: SPX above its 200-day SMA.
3. Size: small fixed fraction (this sleeve should never exceed ~5% of the portfolio).

## Exit rules
1. Exit immediately when the curve flattens (contango < 2%) or VIX closes above 20.
2. Hard stop: -15% on the position, no averaging.
3. Re-entry requires 5 consecutive days of restored contango.

## Pseudocode
```
contango = VX2/VX1 - 1
if flat and contango > 0.05 and VIX < 20 and SPX > SMA(SPX,200):
    buy SVXY (size = 0.05 * portfolio)
if long and (contango < 0.02 or VIX > 20 or pnl < -15%):
    sell immediately
```
