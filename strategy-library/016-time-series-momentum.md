# 016 — Time-Series Momentum (TSMOM)

**Category:** Momentum / managed futures style · **Origin:** Established (Moskowitz, Ooi & Pedersen 2012)

## Summary
For each instrument independently, go long if its own trailing 12-month excess return is positive, short (or flat) if negative, with positions scaled inversely to volatility. Unlike cross-sectional momentum there is no ranking — each market votes on itself, which diversifies across dozens of lowly-correlated trend bets. The documented loser is the hedger and the under-reacting investor in each individual market; volatility scaling is what makes the portfolio's risk roughly constant.

## Possible instruments
- Diversified futures/CFD set: equity indices, bonds, FX, energy, metals, agriculture
- ETF proxy version for long-only accounts (skip the shorts)

## Entry rules
1. Monthly per instrument: signal = sign(return over last 252 days minus cash return).
2. Position size = (target_vol / instrument_vol) x signal, instrument_vol = 60-day realized, capped per market.
3. Long-only variant: signal < 0 means flat, not short.

## Exit rules
1. Re-evaluate monthly; flip or flatten when the 12-month sign changes.
2. Portfolio-level volatility cap: scale everything down if aggregate vol exceeds target.

## Pseudocode
```
monthly, for m in markets:
  sig = sign(ret(m, 252) - ret(cash, 252))
  w[m] = sig * (target_vol / realized_vol(m, 60)) / n_markets
scale w so portfolio_vol(w) <= target_vol
rebalance_to(w)
```
