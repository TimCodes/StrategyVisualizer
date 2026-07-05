# 100 — Capitulation-Anchored VWAP Reclaim

**Category:** Behavioral / anchored volume structure · **Origin:** NOVEL-variant — original systematization (anchored VWAP is a known discretionary tool — Brian Shannon; the capitulation-anchor selection rule and reclaim trigger as a system are the original elements)

## Summary
Anchor a VWAP at a stock's capitulation low (the highest-volume down day of the past year) — that anchor tracks the average price of every share bought since the panic. While price is below it, the average post-capitulation buyer is underwater and sells rallies at breakeven; when price RECLAIMS the anchored VWAP and holds, that overhead supply is exhausted and the path is clear. Buy the reclaim. Loser: the breakeven-anchored bagholder whose final selling builds the base, and shorts pressing a level with no supply left behind it.

## Possible instruments
- Single stocks 6-18 months after a > 40% decline with an identifiable capitulation day
- Sector ETFs after crashes (milder signal)

## Entry rules
1. Anchor: the highest-volume down day in the trailing 252 sessions with price down >= 30% from the prior high.
2. Compute AVWAP from that day forward.
3. Trigger: first daily close above AVWAP after >= 60 sessions below it, confirmed by a second close above within 3 sessions and volume > average.

## Exit rules
1. Stop: 1 ATR below the AVWAP at entry.
2. Exit on a weekly close back below AVWAP, or trail the 50-day SMA once +20%.

## Pseudocode
```
anchor = argmax(volume | down_day, 252) where drawdown >= 30%
avwap = vwap_from(anchor)
below_time = sessions(close < avwap)
if below_time >= 60 and close > avwap and confirm_within(3) and vol > avg:
    buy; stop = avwap - ATR(20)
if long and weekly_close < avwap: sell
```
