# 094 — Scheduled-Event Volatility Aftermath

**Category:** Volatility / macro event · **Origin:** NOVEL — original design (FOMC-day vol patterns documented piecemeal; the systematic post-event compression trade across the macro calendar is the original element)

## Summary
After major scheduled macro events (FOMC, CPI, NFP) resolve WITHOUT a large move (realized move < 0.5x what the straddle implied), volatility sellers get aggressive and the following 2-3 sessions historically compress into unusually quiet drift — the event risk premium deflates faster than direction re-emerges. Sell short-dated premium (defined-risk iron fly) the morning after quiet-resolution events only. The event outcome CONDITION is the novelty: the same trade after a violent resolution is a disaster. Loser: hedges maintained after the risk they insured has expired.

## Possible instruments
- SPX/XSP or SPY short-dated defined-risk structures (2-4 DTE)
- Requires an options-approved account; sizes tiny by construction

## Entry rules
1. Event day: capture the implied event move (front straddle) at the prior close.
2. Quiet resolution: event-day realized move < 0.5x implied.
3. Next morning: sell a 2-4 DTE iron fly centered ATM, wings at the (now deflated) implied move.

## Exit rules
1. Close at 50% of credit or at 1 DTE, whichever first.
2. Stop: loss of 1.5x credit (direction emerged after all).

## Pseudocode
```
on event_day: im = straddle/spot (prior close); rm = |event_day_ret|
if rm < 0.5*im:
    next open: sell iron_fly(atm, wings=implied_move, dte 2-4)
close at +50% credit, 1 DTE, or -150% credit
```
