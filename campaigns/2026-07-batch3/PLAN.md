# Batch-3 day plan — regime-filtered calendars vs a disclosed bar

**Date:** 2026-07-22 · **Status:** plan (pre-registration to be locked before any run)

The factory is fully built (v1 phases 0–8, v2 phases 9–15 all complete). Today
is a research day: chase the one thread both prior campaigns pointed at.

## Context — why this campaign

- Campaign #1 (10 candidates) and #2 (6 candidates): **0 survivors of 16**.
  Every classic edge was profitable but none beat the pre-registered
  archetype bars (0.30 mean-reversion / 0.40 rotation ret/DD).
- Campaign #2's real finding: the **200-SMA regime filter fixed the risk
  problem** on calendar strategies — Turn-of-Month drawdown 31%→13.7%,
  Halloween 35%→19.4% — but the return/DD still fell short of 0.30.
- Open question: was 0.30 the right bar for low-exposure calendar systems?
  A strategy in the market ~30% of the time cannot be scored against a
  full-exposure benchmark bar without justification. Batch-3 answers this
  **honestly**: derive the bar from an exposure-matched benchmark, disclose
  the derivation, lock it before any run.

## Rules (unchanged, non-negotiable)

1. Pre-registration locks goals, candidates, and bars **before any backtest**.
2. Every engine run is a trial on the ledger (deflates DSR).
3. No revision of bars after seeing results. If the derived bar turns out
   higher than 0.30, we keep it and say so.
4. All gates on `live_engine` data only.

## Steps

### 1. Housekeeping (~20 min)
- Set crons in `.env`: `BACKUP_CRON=0 3 * * *`,
  `DATA_REFRESH_CRON=0 22 * * 1-5`, `INCUBATION_CRON=0 2 * * *`.
- `npm run data:refresh` so the campaign runs on current bars; confirm
  freshness on `/api/system/status`.
- `npm run db:backup` before the campaign (pre-campaign restore point).

### 2. Pre-registration (lock before any run)
Write `PREREGISTRATION.md` containing, in this order:
- **Benchmark derivation (the new part):** compute buy-and-hold SPY
  return/DD over the campaign window (2005-01-03 → present) — one engine
  run, logged as a trial. The calendar-archetype bar is then
  **bar = max(0.20, 0.75 × exposure-adjusted B&H ret/DD)** where the
  exposure adjustment scales by each candidate's pre-registered fraction
  of days in market. The formula is locked here, before the benchmark run.
- **Candidates (4):**
  1. 045 Turn-of-Month + 200-SMA regime filter (batch-2's best risk profile)
  2. 047 Halloween/Sell-in-May + 200-SMA filter
  3. 046 First-of-Month combined with 045's window (calendar union) + filter
  4. One novel control from the library that is NOT calendar-based, run
     against the standard 0.30 bar — guards against "the lowered bar passes
     everything" criticism.
- **Unchanged bars:** max DD 20%, risk-of-ruin < 10%, ≥ 8 trades/yr,
  min annual return 4%.
- **Gauntlet per candidate:** backtest → feasibility → walk-forward
  (WFE ≥ 0.5) → **CPCV (first campaign to use it; PBO < 0.5)** → trade-level
  Monte Carlo. CPCV grids: the calendar window-length parameters only
  (small grids, 3–5 values), pre-registered here.
- Commit the pre-registration **before** the first run.

### 3. Execution (~2–4 h wall clock, mostly engine time)
- Benchmark run first (fixes the bar numerically; disclose it in a
  pre-registration addendum that records the computed value, not a revision).
- Per candidate: create strategy → lock goals (with the derived bar) →
  link LEAN project → full-period backtest → feasibility → WF → CPCV → MC.
- Stop a candidate at its first hard fail (no gate-shopping); record why.

### 4. Report + close (~1 h)
- `REPORT.md` + `results.json` in this directory, same format as batches 1–2.
- Explicit answer to the campaign question: *do regime-filtered calendars
  clear an honestly-derived exposure-matched bar, or is the edge simply too
  thin at any fair bar?*
- Post-campaign `npm run db:backup`. Commit + push after each stage
  (pre-registration, results, report). Update memory.

### Stretch (only if a candidate passes everything)
- f-sweep → lock sizing plan → start incubation with today's date.

## What we expect (recorded now, so hindsight can't edit it)

Most likely outcome remains 0 survivors — the batch-2 numbers suggest the
filtered calendars land near but below even an exposure-matched bar. The
value either way: a definitive, pre-registered answer that closes the
calendar thread, plus the first CPCV-gated campaign on the ledger.
