# 092 — Institutional Clock Momentum

**Category:** Intraday periodicity · **Origin:** NOVEL — original design (intraday periodicity and execution-scheduling literature exist; the per-stock recurring-window screen is the original element)

## Summary
Institutions execute large parent orders on schedules (VWAP/TWAP slices, often across days at similar clock times). Screen for stocks showing statistically persistent same-direction returns in the same intraday window (e.g. 14:00-15:00) across the last two weeks — the footprint of an unfinished scheduled program — and ride that window in its direction until the pattern breaks. Loser: no one is "wrong"; the counterparty is a benchmark-tracking execution algorithm paying a predictability tax for schedule discipline.

## Possible instruments
- Liquid mid/large-caps (institutional programs, visible footprints)
- Requires intraday (30-min bar) data only — no tape reading

## Entry rules
1. Screen daily: for each stock, each 30-min window, compute the sign consistency of that window's return over the last 10 sessions.
2. Signal: a window with >= 8/10 same-direction days AND cumulative window return >= 1.5x its ATR-scaled noise.
3. Trade: enter at the window's start next session, in the persistent direction.

## Exit rules
1. Exit at the window's end. Always intraday-window-bounded.
2. Retire the signal after 2 consecutive failed windows (program complete).

## Pseudocode
```
for (stock, window) in universe x windows:
  wins = count(sign(ret(window, day_i)) == mode_sign, last 10 days)
  if wins >= 8 and |cum_ret| >= 1.5*noise:
      trade window direction next day, window-bounded
  if failures_in_row >= 2: retire signal
```
