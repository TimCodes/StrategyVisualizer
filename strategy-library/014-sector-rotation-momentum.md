# 014 — Sector Rotation Momentum (ETF)

**Category:** Momentum / rotation · **Origin:** Established (relative-strength rotation, widely documented)

## Summary
Hold the strongest 2-3 sector ETFs by blended trailing return, rebalanced monthly, with a cash fallback in bear regimes. Sector leadership persists because capital rotates slowly — institutional mandates and quarterly committee cycles mean flows chase performance with a lag. The loser is the late-cycle allocator buying last year's leader after the baton has passed; the monthly cadence keeps you nearer the front of that queue.

## Possible instruments
- US sector SPDRs (XLK, XLE, XLF, XLV, XLI, XLP, XLU, XLB, XLY, XLC, XLRE)
- Industry ETFs or European sector equivalents

## Entry rules
1. Score each sector: 0.5x 3-month return + 0.3x 6-month + 0.2x 12-month.
2. Hold the top 3 equally weighted if their score > 0 and SPY > 200-day SMA.
3. Any sector with negative score is replaced by cash (or a treasury ETF).

## Exit rules
1. Monthly: exit sectors leaving the top 3.
2. Mid-month emergency exit only if SPY closes 3% below its 200-day SMA.

## Pseudocode
```
monthly:
  for etf in sectors:
      score[etf] = 0.5*ret(63) + 0.3*ret(126) + 0.2*ret(252)
  top = [e for e in top_n(score,3) if score[e] > 0 and SPY > SMA(SPY,200)]
  rebalance_to(equal_weight(top), remainder -> SHY)
```
