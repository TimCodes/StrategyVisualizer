# 062 — Defined-Risk Iron Condor Premium

**Category:** Options / volatility premium · **Origin:** Established (standard income structure; short strangle with wings)

## Summary
Sell an out-of-the-money put spread and call spread on the index simultaneously, collecting premium if price stays inside the short strikes. The edge is the same variance premium as 059/060 but with hard-capped tails — the wings convert steamroller risk into a known worst case. Profitability is a grind: many small wins, occasional full-width losses; management rules dominate outcomes. Loser: directional lottery-ticket buyers on both sides.

## Possible instruments
- SPX/XSP (cash-settled, no early assignment) or SPY/QQQ
- Liquid single names only with wide, active chains

## Entry rules
1. Initiate at 30-45 DTE when IV rank > 30 (only sell premium when it is rich vs its own year).
2. Short strikes near 15-delta each side; wings 5-10 points beyond (risk appetite).
3. Skip entries spanning scheduled binary events (FOMC/CPI within the tenor) or accept and size down.

## Exit rules
1. Take profit at 50% of max credit.
2. Manage at 21 DTE regardless (gamma risk accelerates) — close or roll.
3. Stop: close the tested side when the position shows a loss of 1.5-2x credit received.

## Pseudocode
```
if IVrank > 30 and dte_target in 30..45:
    sell put_spread(15d short, wing) + call_spread(15d short, wing)
if pnl >= 0.5*credit: close
if dte <= 21: close
if loss >= 2*credit: close
```
