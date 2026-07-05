# 064 — Elevated Front-Month Calendar Spread

**Category:** Options / term structure · **Origin:** Established (horizontal spread on IV term-structure inversion)

## Summary
When front-month implied volatility trades rich relative to the next month on the same underlying (term-structure inversion around events or stress), sell the expensive front option and buy the cheaper back-month at the same strike. You are short fast-decaying rich premium and long slower cheap premium. Loser: short-horizon hedgers and event gamblers who bid the front month. Best around fear that resolves quietly.

## Possible instruments
- Index options (SPY/SPX/QQQ), liquid single names with clean event calendars

## Entry rules
1. IV(front, ATM) - IV(next, ATM) > 3 vol points (inversion), excluding earnings-driven inversions unless intentionally trading the event.
2. Sell front-month ATM, buy next-month same strike (long calendar), debit paid = max risk.
3. Prefer entry 7-15 days before front expiry.

## Exit rules
1. Close when the spread's value gains 25-40%, or the day before front expiry, whichever first.
2. Close early if price runs > 1 strike-width from the strike (calendar's sweet spot lost).

## Pseudocode
```
if IV_front - IV_next > 3 and not unwanted_earnings:
    buy calendar(strike = ATM, sell front, buy next); risk = debit
if value >= 1.3*debit or dte_front <= 1 or |px - strike| > width: close
```
