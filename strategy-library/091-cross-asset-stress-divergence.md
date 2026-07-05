# 091 — Cross-Asset Stress Divergence Buy

**Category:** Mean reversion / cross-asset confirmation · **Origin:** NOVEL — original design (flight-to-quality dynamics documented; the divergence-as-permission gate for reversion entries is the original element)

## Summary
Before buying an equity panic (RSI(2)-style washout), check whether the OTHER fear assets agree: if stocks are crashing but treasuries and gold are NOT bid and credit spreads are calm, the equity move is likely a local liquidation, not systemic stress — the highest-quality reversion setup. If everything confirms stress, stand aside: that's 2008, not a dip. The cross-asset divergence is the permission slip. Loser: the single-asset panicker selling equities while the rest of the risk complex yawns.

## Possible instruments
- SPY/ES entries, gated by TLT, GLD, and HYG (or credit-spread proxy) behavior

## Entry rules
1. Equity washout: SPY RSI(2) < 10 above the 200-day SMA (as in 023).
2. Divergence gate — require at least 2 of 3: TLT 5-day return < +1.5% (no flight-to-quality); GLD 5-day return < +2%; HYG within 1 ATR of its 20-day mean (credit calm).
3. Buy at the close when washout + gate agree.

## Exit rules
1. Exit at RSI(2) > 65 or 7 sessions.
2. Emergency: exit immediately if the divergence gate flips (bonds/gold catch a genuine stress bid after entry).

## Pseudocode
```
washout = RSI(SPY,2) < 10 and SPY > SMA(SPY,200)
calm = count([ret(TLT,5) < 1.5%, ret(GLD,5) < 2%, |HYG-SMA(HYG,20)| < ATR(HYG)]) >= 2
if flat and washout and calm: buy SPY at close
if long and (RSI(SPY,2) > 65 or days >= 7 or not calm): sell
```
