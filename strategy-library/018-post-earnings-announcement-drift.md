# 018 — Post-Earnings Announcement Drift (PEAD)

**Category:** Momentum / event-driven · **Origin:** Established (Ball & Brown 1968; one of the oldest documented anomalies)

## Summary
Stocks that beat earnings expectations with a strong positive announcement-day reaction continue to drift upward for weeks, because investors and analysts under-react to the information and revise slowly. Enter after the reaction, in its direction. The loser is the anchored holder who sells "into strength" immediately and the analyst community whose staggered upgrades feed the drift. Requires an earnings calendar and consensus data — both retail-accessible.

## Possible instruments
- US single stocks with analyst coverage (mid/large cap)
- Optionable names allow a defined-risk call-spread variant

## Entry rules
1. Earnings released; EPS surprise > +5% vs consensus AND announcement-day return > +3% on above-average volume.
2. Buy at the close of the announcement-reaction day (not intraday).
3. Skip if the stock gapped more than +15% (drift already crowded out).

## Exit rules
1. Time exit: 30-45 trading days after entry (before the next earnings).
2. Stop: close below the announcement-day low.

## Pseudocode
```
on earnings_day(s):
  if surprise(s) > 0.05 and day_ret(s) > 0.03 and volume > 1.5*avg_vol and gap < 0.15:
      buy at close; stop = today.low; exit_day = today + 40
if long and (today >= exit_day or close < stop): sell
```
