# Campaign #3 — Batch 3 Pre-Registration

**Date locked:** 2026-08-17 (committed BEFORE any batch-3 engine run)
**Trial ledger baseline:** 20 trials
**Question:** Does a regime-filtered calendar strategy add anything over the
simplest passive alternative carrying the same drawdown?

---

## 1. What this campaign changes, and what it must not

Batches 1 and 2 produced 16 candidates and **0 survivors**. The recurring
verdict was "profitable, but ret/DD below the archetype bar". Batch 2's
closing note flagged the open question: was a flat **0.30 ret/DD** bar the
right test for a strategy that is only in the market a fraction of the time?

This campaign answers that — but the direction of the fix matters enormously.
Lowering a bar after seeing failures is exactly the goal-shopping the
methodology forbids. So:

**Changed (one thing only):** the `ret/DD ≥ 0.30` archetype bar is replaced by
a **drawdown-matched passive alternative test** (§3). This is a change of
*instrument*, not of *stringency* — §5 validates that it is not permissive.

**Frozen (everything else), taken verbatim from batch 2:**

| Bar | Value | Note |
|---|---|---|
| max drawdown, calendar archetype | **15%** | NOT relaxed to 20% |
| min annualized return | 2.5% | |
| min trades/yr (045-type) | 8 | |
| min trades/yr (047-type, rare) | 1 | |
| max risk of ruin | 0.10 | |
| data | `live_engine` only | `assertEvaluable` chokepoint |

Freezing the 15% drawdown cap has an immediate and deliberate consequence:

> **047b (Halloween + regime) is already eliminated.** Its 19.4% drawdown
> fails the unchanged 15% cap. It is not resurrected by this campaign and is
> not a batch-3 candidate. Recording this here, before any run, so it cannot
> later be quietly readmitted.

That leaves **045b (Turn-of-Month + 200-SMA filter)** as the only calendar
candidate that clears every frozen bar — 13.7% DD, 2.94% annual, 17.2
trades/yr. The entire open question reduces to whether its return justifies
its risk.

---

## 2. Disclosure of prior knowledge (conflict of interest)

I designed this test **already knowing** batch-2's results (045b ret/DD 0.214,
047b 0.178). That is unavoidable — those results are why the question exists —
but it is a real conflict, so it is disclosed and mitigated three ways:

1. The test in §3 is derived from a **principle** (risk-matched opportunity
   cost), not fitted to any candidate's number.
2. **Dual reporting:** every candidate is reported against the new test *and*
   against the original 0.30 ret/DD bar. Both verdicts appear in the report.
3. **Bar validation (§5):** the new test is applied to all 16 prior candidates.
   A pre-registered red line declares the campaign inconclusive if it turns out
   permissive.

---

## 3. The test — drawdown-matched passive alternative

**The principle.** A ret/DD ratio mishandles partial exposure: return scales
roughly linearly with time in market, while drawdown scales sub-linearly, so
part-time strategies are not comparable to full-time ones on that ratio. The
economically meaningful question is instead:

> If I were willing to accept this strategy's drawdown, what would the
> laziest possible passive allocation have returned? Does the strategy beat it?

**The construction.** From one benchmark run (§4) take SPY buy-and-hold's
annualized return `R_bh` and max drawdown `D_bh`. For a candidate with
annualized return `R_s` and max drawdown `D_s`:

```
w                = D_s / D_bh                     # SPY weight with the same drawdown
passive_return   = w * R_bh + (1 - w) * cash_yield
PASS  iff  R_s  >  1.25 * passive_return
```

- `w` is the fraction of capital in SPY that would have produced the same
  drawdown; the rest sits in cash.
- **`1.25` = a 25% relative premium**, demanded because an active rule carries
  overfitting risk, execution cost, and attention cost that a passive blend
  does not. Locked here.
- **Primary test uses `cash_yield = 0%`** — deliberately the assumption most
  favourable to the candidate (idle cash earns nothing). A failure under this
  assumption is therefore not an artifact of a generous cash rate.
- **Sensitivities reported (not pass/fail):** `cash_yield` = 2% and 4%, which
  make the passive alternative harder to beat and are closer to the realised
  2000–2025 T-bill experience.

**Direction disclosure:** this test is *stricter* than `ret/DD ≥ 0.30` for
low-return, low-drawdown strategies — precisely the profile of the surviving
calendar candidate. It is not a softened bar. §5 verifies this empirically
rather than asserting it.

---

## 4. Benchmark run (the only mandatory engine run)

- **Instrument/window:** SPY buy-and-hold, **2000-01-03 → 2025-12-31**.
- This is the **exact window batch-2 used** (`wf_start`/`wf_end` defaults in
  `C2TomRegime/main.py`). Any comparison across a different window would be
  invalid, so the window is pinned, not chosen.
