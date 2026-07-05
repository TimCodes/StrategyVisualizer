# 041 — Consolidation Breakout with Volume Dry-Up

**Category:** Breakout / accumulation · **Origin:** Established (Wyckoff/O'Neil lineage; "pocket pivot" adjacent)

## Summary
Buy the breakout from a multi-week flat base only when volume during the base has dried up (sellers exhausted) and the breakout day shows a volume surge (institutional demand arriving). Volume is the tell that separates a real accumulation base from a distribution pause. Loser: bored holders who leave during the quiet base and the shorts pressing into demand.

## Possible instruments
- Single stocks with institutional flows (mid/large-cap growth)
- Less effective on macro ETFs where volume signal is diluted

## Entry rules
1. Base: >= 4 weeks with price range < 15% and no new 20-day lows.
2. Dry-up: 10-day average volume in the base's final week < 60% of the 50-day average.
3. Trigger: close above base high on volume > 1.5x the 50-day average.

## Exit rules
1. Stop below the base midpoint (or 8% max loss, whichever is tighter).
2. Trail below the 50-day SMA once +15%.

## Pseudocode
```
base = flat_range(weeks>=4, width<0.15)
dryup = SMA(vol,10) < 0.6*SMA(vol,50)
if flat and base and dryup and close > base.high and vol > 1.5*SMA(vol,50):
    buy; stop = max(base.mid, close*0.92)
if long and close+15% reached: trail stop = SMA(close,50)
```
