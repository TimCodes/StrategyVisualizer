# 059 — Systematic Covered Calls (Buy-Write)

**Category:** Options / volatility premium · **Origin:** Established (CBOE BXM index methodology; decades of data)

## Summary
Own the index ETF and sell one-month covered calls against it, harvesting the volatility risk premium — implied volatility systematically exceeds realized because hedgers and speculators overpay for optionality. You accept capped upside for steady premium income; drawdowns still hurt (the short call barely offsets crashes). Loser: the systematic buyer of short-dated upside (speculators paying for lottery exposure).

## Possible instruments
- SPY/QQQ + monthly options (the BXM template)
- Liquid single names for higher premium and higher risk

## Entry rules
1. Hold the underlying continuously.
2. Each monthly expiration, sell the ~30-delta call, 30 days out (BXM classic uses ATM; 30-delta trades upside capture for fewer assignments).
3. Roll early only if the call's delta > 0.8 (deep ITM — roll up and out once).

## Exit rules
1. Let expire worthless or be assigned (then immediately re-buy and re-sell).
2. Underlying exit only via a separate regime rule if desired (e.g. 200-day SMA de-risk).

## Pseudocode
```
hold underlying
monthly at expiration:
  sell call(delta ~= 0.30, dte ~= 30)
if call.delta > 0.8: roll up+out once
at expiry: settle; repeat
```
