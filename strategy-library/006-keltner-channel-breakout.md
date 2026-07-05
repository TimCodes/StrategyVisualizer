# 006 — Keltner Channel Breakout

**Category:** Trend following / volatility breakout · **Origin:** Established (Chester Keltner; Linda Raschke variant)

## Summary
Buy a close outside the upper Keltner channel (EMA plus a multiple of ATR), treating an ATR-normalized excursion as evidence of genuine initiative buying rather than noise. Because the band width adapts to volatility, the same rule set travels across instruments better than fixed-percent envelopes. Losers: range traders fading what they perceive as an overextension that is actually the start of a trend leg.

## Possible instruments
- Futures/CFDs on indices, energy, metals
- FX majors (4h/daily), liquid ETFs, BTC/ETH

## Entry rules
1. Channel: EMA(20) +/- 2.25x ATR(20).
2. Long on the first close above the upper band with rising EMA(20).
3. Confirmation: today's range > ATR(20) (real participation, not drift).

## Exit rules
1. Exit on a close below the channel midline (EMA 20).
2. Initial stop at the midline level at entry time; never widen.

## Pseudocode
```
mid = EMA(close,20); up = mid + 2.25*ATR(20)
each bar:
  if flat and close > up and mid > mid[1] and (high-low) > ATR(20):
      buy; stop = mid
  if long and close < EMA(close,20):
      sell
```
