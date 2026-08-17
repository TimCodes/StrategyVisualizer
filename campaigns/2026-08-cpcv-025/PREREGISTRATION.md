# CPCV robustness test — 025 Double 7's

**Date locked:** 2026-08-17 (committed BEFORE any engine run)
**Trial ledger baseline:** 22
**Subject:** Strategy 025, Double 7's (`C1Double7`, strategy `6ea62a23`)
**Type:** **Confirmatory** robustness diagnostic on a **failed** candidate

---

## 1. Prior knowledge — this run is largely confirmatory

I already have a strong prior on the answer, and saying so is the point of
this section.

The Phase-14 CPCV acceptance test (commit `39b5799`) ran CPCV on the `Double7`
project with grid `n ∈ {5,7,9}`, 8 blocks, over 2005-01-03 → 2025-12-31 and
returned **PBO 0.73 (fail)**. I have diffed that project against `C1Double7`:
they are **logically identical** — the differences are the class name, the
docstring, a local variable name (`w` vs `window`), and `elif` versus a nested
`if`. No behavioural difference.

So this run differs from the fixture only in its **start date** (2008 vs 2005)
and in being attached to the real campaign candidate. **I expect it to
reproduce roughly PBO 0.73.**

**Why run it anyway:** the fixture result was a technical acceptance test on a
throwaway strategy record that has since been deleted. It is not attributable
to candidate 025, was not pre-registered, and cannot be cited as a research
finding. This run converts a known engineering result into a properly
pre-registered verdict on the actual candidate, at a cost of 3 engine runs.

**Its value is procedural, not exploratory.** If the ledger cost mattered more
than the attribution, the correct decision would be to skip it.

---

## 2. What this cannot do

025 **failed** batch-1 feasibility against its locked goals:

> return/DD ratio 0.298 < goal 0.30

That is the thinnest miss in the factory's history — 0.0024 short. The goals
(0.30 ret/DD, 4% annual, 20% max DD, 8 trades/yr, 0.10 ruin) were locked
before batch 1 and **are not reopened**. 025 remains a FAIL regardless of
outcome. What is being tested is whether that boundary miss was a stable
estimate or an artifact of the `n = 7` convention.

---

## 3. The locked configuration — inherited, not chosen

025's walk-forward config was **locked on 2026-07-09** during batch 1 and
lock-once semantics forbid revising it. CPCV reuses it:

| Setting | Value | Source |
|---|---|---|
| Grid | `n` ∈ **{5, 7, 9}** (3 configs) | locked batch-1 config |
| Start date | **2008-01-01** | locked batch-1 config |
| End date | 2025-12-31 | CPCV runner default |
| Blocks | **8** | chosen here |
| Embargo | **1** | chosen here |
| Pass criterion | **PBO < 0.50** | gate default |

**I would have preferred a wider grid** (`n` ∈ {4…10}, 7 configs) for finer
out-of-sample rank resolution, and batch-1's own 2000-01-03 backtest window.
I cannot have either. The config is pre-declared and stands.

**Explicitly rejected:** creating a *new* strategy record to attach a wider
grid. That would evade lock-once semantics while pretending to respect them.
If a wider grid is ever wanted it must be a new pre-registered candidate with
its own locked goals, and its result would **not** be attributable to 025.

**Consequence of the inherited window:** this run covers 2008-01-01 → 2025-12-31,
while batch-1's recorded 025 metrics (250.292% total return, 16.6% DD, ret/DD
0.298) come from 2000-01-03 → 2025-12-31. **The two are not comparable**, and
no reproduction check against batch-1's numbers is possible or attempted.

---

## 4. No validity check this time — and why

The 073 test required one because I had to edit the algorithm to expose
`sma_days`. **025 needs no code change**: `n` is already read via
`get_parameter("n", "7")`, and the parameter contract has been in place since
batch 1. There is no parameterization risk to guard against, so inventing a
check here would be theatre. The code is used exactly as batch 1 left it.

---

## 5. Interpretation, locked before the result

- **PBO ≥ 0.50 (expected):** the 0.298 boundary miss was noise from the `n = 7`
  convention. 025 closes for good, and — combined with 073 — establishes that
  **both** of the factory's near-misses were parameter artifacts.
- **PBO < 0.50 (would surprise me):** the Double-7s window length is robust and
  the 0.298 is a real, stable estimate that genuinely missed by 0.0024. That
  would make 025 the strongest argument yet that the mean-reversion archetype
  bar deserves scrutiny in a future pre-registration — though **not** a pass,
  and not in this campaign.
- Divergence from the fixture's 0.73 beyond ~±0.15 is itself worth reporting,
  since the only design difference is three years of start date.

---

## 6. Trial accounting

1 `optimization` trial for the procedure; **3 underlying engine runs** (one per
grid value). Ledger **22 → 23**. Both figures disclosed in the report.

---

## 7. Expectation, stated up front

**PBO ≥ 0.50 at ~85%.** This is deliberately not a hedge: the fixture already
answered this question on identical logic, and I would be surprised by a
different verdict. Recording the high confidence so that a contrary result
counts as a genuine surprise rather than something I can claim to have
anticipated.

---

## 8. Procedure

1. Commit this document. **No engine run before the commit lands.**
2. Run the CPCV gate against the existing locked config — no code edit, no
   config edit.
3. Record the verdict verbatim; compare to the fixture's 0.73.
4. `REPORT.md` + `results.json`; backup; commit and push.
