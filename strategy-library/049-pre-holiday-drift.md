# 049 — Pre-Holiday Drift

**Category:** Calendar / seasonality · **Origin:** Established (Ariel 1990; Lakonishok & Smidt)

## Summary
The single trading day before major exchange holidays has historically shown returns many times the average day: short covering into long weekends, thin liquidity, and a documented positive-mood effect concentrate buying. Hold the index long only for that day. Tiny per-event edge, few events per year — position it as a portfolio garnish and test it honestly against costs. Loser: shorts unwilling to carry positions over a market closure.

## Possible instruments
- SPY/ES and other US index products (documented set: pre-Thanksgiving, pre-Christmas, pre-July-4th, etc.)

## Entry rules
1. Buy at the close two days before an exchange holiday (capturing the full pre-holiday session).
2. Skip if a major macro release lands on the pre-holiday day.

## Exit rules
1. Sell at the pre-holiday session's close.
2. No overnight hold into the holiday itself.

## Pseudocode
```
if is_exchange_holiday(today + 2 trading days):
    buy at close
if is_exchange_holiday(next trading day):
    sell at close
```
