# 028 — Gap-Down Reversion in an Uptrend

**Category:** Mean reversion / overnight · **Origin:** Established (gap-fade literature; Connors variants)

## Summary
Buy a meaningful down-gap open in a stock or ETF that remains in a long-term uptrend, targeting partial or full gap fill. Overnight gaps in otherwise healthy names are frequently liquidity events — margin desks, overseas headlines, index flows — rather than durable repricings, and intraday liquidity refills them. Loser: the holder whose overnight stop-market order sells the open print. Avoid earnings gaps: those ARE durable repricings.

## Possible instruments
- Liquid large-caps and sector ETFs
- Index futures (small, frequent gaps)

## Entry rules
1. Open gaps down 1-3% below yesterday's low (beyond 4%, skip — news too real).
2. Uptrend intact: yesterday's close above the 200-day SMA.
3. No earnings/scheduled news for this name today.
4. Buy in the first 30 minutes once price trades back above the opening print.

## Exit rules
1. Target: yesterday's close (full gap fill) — take it same day.
2. Stop: below the day's opening range low. Exit at market close either way (no overnight hold).

## Pseudocode
```
at open:
  gap = open/prev_low - 1
  if -0.03 < gap < -0.01 and prev_close > SMA(close,200) and not earnings_today:
      wait for price > open; buy
      target = prev_close; stop = day_low_so_far
at close: flatten
```
