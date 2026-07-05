# 067 — Volatility-Crush Earnings Iron Fly

**Category:** Options / event volatility · **Origin:** Established (earnings IV-crush trade; short straddle/fly with wings)

## Summary
Single-stock implied volatility inflates before earnings and collapses immediately after; when the options market habitually overprices a specific name's earnings move (implied move > its own historical average realized move), sell the event premium with a defined-risk iron butterfly opened just before the release and closed at the next open. Strictly instrument-by-instrument: some names systematically overprice, others underprice — the pre-trade screen IS the strategy. Loser: event-lottery buyers in habitual overpricers.

## Possible instruments
- Liquid optionable large-caps with weekly chains and >= 8 quarters of history

## Entry rules
1. Screen: implied move (front straddle / price) >= 1.3x the median realized earnings move of the last 8 quarters.
2. Structure: ATM iron fly (sell straddle, buy wings at the implied-move distance), opened in the final hour before the announcement.
3. Size so max loss (wing width - credit) <= a fixed small fraction of equity.

## Exit rules
1. Close the whole structure in the first 30 minutes after the next session's open (crush captured or not).
2. Never hold past that window; never adjust.

## Pseudocode
```
if implied_move >= 1.3*median(realized_moves, 8q):
    at T-1h: sell ATM straddle + buy wings @ +/- implied_move
next open + 30min: close all legs
```
