# 097 — Macro Announcement Premium Harvester

**Category:** Calendar / event risk premium · **Origin:** NOVEL-variant — original generalization (the pre-FOMC drift is documented — see 051; extending the harvest across the ranked macro-event calendar with a unified rule is the original element)

## Summary
Equity returns concentrate around scheduled macro announcements (FOMC most famously, but CPI and NFP show related patterns): holding risk into scheduled uncertainty resolution earns a premium from those who de-risk into it. Hold the index ONLY during a rolling window around top-tier scheduled events — from the prior close to the post-announcement close — and sit in T-bills otherwise. The generalization from one event type to the ranked calendar, with identical mechanics, is the design. Loser: the de-risker who systematically sells scheduled uncertainty and buys back after resolution.

## Possible instruments
- SPY/ES with a maintained macro calendar (FOMC, CPI, NFP tiers)

## Entry rules
1. Maintain the event calendar with tiers (Tier 1: FOMC, CPI; Tier 2: NFP, PCE).
2. Buy the index at the close of the day BEFORE each Tier-1 event (Tier 2 optional at half size — test separately).
3. Overlapping windows merge (stay long through clusters).

## Exit rules
1. Sell at the event day's close.
2. Disaster stop -2.5% intraday during the window.

## Pseudocode
```
if tomorrow in tier1_events: buy at close
if today was event day:      sell at close
merge overlapping windows
```
