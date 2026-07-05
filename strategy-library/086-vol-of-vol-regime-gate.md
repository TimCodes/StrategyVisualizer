# 086 — Vol-of-Vol Regime Gate

**Category:** Meta / regime filter as strategy · **Origin:** NOVEL — original design (VVIX exists as an index; using vol-of-vol terciles as the sole on/off gate for a simple trend system is the original element)

## Summary
Run a plain trend system (e.g. 20/100 MA cross on the index) ONLY when volatility-of-volatility is in its bottom tercile. The idea: trend following dies in whipsaw, and whipsaw is precisely a high vol-of-vol phenomenon — the *stability of volatility*, not its level, predicts whether trends can persist. A quiet VIX at 25 is tradeable; a violent VIX at 15 is not. The meta-signal is the strategy; the underlying trend rule is deliberately generic. Loser: trend systems (and their followers) running full-size through unstable-volatility regimes.

## Possible instruments
- SPY/ES with VVIX (or ATR-of-ATR as a universal proxy on any instrument)
- Any trend rule from docs 001-012 as the gated engine

## Entry rules
1. Gate: VVIX (or stdev of daily ATR changes, 20-day) in its bottom tercile of the trailing year.
2. While gated ON: trade the underlying trend rule normally.
3. While gated OFF: hold cash — take no new trend entries.

## Exit rules
1. Underlying rule's exits apply while ON.
2. Gate turning OFF closes nothing by itself but blocks re-entry (existing positions run their course under the rule's exits).

## Pseudocode
```
vv = stdev(diff(ATR(5)), 20)          # or VVIX directly
gate_on = vv <= tercile1(vv, 252)
if gate_on: run trend_system.entries
always:     run trend_system.exits
```
