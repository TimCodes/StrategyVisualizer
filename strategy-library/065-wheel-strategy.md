# 065 — The Wheel (CSP -> Assignment -> Covered Call Cycle)

**Category:** Options / premium income cycle · **Origin:** Established (retail-canonical combination of PUT and BXM logic)

## Summary
Continuously sell cash-secured puts on a name you want to own; if assigned, switch to selling covered calls against the shares until they are called away, then repeat. Every state of the cycle collects premium. It is 059+060 with a state machine, and it inherits their risk: the premium never covers a true crash, and the discipline test is continuing to sell calls on shares underwater. Loser: both-side optionality buyers.

## Possible instruments
- Quality large-caps/ETFs you would hold anyway (the sincerity test is the strategy's core risk filter)

## Entry rules
1. State FLAT: sell 30-delta, 30-45 DTE cash-secured put.
2. State ASSIGNED (own shares): sell 30-delta covered call, 30-45 DTE, strike no lower than assignment basis if possible.
3. Only run the wheel on names above their 200-day SMA at cycle start.

## Exit rules
1. Puts/calls: take profit at 50% of premium; otherwise let exercise/assignment move the state.
2. Abort the wheel (sell shares, stop) if the name closes 20% below assignment basis — the premium cycle has lost to the trend.

## Pseudocode
```
state FLAT:    sell CSP(30d, 30-45dte); on assignment -> HOLDING
state HOLDING: sell CC(30d, 30-45dte, strike >= basis); on call-away -> FLAT
any option at 50% profit: close and re-issue
if HOLDING and price < 0.8*basis: liquidate, stop wheel
```
