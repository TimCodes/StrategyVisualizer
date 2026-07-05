# 031 — Keltner Lower-Band Bounce

**Category:** Mean reversion · **Origin:** Established (Keltner channel reversion usage)

## Summary
Buy the tag of the lower Keltner band (EMA - 2.5x ATR) in an uptrend and exit at the midline — the ATR-based twin of Bollinger reversion. Because Keltner width uses average range instead of standard deviation, it is steadier in gappy conditions and less prone to band-collapse after quiet spells. Loser: the seller of ATR-sized dips inside structural uptrends.

## Possible instruments
- Liquid equities/ETFs, index futures, FX majors (4h/daily)

## Entry rules
1. Low touches or crosses below EMA(20) - 2.5x ATR(20).
2. Uptrend filter: EMA(50) rising and price above EMA(200).
3. Enter on the close of the touch day, or next open.

## Exit rules
1. Exit at the EMA(20) midline touch.
2. Time stop 8 days; hard stop 1.5x ATR below the band touched.

## Pseudocode
```
mid = EMA(close,20); lowband = mid - 2.5*ATR(20)
each day:
  if flat and low <= lowband and EMA(close,50).rising and close > EMA(close,200):
      buy; stop = lowband - 1.5*ATR(20); exit_day = today + 8
  if long and (close >= mid or today >= exit_day or close <= stop):
      sell
```
