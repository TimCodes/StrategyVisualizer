# Campaign #1 — Batch 1 Report

**Run:** 2026-07-09, real LEAN engine, daily data through July 2026
**Pre-registration:** `PREREGISTRATION.md` (committed before any run)
**Result: 0 of 10 survived feasibility.** Pre-stated expectation was 0–3.

## Verdicts

| # | Strategy | Window | Ann. % | Ret/DD | MaxDD % | Closed trades | Verdict | Failed on |
|---|---|---|---|---|---|---|---|---|
| 023 | RSI(2) Pullback | 2000–25 | 2.83 | 0.264 | 10.7 | 192 | **FAIL** | return, ret/DD |
| 025 | Double 7s (re-reg) | 2000–25 | 4.94 | 0.298 | 16.6 | 244 | **FAIL** | ret/DD (by 0.002) |
| 026 | Three Lower Closes | 2000–25 | 2.85 | 0.204 | 14.0 | 204 | **FAIL** | return, ret/DD |
| 027 | IBS Reversion | 2000–25 | 3.73 | 0.278 | 13.4 | 587 | **FAIL** | return, ret/DD |
| 030 | VIX-Spike Reversion | 2000–25 | 1.76 | 0.098 | 17.9 | 124 | **FAIL** | return, ret/DD |
| 045 | Turn-of-Month | 2000–25 | 3.84 | 0.123 | 31.1 | 311 | **FAIL** | drawdown, ret/DD |
| 047 | Halloween Effect | 2000–25 | 5.04 | 0.144 | 35.1 | 26 | **FAIL** | drawdown, ret/DD |
| 058 | Stock/Bond Ratio | 2003–25 | 7.35 | 0.259 | 28.4 | 799 | **FAIL** | drawdown, ret/DD |
| 073 | GTAA (re-reg) | 2007–25 | 4.65 | 0.355 | 13.1 | 530 | **FAIL** | return, ret/DD |
| 091 | Stress Divergence (NOVEL) | 2008–25 | 1.20 | 0.090 | 13.4 | 105 | **FAIL** | return, ret/DD |

**Trial ledger:** 11 `backtest` trials recorded this campaign (10 candidates +
1 GTAA re-run after an engine failure; the failed simulated fallback correctly
did not count). Every future DSR on these strategies is deflated accordingly.

## What the batch actually says

1. **Every candidate was profitable in absolute terms** over 18–26 years of
   real data — and most beat SPY buy-and-hold's risk-adjusted floor (~0.13
   ret/DD). What none could do is beat it by the pre-registered 2–2.3×
   margin. The classic retail edges are *real but thin* in the modern sample.
2. **Calendar effects carry full crash risk.** Turn-of-Month and Halloween
   posted 31–35% drawdowns: the flow premium is real in averages and
   absent in tails (Oct 2008's month-end was still Oct 2008).
3. **The boundary case:** Double 7s at ret/DD 0.298 vs the 0.30 bar. The
   locked goal stands; a rule that bends by 0.002 the first time it pinches
   is not a rule.
4. **The novel hypothesis was cleanly falsified.** 091's cross-asset calm
   gate — designed to filter dangerous VIX-regime entries — filtered out the
   *profitable* entries too (1.2% ann. vs the base RSI(2)'s 2.8%). The gate
   subtracts, not adds. Hypothesis rejected; that is what novel designs are
   for.
5. **Best of batch:** GTAA's 0.355 ret/DD (risk control genuinely delivered:
   13.1% max DD through 2008 *and* 2020) and 058's 7.35% annualized (paid
   for with 28.4% DD).

## Process notes (the machine under test, too)

- **Empty-body gates worked 10/10** (Phase 9 linkage) — no hand-built
  payloads anywhere in the campaign.
- **One engine failure, fully triaged:** GTAA's first run failed with
  "unhashable type: 'dict'" — root cause was a brace-escaping bug in *our
  generator script* (a `{{...}}` set-of-dict-comprehension that parses but
  cannot run), not the engine, the data, or the strategy. The new errorLog
  captured the failure, the simulated fallback was correctly barred from
  gating, the fix was applied, and the re-run was counted as its own trial.
- The archetype goal bars (0.30 MR / 0.40 rotation) are a legitimate topic
  for batch 2 — several candidates would pass materially lower bars that
  still beat buy-and-hold. If batch 2 lowers them, that is a *new*
  pre-registration made knowing these results, and the report must say so.

## Disposition

All ten remain at `idea` stage with `gateStatus: failed` in Postgres —
durable, auditable verdicts. No strategy advances. No goal is revised
retroactively. Candidate ideas for batch 2: regime-filtered variants of the
calendar strategies (new strategy records, new trials), lower pre-registered
bars with explicit buy-and-hold-multiple rationale, or a sweep of the
untested library sections (pairs, options-adjacent, remaining novels).
