# 096 — Triple-Gate Short-Vol Carry

**Category:** Volatility premium / regime-gated · **Origin:** NOVEL-variant — original gate stack (each component documented; the explicit three-condition AND gate with vol-of-vol is the original element)

## Summary
Hold a half-leverage short-vol position (SVXY-style) ONLY while three independent conditions simultaneously agree: (1) VIX futures contango > 5% (carry exists), (2) SPX above its 200-day SMA (equity regime supportive), and (3) vol-of-vol in its bottom half (the vol regime itself is stable — see 086). Any single gate failing exits the position. Each gate covers a distinct historical failure mode of naive short-vol; the AND-stack is the design. Loser: the structural crash-insurance buyer, harvested only when all three weather flags are green.

## Possible instruments
- SVXY (half-leverage), or short VX micro futures for pros
- Sleeve size hard-capped (<= 5% of portfolio) regardless of signals

## Entry rules
1. Gate A: VX2/VX1 - 1 > 5%.
2. Gate B: SPX > SMA(SPX, 200).
3. Gate C: VVIX (or ATR-of-ATR proxy) below its 1-year median.
4. All three true for 3 consecutive closes -> enter the sleeve.

## Exit rules
1. ANY gate false at any close -> exit at next open. No exceptions, no "it's only slightly off."
2. Hard stop -12% on the sleeve; 20 sessions cooling-off after any stop-out.

## Pseudocode
```
A = contango > 0.05; B = SPX > SMA200; C = volofvol < median(252)
if flat and A and B and C for 3 closes: buy sleeve (5% cap)
if long and not (A and B and C):        sell at next open
```
