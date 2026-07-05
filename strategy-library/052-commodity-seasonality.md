# 052 — Commodity Calendar Seasonality

**Category:** Calendar / commodity · **Origin:** Established (production/consumption cycle seasonality; Moore Research legacy)

## Summary
Physical commodities carry consumption and production calendars — gasoline demand builds into summer driving season, natural gas into winter, grains around planting/harvest — and futures prices exhibit recurring seasonal windows tied to hedger behavior around those cycles. Trade a small set of well-motivated windows (e.g. long RBOB Feb-Apr; long natural gas late summer) with strict stops, and require each window to justify itself physically, not just statistically. Loser: commercial hedgers paying a seasonal insurance premium — a *documented, structural* counterparty.

## Possible instruments
- Futures/micros: RBOB/gasoline, natural gas, heating oil, corn, soybeans
- Commodity ETFs (UNG, USO, CORN) accepting roll drag

## Entry rules
1. Maintain a whitelist of seasonal windows, each with a stated physical mechanism.
2. Enter at the window's start date only if price confirms (e.g. above 50-day SMA — seasonality as tailwind, not sole reason).
3. One unit per window; no averaging down.

## Exit rules
1. Exit at the window's end date regardless of P&L.
2. Stop 2.5x ATR(20); a stopped window stays closed until next year.

## Pseudocode
```
for w in seasonal_windows:                # e.g. {RB: Feb10..Apr20, ...}
  if today == w.start and close > SMA(close,50):
      buy; stop = close - 2.5*ATR(20)
  if today == w.end or close <= stop:
      sell
```
