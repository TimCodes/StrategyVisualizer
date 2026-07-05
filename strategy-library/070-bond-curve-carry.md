# 070 — Bond Carry & Roll-Down

**Category:** Carry / rates · **Origin:** Established (curve carry literature; "riding the yield curve")

## Summary
Hold the maturity segment where yield plus roll-down (the price gain as a bond ages down a steep curve) is highest, switching to short-duration when the combined carry is negative or the curve inverts. In a steep curve, an intermediate bond earns its yield AND appreciates as it rolls toward lower-yield maturities. Loser: static duration allocations that ignore where the curve pays. Rate regime changes are the risk — hence the trend overlay.

## Possible instruments
- Treasury ETFs by maturity (SHY 1-3y, IEI 3-7y, IEF 7-10y, TLT 20y+)
- Bond futures (ZT/ZF/ZN/ZB) for direct expression

## Entry rules
1. Monthly: estimate carry+roll for each segment = yield + (yield_curve_slope x duration_roll).
2. Hold the segment with the highest positive score; if all negative or curve inverted (10y-2y < 0), hold T-bills.
3. Trend confirmation: segment ETF above its own 10-month SMA.

## Exit rules
1. Monthly rotation.
2. Mid-month exit only if the held ETF closes 2% below its 10-month SMA.

## Pseudocode
```
monthly, for seg in segments:
  score[seg] = yield[seg] + slope_at(seg)*roll_duration[seg]
best = argmax(score)
hold(best if score[best] > 0 and price(best) > SMA10m(best) else BIL)
```
