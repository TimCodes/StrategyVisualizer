# 047 — Halloween Effect (Sell in May)

**Category:** Calendar / seasonality · **Origin:** Established (Bouman & Jacobsen 2002, out-of-sample confirmations since)

## Summary
Nearly all of the long-run equity premium has historically accrued November-April; May-October returns hover near cash. Hold equities in the winter half, rotate to bonds/cash in the summer half. Documented across ~100 markets and centuries of UK data; explanations (vacation-driven attention cycles, flow seasonality) matter less than its cross-market breadth. The "loser" is capital that pays full equity risk year-round for premium that clusters in half the calendar.

## Possible instruments
- SPY/global index ETFs paired with IEF/AGG for the summer leg

## Entry rules
1. Buy the index at the close of the last trading day of October.
2. Optional MACD timing overlay (Sy Harding variant): enter on the first bullish daily MACD cross after Oct 16.

## Exit rules
1. Exit to bonds at the close of the last trading day of April (or first bearish MACD cross after Apr 20 in the timed variant).

## Pseudocode
```
on halloween_window_open (late Oct):  rotate to SPY
on may_window_open (late Apr):        rotate to IEF
```
