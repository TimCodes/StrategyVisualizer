# 088 — Implied-Move Overshoot PEAD

**Category:** Event momentum / options-informed · **Origin:** NOVEL — original combination (PEAD and IV crush are separately documented; conditioning the drift trade on the options market's forecast error is the original element)

## Summary
Standard PEAD (018) trades all strong earnings reactions. This variant trades only reactions the options market UNDERPRICED: realized announcement move > 1.5x the pre-earnings implied move. When the options market — the best-informed forecaster — is badly wrong, the surprise is genuinely new information, and under-reaction drift should be strongest precisely there. Conversely, moves smaller than implied are already-priced noise. Loser: the under-reacting analyst/investor crowd, filtered to the events where under-reaction is most probable.

## Possible instruments
- Optionable US large/mid-caps with weekly options (for implied-move measurement)

## Entry rules
1. Before earnings: implied move = ATM straddle price / stock price (nearest expiry).
2. After: realized move (announcement-day return) >= 1.5x implied move AND in the earnings-beat direction with volume.
3. Enter at the reaction day's close, direction of the move.

## Exit rules
1. Hold 20-40 sessions (PEAD horizon); exit before the next earnings.
2. Stop: reaction-day midpoint. Exit early if price closes below the reaction-day low (drift thesis dead).

## Pseudocode
```
im = straddle_atm / price          # captured pre-announcement
rm = |announcement_day_return|
if rm >= 1.5*im and direction == surprise_direction:
    buy at close; stop = (day_high+day_low)/2
    exit at 30 sessions or close < day_low
```
