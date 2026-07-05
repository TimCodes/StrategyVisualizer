# 074 — Gap-and-Go Continuation

**Category:** Intraday momentum / event · **Origin:** Established (canonical day-trading setup with statistical support in gap studies)

## Summary
A large overnight gap up on real news and heavy pre-market volume marks genuine repricing; if early trade holds above the open, the day tends to continue in the gap's direction as under-positioned participants chase and shorts cover. Trade the continuation, not the gap itself. Loser: the reflexive gap-fader treating every gap as an overreaction, and trapped shorts from the prior day. The volume/news filter is what separates this from noise gaps (which favor strategy 028's fade).

## Possible instruments
- Liquid stocks gapping >= 3% on identifiable catalysts, relative volume >= 3x
- QQQ/index futures for the milder index version

## Entry rules
1. Gap >= +3% with a catalyst (earnings, upgrade, contract) and pre-market volume elevated.
2. Wait for the first 5-minute opening range; buy the break of its high IF price has held above the session open.
3. Skip if the gap exceeds ~12% (exhaustion risk dominates).

## Exit rules
1. Stop below the opening-range low.
2. Scale half at +1R; trail the rest on 5-minute higher lows or VWAP loss; flat by close.

## Pseudocode
```
if gap >= 3% and has_catalyst and relvol >= 3:
  or5 = first_5min_range
  if price > open and break(or5.high): buy; stop = or5.low
manage: half off @ +1R; trail 5m swing lows; flatten at close
```
