# 058 — Stock/Bond Ratio Trend Rotation

**Category:** Relative value / macro rotation · **Origin:** Established (intermarket analysis; risk-on/risk-off ratio work)

## Summary
The SPY/TLT ratio trends with the macro risk cycle; hold whichever asset the ratio's trend favors (stocks when the ratio is above its rising moving average, bonds otherwise). This converts the noisy "risk-on/risk-off" narrative into one number and always holds *something* productive. Loser: the static 60/40 allocator who owns the losing side of the cycle at full weight through every regime turn.

## Possible instruments
- SPY vs TLT (classic); QQQ vs IEF; international variants

## Entry rules
1. R = SPY/TLT (total-return adjusted). Signal: R vs SMA(R, 100).
2. R > SMA and SMA rising → 100% SPY; R < SMA and SMA falling → 100% TLT.
3. Ambiguous (signal and slope disagree) → 50/50. Check weekly.

## Exit rules
1. Rotation happens at the weekly check only; no intra-week trades.
2. Crisis brake: if both assets are below their own 200-day SMAs, go to cash/T-bills.

## Pseudocode
```
weekly:
  R = SPY/TLT; s = SMA(R,100)
  if R > s and s.rising:  target = SPY
  elif R < s and s.falling: target = TLT
  else: target = 50/50
  if SPY < SMA(SPY,200) and TLT < SMA(TLT,200): target = BIL
  rebalance_to(target)
```
