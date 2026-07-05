# 015 — Dual Momentum (Absolute + Relative)

**Category:** Momentum / asset allocation · **Origin:** Established (Gary Antonacci, "Dual Momentum Investing")

## Summary
Combine relative momentum (which asset is strongest) with absolute momentum (is it actually going up at all): hold US equities or international equities — whichever has the higher 12-month return — but only if that return beats T-bills; otherwise hold bonds. The absolute filter is the innovation: it converts a rotation strategy into one that steps aside in bear markets. Loser: the buy-and-holder who rides full drawdowns, and the relative-only rotator who rotates into the least-bad falling asset.

## Possible instruments
- Classic trio: SPY (US), VEU/EFA (intl), AGG/BND (bonds), BIL (cash proxy)
- Extendable to any small set of major asset-class ETFs

## Entry rules
1. Monthly: compute 12-month total return for SPY and VEU.
2. If max(SPY, VEU) return > BIL return: hold the winner, 100%.
3. Else hold AGG.

## Exit rules
1. Positions change only at the monthly check.
2. No stops — the monthly absolute-momentum test is the risk control.

## Pseudocode
```
monthly:
  r_spy, r_veu, r_cash = ret12m(SPY), ret12m(VEU), ret12m(BIL)
  if max(r_spy, r_veu) > r_cash:
      hold(SPY if r_spy >= r_veu else VEU)
  else:
      hold(AGG)
```
