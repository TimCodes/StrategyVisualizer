# 010 — Linear Regression Slope Trend

**Category:** Trend following · **Origin:** Established (statistical trend measurement, common in CTA research)

## Summary
Define the trend as the slope of a rolling linear regression on log prices, annualized and multiplied by R-squared so that only clean trends qualify — a steep but noisy fit is treated as no trend. This replaces the subjective "is it trending?" with a statistic and systematically avoids the high-volatility chop that damages moving-average systems. Loser: participants who confuse volatility with direction.

## Possible instruments
- Stock universes for rotation (rank by slope x R2)
- Index/commodity ETFs and futures, daily bars

## Entry rules
1. Compute 90-day linear regression on ln(close): annualized slope and R2.
2. Score = annualized_slope x R2. Long when score crosses above +0.4 (tune per asset class at the walk-forward stage).
3. Rotation form: hold the top-N instruments by score, refreshed monthly.

## Exit rules
1. Exit when score drops below +0.1, or the instrument leaves the top-N at rebalance.
2. Crash brake: exit all on close below EMA(100) for the portfolio benchmark.

## Pseudocode
```
each day:
  slope, r2 = linreg(log(close), 90)
  score = (exp(slope*252)-1) * r2
  if flat and score crosses_above 0.4: buy
  if long and score < 0.1: sell
```