- Counts as **1 `backtest` trial** on the ledger.
- Outputs `R_bh`, `D_bh`. These numbers are recorded in the report **as
  returned** — the formula above is already locked, so no discretion remains
  after seeing them.

---

## 5. Bar validation — the anti-permissiveness check

Apply the §3 test to **all 16 prior candidates** using their already-recorded
metrics (batch-1 and batch-2 `results.json`; no new runs, no new trials).

**Pre-registered red lines:**

- If **more than 4 of 16** prior candidates pass the new test, it is materially
  more permissive than the bar it replaces. The campaign is then declared
  **INCONCLUSIVE**, the new test is rejected, and 045b's verdict reverts to its
  batch-2 FAIL. Recorded now so this cannot be renegotiated later.
- If **0–4 pass**, the test is accepted as non-permissive and its verdicts stand.

This stage also produces a by-product worth reporting regardless: a like-for-like
re-scoring of every candidate the factory has ever produced.

---

## 6. Candidates

| # | Strategy | Status | Test |
|---|---|---|---|
| 045b | Turn-of-Month + 200-SMA regime filter | **Live** — clears all frozen bars | §3, using batch-2 recorded metrics |
| 047b | Halloween + 200-SMA | **Eliminated** by the frozen 15% DD cap | reported, not re-tested |
| — | All 14 other prior candidates | historical | §5 bar validation only |

**Metric reuse is deliberate and disclosed:** 045b's batch-2 metrics come from
a real `live_engine` run over the pinned window. Re-running identical code over
an identical window would consume a trial to reproduce a known number. Reuse is
therefore the honest choice, not a shortcut — but it means **batch-3 spends
only the trials in §4 and §7**, and the report must state that 045b's verdict
rests on a batch-2 run.

---

## 7. Robustness — only if 045b passes §3

A candidate that passes §3 has cleared a return-vs-risk bar, not a
*is-this-real* bar. It then faces, in order (each engine run = 1 trial):

1. **Walk-forward** — WFE ≥ 0.50, ≥ 50% windows profitable.
2. **CPCV** — PBO < 0.50. *First campaign use of the Phase-14 gate.*
   Pre-registered grid for 045b, locked now:
   - `entry_offset` ∈ {1, 2, 3, 4} (buy at close of T-`entry_offset`)
   - 8 blocks, embargo 1
   - The batch-2 configuration is `entry_offset = 2`; it holds no privileged
     status in the CPCV ranking.
3. **Trade-level Monte Carlo** — risk of ruin < 0.10, using the ≥ 10 closed
   trades available.

Failing any of these is a batch-3 FAIL regardless of §3.

---

## 8. Optional Stage F — only if the calendar thread stays open

If 045b survives §3 and §7, build **046 (Year-End Seasonal Strength)** with the
same 200-SMA filter on IWM, entry at the close of the 10th-to-last trading day
of December, exit at the close of the 5th trading day of January, disaster stop
−6%, over the pinned window. Full gauntlet, frozen bars, rare-calendar trades/yr
minimum of 1. Pre-registered here so it is legitimate if reached; **not** run
if 045b fails, because a closed thread should stay closed.

---

## 9. Stated expectations (locked before any run)

- **Most likely (≈70%):** 045b fails §3. SPY's 2000–2025 drawdown was severe
  enough that a 13.7%-drawdown budget buys a meaningful SPY weight, and 2.94%
  annual return is a low hurdle to clear passively. **The calendar thread then
  closes definitively** and the campaign's deliverable is that closure plus a
  recommendation on where to look next.
- **Possible (≈25%):** 045b passes §3 and then fails CPCV or walk-forward —
  the turn-of-month window is a tuned artifact rather than a flow effect.
- **Unlikely (≈5%):** 045b clears everything and enters incubation, becoming
  the factory's first survivor in 17 candidates.
- **Bar validation:** expect 1–3 of 16 prior candidates to pass §3 (073, 025,
  and possibly 058 are the plausible ones on return-to-drawdown grounds).
  More than 4 triggers the §5 red line.

---

## 10. Procedure

1. Commit this document. **No engine run before this commit lands.**
2. Benchmark run (§4); record `R_bh`, `D_bh` verbatim.
3. Bar validation (§5) across all 16 priors; check the red line first.
4. 045b verdict under §3, plus its dual-reported 0.30 ret/DD verdict.
5. If passing: walk-forward → CPCV → Monte Carlo (§7).
6. `REPORT.md` + `results.json`; post-campaign backup; commit and push.

**Un-ledgered run disclosure:** a LEAN CLI smoke backtest (Demo project, SPY
buy-and-hold 2010–2012) was run on 2026-08-17 to verify the engine after a
month idle. It selected nothing and was deliberately run outside the API so it
would not record a trial. Noted here for completeness.
