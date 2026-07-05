# 019 — Residual (Idiosyncratic) Momentum

**Category:** Momentum / factor-neutral · **Origin:** Established (Blitz, Huij & Martens 2011)

## Summary
Rank stocks by the momentum of their residual returns — what remains after stripping out market and sector beta via regression — so you buy stocks winning on their own news, not stocks that merely levered a rising market. Residual momentum historically retains most of momentum's return with far smaller crash risk, because the crash lives in the beta component. Loser: the same under-reacting crowd, minus the beta whipsaw.

## Possible instruments
- Liquid single-stock universe with a benchmark and sector indices for the regression

## Entry rules
1. For each stock, regress 36 months of returns on market (and optionally sector) returns.
2. Score = mean(residual, last 12 months excl. last month) / std(residual, same window).
3. Monthly: hold the top 20 by score, equal weight.

## Exit rules
1. Monthly rotation out of the cohort.
2. Optional index-level bear filter as in other rotation systems.

## Pseudocode
```
monthly, for s in universe:
  resid = returns(s) - beta(s)*returns(mkt)      # 36m rolling regression
  score[s] = mean(resid[-12:-1]) / std(resid[-12:-1])
rebalance_to(equal_weight(top_n(score, 20)))
```
