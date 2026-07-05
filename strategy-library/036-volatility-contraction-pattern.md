# 036 — Volatility Contraction Pattern (VCP) Breakout

**Category:** Breakout / swing · **Origin:** Established (Mark Minervini's VCP; Wyckoff lineage)

## Summary
Buy breakouts from a series of successively tighter pullbacks on declining volume — each contraction shakes out a weaker tranche of holders until supply is exhausted, so the eventual breakout meets little resistance. This is supply-absorption logic rather than pure momentum. Loser: the shaken-out weak holder who sells the final tight pullback, and the short seller leaning on a level with no supply left behind it.

## Possible instruments
- Growth stocks with institutional sponsorship (primary habitat)
- Liquid ETFs form a milder version

## Entry rules
1. Stock in an uptrend (price > 150/200-day MAs, both rising).
2. Detect 2-4 successive pullbacks with contracting depth (e.g. 15%, then 8%, then 4%) and contracting volume.
3. Buy stop above the final contraction's high; require breakout-day volume > 1.5x average.

## Exit rules
1. Initial stop below the final contraction's low (typically 4-8% risk).
2. Sell half into strength at +20-25%; trail the rest below the 50-day SMA.

## Pseudocode
```
contractions = detect_pullbacks(depth_decreasing, vol_decreasing, count>=2)
pivot = last_contraction.high
if flat and uptrend and price crosses_above pivot and vol > 1.5*avg_vol:
    buy; stop = last_contraction.low
if long: scale_out at +22%; trail stop = SMA(close,50)
```
