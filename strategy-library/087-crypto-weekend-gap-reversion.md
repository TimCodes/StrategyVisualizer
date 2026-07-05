# 087 — Crypto Weekend Dislocation Reversion

**Category:** Session structure / crypto · **Origin:** NOVEL — original design (crypto weekend-effect studies exist; the Monday-TradFi-open anchored reversion design is the original element)

## Summary
Crypto trades 24/7 but its institutional liquidity (ETF flows, CME futures, market-maker balance sheets) keeps banker's hours. Weekend moves happen in a thin, retail-dominated book; when Monday's traditional-finance session opens, institutional liquidity re-prices the weekend's excess. Fade large weekend displacements at the Monday TradFi open, targeting the Friday-close anchor. Loser: weekend retail momentum flow trading against no institutional counterparty, then meeting one on Monday.

## Possible instruments
- BTC and ETH spot (major exchanges), or their CME micro futures at the Monday open
- Only majors — thin alts' weekend moves are often information

## Entry rules
1. Weekend displacement: price at Monday 09:30 ET differs from Friday 16:00 ET close by >= 4%.
2. No fundamental catalyst over the weekend (protocol events, ETF news, macro).
3. Fade the displacement direction at Monday 09:30-10:30 ET.

## Exit rules
1. Target: 50% retracement toward the Friday close.
2. Stop: displacement extends another 2%. Time stop: Tuesday 16:00 ET.

## Pseudocode
```
disp = px(Mon 09:30) / px(Fri 16:00) - 1
if |disp| >= 0.04 and no_weekend_catalyst:
    enter opposite to disp at Mon open window
    target = px(Fri 16:00) + 0.5*disp*px(Fri)   # half-way back
    stop = extension of 2%; expire Tue 16:00
```
