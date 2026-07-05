# 078 — Overnight Drift (Close-to-Open Premium)

**Category:** Session anomaly · **Origin:** Established (overnight/intraday return decomposition — well-documented that most equity premium accrues overnight)

## Summary
Decades of data show US equity index returns accrue disproportionately close-to-open, while intraday (open-to-close) is roughly flat: overnight bears earnings releases, global information flow, and a structural risk premium for holding through the closed market. Hold the index only overnight — buy the close, sell the open — with a regime and cost filter. The loser is the intraday-only crowd collectively paying the overnight premium to whoever carries the gap risk. Trading costs are the entire battle here: this must be tested net.

## Possible instruments
- SPY/QQQ via MOC/MOO orders; index futures (cheaper round trips)

## Entry rules
1. Buy at each session's closing auction.
2. Filters that historically concentrate the edge: skip when VIX > 30; optional skip after a > +1.5% intraday rally (mean-reversion drag).

## Exit rules
1. Sell at the next session's opening auction. Every day. No holds through the session.

## Pseudocode
```
daily at close:  if VIX <= 30: buy MOC
daily at open:   sell MOO
```
