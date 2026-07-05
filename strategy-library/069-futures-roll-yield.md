# 069 — Commodity Roll-Yield (Backwardation) Harvest

**Category:** Carry / commodity curve · **Origin:** Established (theory of normal backwardation; term-structure factor in commodity literature)

## Summary
Hold commodities whose futures curves are in backwardation (front above deferred — positive roll yield as positions roll down toward spot) and avoid/short those in steep contango. The curve reveals hedging pressure: backwardation means producers pay to hedge (Keynes' normal backwardation), and the long earns their premium. Loser: commercial hedgers paying insurance, plus passive long-only commodity indices bleeding contango.

## Possible instruments
- Futures/micros across energy, metals, agriculture
- Retail proxy: choose ETFs by curve shape rather than holding broad baskets

## Entry rules
1. Monthly: roll yield = (front - second)/second annualized, per commodity.
2. Long the top 3-5 by roll yield if positive; short (or skip) the steepest contango names.
3. Momentum tiebreak: require 3-month return > 0 for longs (curve + trend agreement).

## Exit rules
1. Monthly re-rank; exit when a market's roll yield flips sign.
2. Per-market 2.5x ATR stop between rebalances.

## Pseudocode
```
monthly, for c in commodities:
  ry[c] = annualize((F1[c]-F2[c])/F2[c])
longs = top_n({c: ry[c] where ry>0 and ret(c,63)>0}, 4)
rebalance_to(equal_risk(longs))
```
