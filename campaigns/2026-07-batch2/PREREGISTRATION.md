# Campaign #2 — Batch 2 Pre-Registration

**Date locked:** 2026-07-14 (committed BEFORE any batch-2 backtest runs)
**Candidates:** 6 — 4 untested novel designs + 2 regime-filtered fixes of batch-1 calendar failures

## Goal calibration — UNCHANGED from batch 1 (deliberate)

The batch-1 archetype bars are reused verbatim. This is the disciplined choice:
after batch 1 failed 0/10, lowering the bar "because nothing passed" is exactly
the goal-shopping the methodology forbids. The bars remain anchored to beating
SPY buy-and-hold's ~0.13 ret/DD floor by a 2–3× margin.

| Archetype | minRetDD | minAnnual% | maxDD% | minTrades/yr | maxRuin |
|---|---|---|---|---|---|
| MR overlay (081, 090) | 0.30 | 4 | 20 | 8 | 0.10 |
| Regime-gated trend (086, 099) | 0.40 | 5 | 20 | 4 | 0.10 |
| Calendar, regime-filtered (045b) | 0.30 | 2.5 | 15 | 8 | 0.10 |
| Calendar, regime-filtered rare (047b) | 0.30 | 2.5 | 15 | 1 | 0.10 |

## Candidates

| # | Strategy | Project | Window | Novel? / Change |
|---|---|---|---|---|
| 081 | Gap Budget Exhaustion Fade | C2GapBudget | SPY 2000–25 | NOVEL — fade the Nth same-direction down-gap after a cumulative ATR "budget" is spent |
| 086 | Vol-of-Vol Regime Gate | C2VolOfVol | SPY+VIX 2000–25 | NOVEL — run a plain trend system ONLY when vol-of-vol (ATR-of-ATR) is in its calm tercile |
| 090 | Liquidity Vacuum Fade | C2Vacuum | SPY 2000–25 | NOVEL — fade large moves that occurred on abnormally LOW volume |
| 099 | Volatility Lifecycle Migration | C2VolMigrate | SPY 2000–25 | NOVEL — take trend entries only as ATR% migrates from its bottom decile into the mid-band |
| 045b | Turn-of-Month + regime | C2TomRegime | SPY 2000–25 | FIX — batch-1 045 failed on 31% DD; add a 200-day-SMA regime filter |
| 047b | Halloween + regime | C2HalloweenRegime | SPY 2000–25 | FIX — batch-1 047 failed on 35% DD; hold Nov–Apr only above the 200-day SMA |

The 045b/047b fixes directly target the batch-1 failure mode (calendar premium
carries full crash risk). Passing now would show the regime filter earns the
drawdown budget; failing would show the premium is too thin even de-risked.

## Procedure (unchanged from batch 1)

1. Register all six (edge + `leanProjectName` link), lock goals — before any run.
2. Feasibility for all six (empty-body gate; server resolves the linked
   live_engine backtest). Every backtest counts a `backtest` trial.
3. Feasibility passers → trade-level Monte Carlo (empty-body).
4. MC passers → incubation (90 days) via the Phase-12 ghost-run automation.
5. Report all verdicts + trial spend in `REPORT.md`.

**Expectation stated up front:** 0–2 of 6 survive feasibility. The regime-
filtered calendar fixes are the likeliest passers; the novels are genuine
unknowns (that is what novel designs are for).
