# 095 — Dividend Run-Up Recycler

**Category:** Calendar / flow · **Origin:** NOVEL-variant — original packaging (the ex-dividend run-up anomaly is documented; the retail-ownership filter and strict recycling calendar are the original elements)

## Summary
Dividend-seeking flow buys in ahead of ex-dividend dates, producing a documented pre-ex-date run-up — then the price drops by roughly the dividend and the yield-chasers churn out. Buy N days before ex-date and sell the day BEFORE ex-date: collect the run-up, never the dividend (avoiding the drop and the tax event). Filter for names where dividend-capture flow is largest: high headline yield and high retail ownership. Loser: the dividend-capture crowd itself, which buys later than you and holds through the mechanically bad day.

## Possible instruments
- High-yield, high-retail-visibility names (utilities, telecom, REITs) with liquid trade
- Skip: names announcing dividends irregularly (no calendar to front-run)

## Entry rules
1. Universe: yield >= 4%, regular payment history >= 3 years, adequate liquidity.
2. Buy at the close 5 trading days before the ex-dividend date.
3. Skip if earnings fall inside the hold window.

## Exit rules
1. Sell at the close of the last cum-dividend day (the day before ex-date). Never hold through ex-date.
2. Stop: -2x ATR from entry (event window doesn't justify wide risk).

## Pseudocode
```
for s in dividend_calendar:
  if days_to_ex(s) == 5 and yield(s) >= 4% and no_earnings_in_window:
      buy at close; stop = close - 2*ATR
  if days_to_ex(s) == 1: sell at close
```
