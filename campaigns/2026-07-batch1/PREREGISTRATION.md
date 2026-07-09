# Campaign #1 — Batch 1 Pre-Registration

**Date locked:** 2026-07-09 (this file is committed BEFORE any batch backtest runs)
**Candidates:** 10 strategies from `strategy-library/` (8 established, 1 novel, 2 re-registrations)

## Goal calibration rule (applies to the whole batch)

Goals are set per **archetype**, anchored to the traded instrument's own
buy-and-hold risk-adjusted profile as the floor — a strategy must meaningfully
beat owning the underlying, not just make money. Reference floors over the
test windows: SPY B&H ≈ 7%/55% DD ≈ **0.13 ret/DD**; 60/40 blend ≈ **0.20**.

| Archetype | minRetDD | minAnnual% | maxDD% | minTrades/yr | maxRuin |
|---|---|---|---|---|---|
| Short-term MR overlay (023, 025, 026, 027, 030, 091) | 0.30 (≈2.3× SPY floor) | 4 | 20 | 8 | 0.10 |
| Calendar window (045) | 0.30 | 2.5 | 15 | 8 | 0.10 |
| Calendar window, rare (047) | 0.30 | 2.5 | 15 | 1 | 0.10 |
| Rotation / allocation (058, 073) | 0.40 (2× blend floor) | 5 | 20 | 4 | 0.10 |

**Disclosure — re-registrations (025, 073):** both were previously tested and
failed feasibility under stricter ad-hoc goals (ret/DD 0.5). We know their
measured numbers (025: 4.9%/0.30; 073: 4.6%/0.35), so no goal choice for them
is uncontaminated. The archetype rule above is applied uniformly to all ten
candidates and was NOT reverse-engineered to pass them — under it, 025 sits
exactly at the MR boundary and 073 still fails the rotation return floor.
Their re-runs are counted as new trials (deflating DSR) per the discipline.

## Candidates, windows, and edges

| # | Strategy | Project | Window | Params (WF grid if survivor) |
|---|---|---|---|---|
| 023 | RSI(2) pullback | C1Rsi2 | SPY 2000-01-03 → 2025-12-31 | rsi_buy {5,10,15} |
| 025 | Double 7s (re-reg) | C1Double7 | SPY 2000-01-03 → 2025-12-31 | n {5,7,9} |
| 026 | 3 lower closes | C1Down3 | SPY 2000-01-03 → 2025-12-31 | none (fixed pattern) |
| 027 | IBS reversion | C1Ibs | SPY 2000-01-03 → 2025-12-31 | ibs_buy {0.15,0.20,0.25} |
| 030 | VIX-spike reversion | C1VixSpike | SPY 2000-01-03 → 2025-12-31 | stretch {0.10,0.15,0.20} |
| 045 | Turn-of-month | C1Tom | SPY 2000-01-03 → 2025-12-31 | none (fixed calendar) |
| 047 | Halloween effect | C1Halloween | SPY 2000-01-03 → 2025-12-31 | none (fixed calendar) |
| 058 | Stock/bond ratio | C1RatioRot | SPY/TLT 2003-06-02 → 2025-12-31 | none (published 100d SMA) |
| 073 | GTAA (re-reg) | C1Gtaa | 5 ETF 2007-01-03 → 2025-12-31 | none (published 10m SMA) |
| 091 | Stress divergence (NOVEL) | C1StressDiv | SPY+TLT/GLD/HYG 2008-01-03 → 2025-12-31 | none in v1 (thresholds fixed as documented) |

Edges (who persistently loses) are stated per strategy in the library docs and
carried into each strategy record verbatim at registration.

## Procedure

1. Register all ten (edge + `leanProjectName` link) and lock goals — before
   any backtest.
2. Feasibility for all ten (empty-body gate; server resolves the linked
   live_engine run). Every backtest counts a trial.
3. Feasibility survivors that HAVE parameters → walk-forward (configs locked
   at registration time, above). Fixed-parameter survivors take Davey's
   "no optimization" path (Ch 13): single-run history stands, no WF.
4. All survivors → trade-level Monte Carlo (empty-body).
5. MC passers → incubation started (90 days, forward observations).
6. Report everything — passes, failures, and trial spend — in `REPORT.md`.

**Expectation stated up front:** 0–3 of 10 survive to incubation.
