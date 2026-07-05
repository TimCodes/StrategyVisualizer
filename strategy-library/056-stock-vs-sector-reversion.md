# 056 — Single Stock vs Sector Relative Reversion

**Category:** Pairs / relative value · **Origin:** Established (residual reversion; classic desk trade)

## Summary
When a quality large-cap underperforms its own sector ETF sharply over a short window without stock-specific news, buy the stock and short the sector against it, betting the residual gap closes. Hedging with the sector removes market and industry moves, isolating the idiosyncratic overshoot. Loser: single-name liquidations (fund exits, index deletions, hedges) executed without regard to relative value. The no-news check is the difference between a trade and a value trap.

## Possible instruments
- Top-3 holdings of liquid sector ETFs vs their ETF (e.g. JPM vs XLF)

## Entry rules
1. Residual return = stock 10-day return minus beta x sector 10-day return; z-score over 1 year.
2. Enter when z < -2 AND no earnings/news in the window and none scheduled within the hold horizon.
3. Long stock, short beta-adjusted sector ETF dollars.

## Exit rules
1. Exit at z >= 0 or after 15 sessions.
2. Stop at z < -3 (information you failed to find is now assumed to exist).

## Pseudocode
```
resid = ret(stock,10) - beta*ret(sector,10)
z = zscore(resid, 252)
if flat and z < -2 and no_news(stock, -10d..+15d):
    long stock, short beta*sector
if open and (z >= 0 or days > 15 or z < -3): close
```
