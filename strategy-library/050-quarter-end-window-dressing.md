# 050 — Quarter-End Window Dressing Fade/Ride

**Category:** Calendar / institutional flow · **Origin:** Established (window-dressing literature; quarter-end rebalancing studies)

## Summary
Institutions buy the quarter's winners into quarter-end (to show them in reports) and sell them in the first days of the new quarter, creating a ride-then-fade pattern in the top momentum names. Two-leg trade: hold the quarter's winners the final 3-4 sessions, flip to reduce/avoid them the first 2-3 sessions of the new quarter. Loser: report-driven institutional flow paying for appearance, not value.

## Possible instruments
- Top-decile QTD performers among liquid large caps; momentum ETFs as a blunt proxy

## Entry rules
1. Five sessions before quarter-end: buy a basket of the top 10 QTD performers (liquidity-filtered).
2. Equal weight, modest size (this is a flow scalp, not an investment).

## Exit rules
1. Sell the entire basket at the last session's close of the quarter.
2. Optional second leg: stand aside (or short against a hedge, where permitted) for the first 3 sessions of the new quarter, then done.

## Pseudocode
```
if sessions_to_quarter_end == 5:
    basket = top_n(QTD_return, 10, liquid=True); buy basket
if last_session_of_quarter: sell basket at close
```
