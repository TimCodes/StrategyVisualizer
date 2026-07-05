# 024 — Bollinger Band Reversion

**Category:** Mean reversion · **Origin:** Established (John Bollinger; reversion usage widely documented)

## Summary
Buy a close below the lower Bollinger band (20, 2) when the band width shows a normal-volatility regime, betting on the statistical pull back toward the moving average. The band defines "too far, too fast" adaptively. The loser is the late momentum seller extrapolating a two-sigma move. Critical nuance: in strong trends price walks along a band — hence the trend filter and the band-width sanity check.

## Possible instruments
- Range-prone ETFs and large-caps, index futures
- FX crosses on 4h/daily (notoriously mean-reverting in ranges)

## Entry rules
1. Close < lower band(20, 2.0).
2. Regime: price above the 200-day SMA (buy dips in bull only), and band width not exploding (width < 2x its 100-day average — avoids crash regimes).
3. Enter at the close or next open.

## Exit rules
1. Exit at the middle band (SMA 20) touch, or
2. Time stop 10 days; hard stop 3x ATR(20) below entry.

## Pseudocode
```
mid = SMA(close,20); sd = STD(close,20)
lower = mid - 2*sd; width = 4*sd/mid
each day:
  if flat and close < lower and close > SMA(close,200) and width < 2*SMA(width,100):
      buy; stop = close - 3*ATR(20); exit_day = today + 10
  if long and (close >= mid or today >= exit_day or close <= stop):
      sell
```
