# 060 — Systematic Cash-Secured Put Selling

**Category:** Options / volatility premium · **Origin:** Established (CBOE PUT index methodology)

## Summary
Sell one-month cash-secured puts on the index, fully collateralized: harvest the same variance premium as buy-write but from the other side, getting paid to bid where you would buy anyway. Historically the PUT index matched equity returns with lower volatility. The catch: losses concentrate in crashes exactly when everything else falls. Loser: the persistent over-payer for downside insurance (portfolio hedgers).

## Possible instruments
- SPY/SPX monthly puts (PUT index template), QQQ
- Quality single names you genuinely want to own at the strike

## Entry rules
1. Sell the ~30-delta put, 30 days out, fully cash-secured.
2. Vol filter (optional but recommended): only initiate when VIX > its 20th percentile (avoid selling famine premium).
3. Ladder: stagger weekly entries at quarter-size for smoothing.

## Exit rules
1. Take profit at 50% of max premium (documented improvement in risk-adjusted terms), or at expiry.
2. If assigned: accept shares, then run covered calls (see 059/066).
3. Crash discipline: no doubling down after assignment.

## Pseudocode
```
weekly if VIX_pctile > 0.2:
  sell put(delta ~= 0.30, dte ~= 30, size = cash/strike/4)
if put.value <= 0.5*premium_received: buy_to_close
at expiry: if ITM -> take assignment -> switch to covered-call module
```
