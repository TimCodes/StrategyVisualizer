# 023 — RSI(2) Pullback in an Uptrend

**Category:** Mean reversion · **Origin:** Established (Larry Connors & Cesar Alvarez, "Short Term Trading Strategies That Work")

## Summary
In a long-term uptrend, buy the panic: a 2-period RSI under 10 marks a multi-day washout that in liquid index products has historically resolved upward within days. The mechanism is short-horizon overreaction — leveraged and emotional sellers dump into weakness inside a structurally rising market, and their liquidation is your entry. Loser: the stop-loss seller at the local extreme. The regime filter is essential: the same signal in a downtrend is catching knives.

## Possible instruments
- Index ETFs (SPY, QQQ, IWM) — the documented home of the edge
- Liquid large-caps; index futures/micro futures

## Entry rules
1. Close above the 200-day SMA (bull regime).
2. RSI(2) closes below 10 (aggressive: 5).
3. Buy at the close (the edge decays if you wait for next open confirmation).

## Exit rules
1. Exit at the close when RSI(2) crosses above 65, or price closes above the 5-day SMA.
2. Time stop: exit after 7 trading days regardless.
3. No hard price stop in the classic version — position size small instead (this is the known controversial feature; the walk-forward stage should test both).

## Pseudocode
```
each day:
  if flat and close > SMA(close,200) and RSI(close,2) < 10:
      buy at close; entry_day = today
  if long and (RSI(close,2) > 65 or close > SMA(close,5) or days_held >= 7):
      sell at close
```
