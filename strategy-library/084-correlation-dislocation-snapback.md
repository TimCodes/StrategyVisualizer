# 084 — Correlation Dislocation Snapback

**Category:** Statistical / relative value · **Origin:** NOVEL — original design (pairs logic documented; using the correlation LEVEL COLLAPSE itself as the no-news trigger is the original element)

## Summary
Monitor each stock's rolling 20-day correlation to its own sector. When a historically tight correlation suddenly collapses (e.g. from 0.8 to below 0.2) WITHOUT stock-specific news — no earnings, no filings, no headlines — the dislocation is most likely flow-driven (a fund liquidation, an index reconstitution leak, a fat hedge) rather than informational, and the stock should re-couple to its sector. Trade the re-coupling with a sector hedge. Loser: the price-insensitive liquidator who decoupled the stock from its natural co-movement.

## Possible instruments
- Top-10 constituents of liquid sector ETFs vs their sector ETF

## Entry rules
1. Baseline: 1-year median 20-day correlation to sector >= 0.6.
2. Trigger: current 20-day correlation < 0.2 (collapse) and the stock UNDERPERFORMED the sector by > 2 ATR over the collapse window.
3. News check: no earnings/8-K/major headlines in the window and none scheduled for 10 sessions.
4. Long stock, short beta-weighted sector dollars.

## Exit rules
1. Exit when 20-day correlation recovers above 0.5, or after 20 sessions.
2. Stop: relative underperformance extends another 1.5 ATR (information you missed is assumed).

## Pseudocode
```
c = corr(ret(stock), ret(sector), 20)
if median_c(252) >= 0.6 and c < 0.2 and rel_underperf > 2*ATR and no_news:
    long stock, short beta*sector
if c > 0.5 or days > 20 or rel_underperf grows 1.5*ATR: close
```
