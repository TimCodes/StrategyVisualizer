# 075 — First-Hour Range Break

**Category:** Intraday breakout · **Origin:** Established (extended opening-range framework)

## Summary
The first hour builds the day's auction consensus; a decisive afternoon break of the first-hour high/low frequently runs, because it forces repositioning by everyone anchored to the morning's range. Slower cousin of the 15-minute ORB (035): fewer signals, less noise, wider stops. Loser: range-bound scalpers anchored to the morning balance and stop-outs clustered just beyond it.

## Possible instruments
- Index futures/ETFs, liquid large-caps
- Works on European index CFDs with their own session anatomy

## Entry rules
1. Range = high/low of the first 60 minutes.
2. Long on a 5-minute close above the range high after 12:00 exchange time (patience filter — early breaks fail more).
3. Relative volume >= 1.2 on the breakout bar.

## Exit rules
1. Stop: range midpoint.
2. Target 1.5x range height or trail to close; always flat at the bell.

## Pseudocode
```
after 60min: R = session_range
if time > 12:00 and close_5m > R.high and relvol >= 1.2 and no_trade_today:
    buy; stop = R.mid; target = R.high + 1.5*R.height
flatten at close
```
