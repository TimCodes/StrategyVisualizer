# 068 — FX Carry Basket

**Category:** Carry / macro · **Origin:** Established (forward-premium puzzle literature; G10 carry factor)

## Summary
Borrow (short) low-interest-rate currencies and lend (long) high-rate currencies, harvesting the rate differential that uncovered interest parity says shouldn't persist but empirically does. The premium is compensation for crash risk: carry pairs melt up slowly and crash together in risk-off ("up the stairs, down the elevator"), so a vol/regime brake is not optional. Loser: textbook UIP believers and, structurally, central-bank/commercial flows that don't optimize returns.

## Possible instruments
- G10 FX pairs/CFDs ranked by short-rate differential (classic: long AUD/NZD-bloc, short JPY/CHF-bloc)
- EM carry (higher premium, fatter tails) for the brave

## Entry rules
1. Monthly: rank G10 currencies by 3-month interest rate; long top 2-3 vs short bottom 2-3, equal risk weights.
2. Regime brake: halve or zero the basket when a vol proxy (VIX or FX vol index) > its 80th percentile.

## Exit rules
1. Monthly re-rank; positions follow the ranking.
2. Basket-level stop: flat everything on a 5% basket drawdown within a month (carry crash signature), re-enter next calm month.

## Pseudocode
```
monthly:
  rank currencies by short_rate
  basket = long top3, short bottom3 (equal vol weights)
  if vol_pctile > 0.8: basket *= 0
  rebalance_to(basket)
if basket_dd_this_month > 5%: flatten until next calm month
```
