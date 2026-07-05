# 072 — Treasury Duration Momentum Rotation

**Category:** Momentum / fixed income · **Origin:** Established (asset-class time-series momentum applied to duration buckets)

## Summary
Apply simple momentum to treasury duration buckets: hold the maturity segment with the strongest trailing return if positive, else T-bills. Bond trends persist because rate cycles are long and central banks telegraph; duration choice is the entire risk decision in treasuries. Loser: static-duration bond funds through rate regime turns (2022 being the canonical example).

## Possible instruments
- SHY / IEF / TLT (short/intermediate/long duration)
- Bond futures ladder for finer control

## Entry rules
1. Monthly: score each of SHY, IEF, TLT by 6-month total return.
2. Hold the best if its score > BIL's return over the same window; else 100% BIL.

## Exit rules
1. Monthly rotation only.

## Pseudocode
```
monthly:
  best = argmax(ret6m over {SHY,IEF,TLT})
  hold(best if ret6m(best) > ret6m(BIL) else BIL)
```
