# 051 — FOMC Pre-Announcement Drift

**Category:** Calendar / macro event · **Origin:** Established (Lucca & Moench 2015, Fed research on the pre-FOMC announcement drift)

## Summary
A striking share of the equity premium has historically been earned in the ~24 hours before scheduled FOMC announcements: uncertainty resolution is anticipated, shorts cover, and dealers pre-position. Hold the index from the prior day's close to just before (or through) the 2pm statement. The effect weakened after publication — treat that decay as a live hypothesis for the pipeline to test, not a footnote. Loser: hedgers paying for protection into a scheduled uncertainty peak.

## Possible instruments
- SPY/ES (documented), QQQ/NQ

## Entry rules
1. Buy at the close of the trading day before a scheduled FOMC decision day.
2. No other filters in the base version (event calendar is the entire signal).

## Exit rules
1. Variant A (drift only): sell at 13:45 ET on announcement day, before the statement.
2. Variant B: sell at announcement-day close (includes the reaction — higher variance).
3. Disaster stop -2% intraday.

## Pseudocode
```
if tomorrow is FOMC_decision_day: buy at close
on FOMC day at 13:45 ET (variant A): sell
```
