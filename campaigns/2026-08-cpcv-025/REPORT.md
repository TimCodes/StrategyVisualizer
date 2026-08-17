# CPCV robustness test — 025 Double 7's — Report

**Run:** 2026-08-17 · **Trials:** 1 optimization (ledger 22 → 23), 3 underlying engine runs

**Headline: the run found a defect in the CPCV gate itself.** As executed the
gate returned **PBO 0.591 (fail)**. That number was produced by a miscalibrated
computation. Corrected, on identical data, it is **PBO 0.386 (pass)** — the
verdict flips. My pre-registered expectation (85% fail) was wrong.

---

## 1. What the gate recorded, and why it is wrong

| | value | verdict vs locked PBO < 0.50 |
|---|---|---|
| As-run (recorded gate result) | **0.5909** | fail |
| Tie-corrected, same data, no new runs | **0.3864** | **pass** |

`medianLogit = 0` in the recorded metrics is what exposed it.

**The defect.** CPCV ranks the in-sample-best configuration among the
out-of-sample results, converts that rank to `omega = rank/(M+1)`, and takes
`logit = ln(omega/(1-omega))`. With an **odd** number of configurations there
is always an exact-median rank where `omega = 0.5` and `logit = 0`. My
implementation counted `logit <= 0` as overfit, so **the neutral middle rank
was scored as evidence of overfitting**.

**How it was caught — objectively, not by looking at 025's result.** PBO is a
probability; on pure noise, where no configuration holds a real edge, it must
centre on 0.5 for every grid size. It did not:

| configs (M) | mean PBO on pure noise, before fix | after fix |
|---|---|---|
| 3 | **0.671** | 0.503 |
| 4 | 0.498 ✓ | 0.498 |
| 5 | **0.605** | 0.507 |
| 6 | 0.498 ✓ | 0.498 |
| 7 | **0.561** | 0.489 |

Even grid sizes were unbiased; every odd size was inflated. 025 ran on a
3-config grid, whose null was **0.671** — so the recorded 0.591 was already
*below* what pure noise produces, and the "fail" was an artifact.

**Fix:** `logit < 0` counts as overfit, `logit == 0` contributes 0.5. All grid
sizes now centre on 0.50 (regression test added; 230 tests pass).

---

## 2. Symmetry check — 073 recomputed with the same fix

Recomputing only the result that moves favourably would be the exact bias this
whole apparatus exists to prevent. So 073 was recomputed identically:

| | as-run | corrected | verdict |
|---|---|---|---|
| 073 GTAA (M=5) | 0.7727 | **0.7273** | **FAIL — unchanged** |
| 025 Double 7's (M=3) | 0.5909 | **0.3864** | **PASS — flipped** |

073's conclusion stands: 0.727 against a corrected null of 0.507 remains
strong evidence of overfitting. The correction moved both numbers down; only
025 crossed the threshold. **The 073 report needs no retraction.**

---

## 3. What 025's pass does and does not mean

Per-config results over the inherited 2008-01-01 → 2025-12-31 window:

| `n` | net profit % | DD % | ann % | ret/DD |
|---|---|---|---|---|
| 5 | 233.729 | 14.0 | 6.925 | 0.495 |
| 7 *(Connors canonical, batch-1's choice)* | 173.430 | 15.5 | 5.748 | 0.371 |
| 9 | 210.544 | 29.5 | 6.498 | 0.220 |

**Does mean:** within this window, choosing `n` by in-sample block return
generalizes out of sample. `n = 5` is consistently strong across blocks rather
than winning on a lucky subset. This is a real result and the **first CPCV
pass on live research**.

**Does not mean — three limits, all material:**

1. **Different window from the 0.298 figure.** Batch-1's ret/DD 0.298 was
   computed over **2000-01-03 → 2025-12-31**. This run inherited a locked
   config starting **2008-01-01**, excluding the dot-com bear market. Over
   2008–2025, `n = 7` yields ret/DD **0.371** — it would clear the 0.30 bar it
   failed. That is a *window* effect, not a parameter effect, and it means
   **this test does not validate the 0.298 estimate itself.**
2. **The gate ranks on return, not risk-adjusted return.** `sliceEquityIntoBlockReturns`
   feeds CPCV total return per block. 025's configurations differ enormously in
   drawdown (14.0% at `n=5` versus 29.5% at `n=9`), so "the parameter choice
   generalizes" is a claim about *return*, not about the ret/DD metric the
   goals actually use. A robustness pass on return is weaker than it sounds.
3. **A 3-config grid is coarse.** Ranks can only be 1, 2 or 3, so the test has
   little power. I would have used `n ∈ {4…10}`; lock-once semantics correctly
   forbade it.

**025 remains a FAIL.** Its locked goals (0.30 ret/DD over the 2000–2025
window) were never reopened and this test could not reopen them.

---

## 4. Consequences I have to record against myself

1. **My expectation was wrong, and I stated it at 85%.** I predicted the
   fixture's 0.73 would reproduce. Pre-registering that confidence is what
   makes this a real surprise rather than something I can now claim to have
   half-expected.
2. **The Phase-14 acceptance claim was overstated.** Commit `39b5799` reported
   "Double7 PBO 0.73 → FAIL, the parameter n is noise". That fixture also used
   a 3-config grid against a true null of 0.671, so 0.73 was marginal evidence,
   not the clean rejection it was presented as.
3. **The policy I proposed in the 073 report is withdrawn.** I recommended
   treating any near-miss within ~15% of a bar as parameter noise pending CPCV,
   on a sample of two — both of which I believed failed. One of those two
   actually passes. Two data points, one of them mismeasured, is not a policy.
4. **The gate has been shipping this defect since Phase 14**, and it biased
   *against* strategies on odd grids. Every prior odd-grid CPCV number in this
   repository should be read against its inflated null, not against 0.50.

---

## 5. Trial accounting

| Item | Trials |
|---|---|
| Baseline | 22 |
| CPCV procedure (3 underlying engine runs) | 1 |
| **Ledger after** | **23** |

The corrected PBO figures for both 025 and 073 were recomputed from **stored
equity curves**, consuming no engine runs and no trials.

---

## 6. Where this leaves things

Standing record: **0 survivors from 16 candidates** — unchanged, since 025
still fails its locked goals.

What changed is the instrument. The factory now has a CPCV gate that is
calibrated (verified against a null distribution across five grid sizes) rather
than one that quietly failed robust strategies on odd grids. That is worth more
than either candidate verdict.

### Recommended next (not run, not pre-registered)

- **Re-run 073's CPCV on an even grid** (e.g. `sma_days ∈ {150,180,210,240,270,300}`,
  M=6) to remove the last calibration doubt. Its corrected 0.727 is already far
  from the null, so I expect confirmation, not reversal — but it closes the loop.
- **Make CPCV rank on a risk-adjusted block metric**, or report both. Limit 2
  above is the most substantive remaining weakness in the gate: a strategy can
  pass on return while its drawdown profile swings wildly across configs, which
  is precisely 025's situation.
- **Prefer even grid sizes in future pre-registrations** until the risk-adjusted
  work lands — they were unbiased even under the defect.
