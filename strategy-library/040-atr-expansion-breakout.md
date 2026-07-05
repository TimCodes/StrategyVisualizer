# 040 — ATR Expansion Day Breakout

**Category:** Volatility breakout · **Origin:** Established (Crabel-lineage volatility expansion systems; Davey-style build)

## Summary
Enter intraday when price travels a fixed multiple of ATR from the open — a raw expansion trigger with no pattern prerequisite. The premise: a day that has already moved 0.7-1.0x ATR from the open in one direction is statistically likely to close in that direction (range expansion persists intraday). Loser: mean-reversion scalpers fading a genuine expansion day. One parameter, cheap to test honestly.

## Possible instruments
- Index and commodity futures/micros (classic home)
- Liquid ETFs; FX with session-anchored opens

## Entry rules
1. Reference = today's open. Trigger level = open + k x ATR(10) (k around 0.7; walk-forward decides).
2. Buy when price touches the trigger (symmetric short variant below open).
3. One entry per day, per direction; skip days with major scheduled news at the open.

## Exit rules
1. Exit at market close (classic version — captures the close-in-direction tendency).
2. Stop: open - 0.5 x ATR(10) (giving back the expansion invalidates it).

## Pseudocode
```
trigger = open + 0.7*ATR(10)
if intraday_high >= trigger and no_trade_today:
    buy at trigger; stop = open - 0.5*ATR(10)
at session close: flatten
```
