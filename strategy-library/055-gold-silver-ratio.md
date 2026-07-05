# 055 — Gold/Silver Ratio Reversion

**Category:** Pairs / commodity relative value · **Origin:** Established (centuries-old ratio trade)

## Summary
The gold/silver ratio oscillates in wide historical bands (roughly 40-100 in the modern era) because the metals share monetary demand while silver carries extra industrial beta; at band extremes, rotate toward the cheap metal against the rich one. This is slow, regime-scale reversion — entries are rare and holds are months. Loser: the panic/euphoria flow that treats one metal as the only safe haven at the extreme. Risk: the bands themselves migrate — hence percentile bands, not fixed levels.

## Possible instruments
- GLD/SLV ETF pair (retail default), gold/silver futures or micros
- Long-only variant: hold the cheap metal alone

## Entry rules
1. Ratio = gold/silver; compute its 5-year percentile.
2. Ratio above 90th percentile: long silver, short gold (silver historically cheap).
3. Ratio below 10th percentile: long gold, short silver. Dollar-balanced legs.

## Exit rules
1. Exit when the ratio crosses its 5-year median.
2. Stop if the ratio makes a new 5-year extreme beyond entry by 10%.

## Pseudocode
```
ratio = gold/silver; pct = percentile_rank(ratio, 5y)
if flat and pct > 0.9: long SLV, short GLD
if flat and pct < 0.1: long GLD, short SLV
if open and pct crosses 0.5: close
```
