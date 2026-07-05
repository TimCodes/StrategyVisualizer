# 022 — Momentum Acceleration (Momentum-of-Momentum)

**Category:** Momentum · **Origin:** Established (documented as "momentum acceleration"/"convexity" in factor literature)

## Summary
Prefer assets whose momentum is strengthening: rank by the difference between recent momentum (6-month) and older momentum (12-month), catching leadership earlier than plain 12-month rankings and exiting before slow-decay names roll over. The mechanism is the growth phase of the under-reaction cycle. Loser: the plain-momentum follower holding decelerating winners whose narrative has peaked.

## Possible instruments
- Stock universes, sector/country ETFs
- Futures/CFDs in a self-vote (time-series) variant

## Entry rules
1. Monthly: accel = ret(126) - ret(252) (both skipping the last 21 days).
2. Require base momentum positive too: ret(126) > 0.
3. Hold top 10-20 by accel among names passing the base test.

## Exit rules
1. Monthly rotation.
2. Exit early if accel turns negative two consecutive checks (deceleration confirmed).

## Pseudocode
```
monthly, for s in universe:
  m6, m12 = ret(s, 126, skip=21), ret(s, 252, skip=21)
  accel[s] = m6 - m12
targets = top_n({s: accel[s] for s if m6 > 0}, 15)
rebalance_to(equal_weight(targets))
```
