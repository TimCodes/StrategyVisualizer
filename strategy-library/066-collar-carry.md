# 066 — Protective Collar Carry

**Category:** Options / hedged equity · **Origin:** Established (collar literature; zero-cost collar variants)

## Summary
Hold the index, finance a protective put by selling a covered call (near-zero-cost collar): upside capped, downside floored, net position a corridor. The carry comes from equity drift inside the corridor plus the skew premium — puts cost more than calls of equal distance, so the collar's geometry is slightly unfavorable, which is why collars underperform raw equity in calm decades and win in crash-prone ones. This is a risk-transformation strategy, not an alpha claim; test it as a drawdown-control overlay.

## Possible instruments
- SPY/QQQ with quarterly options; single-stock concentration hedging

## Entry rules
1. Hold the underlying; quarterly, buy a 5-10% OTM put and sell an OTM call whose premium funds it (solve strike for ~zero net cost).
2. Prefer initiating when skew is flat (put premium relatively cheap).

## Exit rules
1. Hold the structure to expiry; re-strike quarterly.
2. If the put goes deep ITM (crash), sell it, keep or roll the equity per your regime rule — the hedge paid, bank it.

## Pseudocode
```
quarterly:
  buy put(strike = 0.93*price, 90dte)
  sell call(strike solved so call_premium ~= put_cost, 90dte)
at expiry or crash-monetization event: reset
```
