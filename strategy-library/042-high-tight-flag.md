# 042 — High-Tight Flag Continuation

**Category:** Breakout / momentum pattern · **Origin:** Established (O'Neil; rare classic pattern)

## Summary
After a near-vertical advance (roughly doubling in under two months), the strongest stocks pause in a shallow, tight flag (< 20-25% deep) for one to three weeks and then continue — the pause is too shallow for a move that large unless demand is extraordinary. Trade the flag break. Rare by construction; the pattern's scarcity is its protection against overfitting, and any test must respect how few signals exist. Loser: profit-takers who exit the pause expecting a full retracement.

## Possible instruments
- Small/mid-cap momentum leaders in bull markets; occasionally crypto majors

## Entry rules
1. Prior move: +90% or more within 8 weeks.
2. Flag: 1-3 weeks, correction < 25%, volume contracting.
3. Buy stop above the flag high; breakout volume > 1.5x average.

## Exit rules
1. Stop below the flag low (pattern failure).
2. Sell half at +25%; trail the rest below a 21-day EMA.

## Pseudocode
```
if ret(40 sessions) >= 0.9 and flag(depth<0.25, weeks 1..3, vol_contracting):
    place buy_stop @ flag.high + tick
on fill: stop = flag.low; scale_out at +25%; trail EMA(close,21)
```
