# 048 — Weekend Weakness / Monday Reversal

**Category:** Calendar / short-term reversion · **Origin:** Established (weekend-effect family, modern reversion form)

## Summary
When Friday-to-Monday action gaps the index down after a weak Friday, buy Monday's weakness for a Tuesday-Wednesday bounce. The historical "weekend effect" (negative Monday returns) has decayed, but its residue is exploitable as reversion: weekend news digestion and retail sell orders queued over the weekend hit Monday's open, and that concentrated, price-insensitive flow tends to overshoot. Loser: the weekend worrier selling Monday's open.

## Possible instruments
- SPY/ES, QQQ/NQ; European indices at their Monday opens

## Entry rules
1. Friday closed down AND Monday opens gap-down >= 0.5%.
2. Bull regime filter: above 200-day SMA.
3. Buy Monday at the close (let the day's selling finish), or scale half at open / half at close.

## Exit rules
1. Exit at Wednesday's close, or earlier on any close above Friday's close.
2. Stop: 2.5x ATR(14) below entry.

## Pseudocode
```
if weekday == Mon and fri_ret < 0 and open <= fri_close*0.995 and close > SMA(close,200):
    buy at close; stop = close - 2.5*ATR(14)
if long and (close > fri_close or weekday == Wed at close): sell
```
