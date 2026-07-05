# 045 — Turn-of-Month Equity Effect

**Category:** Calendar / seasonality · **Origin:** Established (Ariel 1987; Lakonishok & Smidt 1988; persists in recent samples)

## Summary
Equity index returns concentrate in the window from the last 1-2 trading days of the month through the first 3 of the next: pension contributions, payroll 401(k) flows, and month-end institutional rebalancing all buy in the same narrow window regardless of price. Hold the index only during the window; sit in cash otherwise. Loser: no one is "wrong" — the counterparty is a mechanical flow calendar that pays a timing premium to whoever front-runs it politely.

## Possible instruments
- SPY/ES and global index equivalents
- Bond proxy variant exists (flows differ) — test separately

## Entry rules
1. Buy at the close of the 2nd-to-last trading day of each month (T-2).
2. Optional regime filter: skip when index < 200-day SMA (test both — the raw effect historically survived bears).

## Exit rules
1. Sell at the close of the 3rd trading day of the new month (T+3).
2. No stops within the window in the base version (window is the risk control); disaster stop -5% optional.

## Pseudocode
```
if today == last_trading_day(month) - 2:  buy at close
if today == third_trading_day(next month): sell at close
```
