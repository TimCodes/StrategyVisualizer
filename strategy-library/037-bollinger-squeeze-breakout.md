# 037 — Bollinger Squeeze Breakout

**Category:** Volatility breakout · **Origin:** Established (John Bollinger's Squeeze; Carter's TTM variant)

## Summary
Volatility is cyclical: extremely narrow Bollinger bandwidth (a "squeeze") marks energy stored by an agreeing market, and the first directional close outside the bands after a squeeze often launches an outsized move. The squeeze condition — bandwidth at an N-day minimum, or bands inside the Keltner channel — is the filter that distinguishes this from ordinary band breaks. Loser: premium sellers and range traders positioned for the quiet regime to continue.

## Possible instruments
- Liquid equities/ETFs, index futures, FX majors, crypto (any timeframe with stable sessions)

## Entry rules
1. Squeeze: BB(20,2) bandwidth at its lowest in 120 days, or BB inside Keltner(20, 1.5).
2. Trigger: first close above the upper BB after the squeeze condition has been active >= 5 bars.
3. Direction filter optional: take only breaks aligned with EMA(100) slope.

## Exit rules
1. Stop below the squeeze range low.
2. Exit on close back inside the middle band, or trail 2.5x ATR after +2R.

## Pseudocode
```
width = (bb_up - bb_dn) / bb_mid
squeeze = width == lowest(width, 120)
if flat and squeeze_active >= 5 bars and close > bb_up and slope(EMA(close,100)) > 0:
    buy; stop = squeeze_range.low
if long and (close < bb_mid or close <= trail):
    sell
```
