# 085 — Round-Number Liquidity Trap

**Category:** Behavioral / microstructure · **Origin:** NOVEL — original systematization (round-number clustering is documented in academic microstructure; the two-sided break-then-reclaim trade design is the original element)

## Summary
Limit orders, stops, and option strikes cluster at round numbers (100.00, 50.00, psychologically salient levels). When price pierces a major round number for the first time in months, triggers the stop cluster (visible as a volume/velocity burst), and then *reclaims* the level within the same session, the stop-driven flow has been absorbed — trade in the reclaim direction with the round number as your protective floor. Loser: the stop-cluster crowd whose exits printed at the extreme, plus breakout algos chasing the pierce.

## Possible instruments
- Large-caps near century/half-century marks; index levels (e.g. SPX thousands)
- FX big figures (1.1000 etc.) — the densest round-number habitat

## Entry rules
1. Level: first touch of a major round number in >= 60 sessions.
2. Pierce: intraday move beyond the level by >= 0.25 x ATR with a 1-minute volume spike (> 3x average).
3. Reclaim: price crosses back through the level within the same session and holds for 15 minutes.
4. Enter in the reclaim direction.

## Exit rules
1. Stop: beyond the pierce extreme.
2. Target: 1.5x the pierce depth, or end of next session.

## Pseudocode
```
if first_touch(round_level, 60d) and pierce_depth >= 0.25*ATR and vol_spike:
    if reclaim(level) held 15min:
        enter reclaim direction; stop = pierce_extreme
        target = level + 1.5*pierce_depth (direction-signed)
```
