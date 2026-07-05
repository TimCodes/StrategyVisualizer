# 020 — Volatility-Scaled Momentum

**Category:** Momentum / risk-managed · **Origin:** Established (Barroso & Santa-Clara 2015; Daniel & Moskowitz 2016)

## Summary
Run a standard momentum portfolio, but scale exposure inversely to the portfolio's own recent realized volatility. Momentum's returns are strongly regime-dependent: crashes occur precisely when momentum-portfolio volatility spikes (bear-market rebounds), so targeting constant volatility roughly doubles the historical Sharpe of raw momentum in the literature. The loser is unchanged; the innovation is refusing to be fully sized when the strategy itself is most fragile.

## Possible instruments
- Overlay on any momentum sleeve (013/014/017)
- Simplest retail form: scale a single momentum ETF sleeve vs cash

## Entry rules
1. Build the base momentum portfolio monthly (e.g. strategy 013).
2. Exposure = min(cap, target_vol / realized_vol_of_strategy(126 days)), e.g. target 12%, cap 150%.
3. Invest exposure fraction in the sleeve, remainder in T-bills.

## Exit rules
1. Recompute exposure monthly (weekly during high-vol periods).
2. Underlying sleeve handles its own rotation exits.

## Pseudocode
```
monthly:
  sleeve = build_momentum_targets()
  vol = realized_vol(strategy_returns, 126)
  expo = clamp(target_vol / vol, 0, 1.5)
  rebalance_to(expo * sleeve + (1-expo) * TBILLS)
```
