# 081 — Gap Budget Exhaustion Fade

**Category:** Mean reversion / overnight flow · **Origin:** NOVEL — original design (gap-fade components documented; the cumulative "gap budget" trigger is the original element)

## Summary
Track a rolling "gap budget": the sum of same-direction overnight gaps over the last N sessions, normalized by ATR. When a market has spent an extreme cumulative budget (e.g. 3+ ATRs of down-gaps in two weeks) and gaps down yet again, fade that final gap — repeated same-direction gapping exhausts the marginal overnight seller, and the *sequence* is the signal, not any single gap. Loser: the overnight headline-reactor selling into an already-exhausted theme, and stop-loss clusters triggered at each successive gap open.

## Possible instruments
- Index ETFs/futures (SPY/ES, QQQ/NQ), liquid country ETFs
- Large-caps in news storms (extra risk — prefer indices)

## Entry rules
1. GapBudget = sum over last 10 sessions of (open - prior close) where negative, divided by ATR(20).
2. Trigger: GapBudget <= -3.0 AND today gaps down another >= 0.3 x ATR.
3. Uptrend or neutral regime only (price within 10% of its 200-day SMA or above). Buy the first 30-minute close above the opening print.

## Exit rules
1. Target: prior close (gap fill) or +1.5x ATR, whichever first.
2. Stop: 1x ATR below the open. Time stop 3 sessions.

## Pseudocode
```
budget = sum(min(open[i]-close[i+1], 0) for i in 0..9) / ATR(20)
if budget <= -3 and open <= prev_close - 0.3*ATR(20) and regime_ok:
    wait 30min; if price > open: buy
    stop = open - ATR(20); target = prev_close; expire = 3 days
```
