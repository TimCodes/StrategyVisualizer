# CPCV robustness test — 073 GTAA

**Date locked:** 2026-08-17 (committed BEFORE any engine run)
**Trial ledger baseline:** 21
**Subject:** Strategy 073, Faber GTAA (`C1Gtaa`, strategy `8cd6c05c`)
**Type:** Robustness diagnostic on a **failed** candidate — not a resurrection

---

## 1. What this is, and what it cannot do

073 **failed** batch-1 feasibility against its locked rotation-archetype goals:

> annualized return 4.65% < goal 5%; return/DD ratio 0.355 < goal 0.40

Those goals were locked before batch 1 and are **not reopened**. Nothing in
this test can make 073 pass — a CPCV verdict says nothing about whether a
strategy clears its return goals. **073 remains a FAIL regardless of outcome.**

What is genuinely unknown is whether its near-miss was even a *stable estimate*.
0.355 against a 0.40 bar is close enough that the interesting question is
whether that number reflects a real effect or the luck of one hardcoded
parameter. That is exactly the question CPCV answers, and it is the reason
batch 3 recommended 073 as the gate's first live subject.

This is also the **first use of the Phase-14 CPCV gate on real research**.

---

## 2. The parameter under test

`C1Gtaa` hardcodes the Faber trend filter at **210 trading days** (the
canonical 10-month SMA). It is the only real degree of freedom in the strategy
and it is currently a magic number chosen by convention, not by evidence.

**Required code change (behaviour-preserving):** replace the literal with
`sma_days = int(self.get_parameter("sma_days", "210"))`. The default keeps
210, so the algorithm is unchanged when the parameter is absent.

**Validity check (locked now):** the `sma_days = 210` run in the CPCV sweep
must reproduce batch-1's recorded 073 backtest — **136.97% total return,
13.1% max drawdown** — within **±0.5 percentage points of total return**. A
larger divergence means the parameterization altered behaviour; the run is
then **void**, reported as such, and investigated rather than interpreted.

---

## 3. Locked CPCV configuration

| Setting | Value |
|---|---|
| Grid | `sma_days` ∈ **{150, 180, 210, 240, 270}** (5 configs) |
| Window | **2007-01-03 → 2025-12-31** (project default = batch-1's window, pinned) |
| Blocks | **8** |
| Embargo | **1** |
| Splits / paths | C(8,4) = 70 splits, φ = 35 paths |
| Pass criterion | **PBO < 0.50** |

The grid spans roughly 7 to 13 months around Faber's canonical 10. It is
symmetric about 210 by construction — 210 holds **no privileged status** in
the CPCV ranking, which is the point of the test.

---

## 4. Interpretation, locked before the result

- **PBO < 0.50 (pass):** the GTAA lookback is robust — whichever value looked
  best in-sample tends to hold up out-of-sample. The 0.355 near-miss is then a
  real, if insufficient, edge estimate, and the *archetype* is worth revisiting
  in a future pre-registration (with a corrected bar per batch-3 §6). 073
  itself still failed.
- **PBO ≥ 0.50 (fail):** even the near-miss was parameter luck. GTAA closes for
  good, and batch-1's 0.355 should be read as noise rather than a near-hit.
- **Void:** validity check (§2) fails.

Sub-metrics reported without pass/fail weight: median logit, P(OOS loss),
per-config block returns.

---

## 5. Trial accounting

The CPCV route records **1 `optimization` trial** for the procedure (the same
convention the walk-forward runner uses), while performing **5 underlying
engine runs** — one per grid config. Both numbers are disclosed in the report;
the ledger will read **21 → 22**.

CPCV is one pre-registered procedure, not five independent selection attempts,
which is why it counts once. Recording the distinction here so the report
cannot be accused of hiding engine runs.

---

## 6. Expectation, stated up front

Genuinely uncertain, and I want that on record rather than a hedged guess.
GTAA is a diversified 5-sleeve trend system whose logic does not depend on a
precise lookback, so I lean toward **PBO < 0.50 (roughly 65%)**. The contrary
case is real: the 210-day value is the most-published, most-mined parameter in
this entire literature, and batch 1 already showed the strategy is thin.

---

## 7. Procedure

1. Commit this document. **No engine run before the commit lands.**
2. Apply the §2 code change; lock a walk-forward config carrying the §3 grid
   and start date (CPCV reuses it).
3. Run the CPCV gate; record the verdict verbatim.
4. Check §2 validity against the `sma_days = 210` config before interpreting.
5. `REPORT.md` + `results.json`; backup; commit and push.
