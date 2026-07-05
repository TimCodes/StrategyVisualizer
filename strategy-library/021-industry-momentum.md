# 021 — Industry Momentum

**Category:** Momentum / rotation · **Origin:** Established (Moskowitz & Grinblatt 1999)

## Summary
Rank industries (not individual stocks) by trailing 6-month return and hold the winners; much of single-stock momentum is actually industry momentum in disguise, and trading it at the industry level cuts idiosyncratic blowup risk and turnover. Capital rotates between industries slowly as narratives build, so leadership persists for months. Loser: the allocator who diversifies uniformly across industries regardless of where the cycle is paying.

## Possible instruments
- Industry ETFs (semiconductors SMH, banks KBE, homebuilders XHB, biotech XBI, etc.)
- Industry-grouped stock baskets for finer granularity

## Entry rules
1. Monthly: score = 6-month total return per industry ETF.
2. Hold top 3 with positive score, equal weight.
3. Market filter: reduce to half exposure when the broad index is below its 200-day SMA.

## Exit rules
1. Monthly rotation; drop industries leaving the top 3 or turning negative.
2. Per-position 15% disaster stop between rebalances.

## Pseudocode
```
monthly:
  for etf in industries: score[etf] = ret(etf, 126)
  top = [e for e in top_n(score,3) if score[e] > 0]
  expo = 1.0 if index > SMA(index,200) else 0.5
  rebalance_to(expo * equal_weight(top))
```
