# 046 — Year-End Seasonal Strength Window

**Category:** Calendar / seasonality · **Origin:** Established (Santa Claus rally + January-effect small-cap tilt; documented for decades)

## Summary
Hold equities (with a small-cap tilt) from roughly mid-December through early January: tax-loss selling exhausts itself, window dressing and bonus/contribution flows arrive, and holiday-thinned liquidity lets modest buying move prices. As with all pure calendar trades, the mechanism is a flow schedule, not information. Loser: the tax-loss seller who must realize losses by year-end regardless of price — you buy their December capitulation.

## Possible instruments
- IWM/Russell small caps (strongest historical expression), SPY
- Prior-year "losers" basket variant for the tax-bounce purist

## Entry rules
1. Buy at the close of the 10th-to-last trading day of December.
2. Small-cap tilt: IWM rather than SPY, or a basket of down >30% YTD liquid names (tax-bounce variant).

## Exit rules
1. Sell at the close of the 5th trading day of January.
2. Disaster stop -6% on the position.

## Pseudocode
```
if trading_days_left(year) == 10: buy IWM at close
if trading_day_of_year == 5:      sell at close
```
