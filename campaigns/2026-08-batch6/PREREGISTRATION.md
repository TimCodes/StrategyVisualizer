# Campaign #6 — Batch 6 Pre-Registration (blend as a real algorithm)

**Date locked:** 2026-08-18 (committed BEFORE any batch-6 engine run)
**Trial ledger baseline:** 31
**Question:** Does the batch-5 blend survive contact with execution reality?

---

## 1. Why this run exists

Batch 5's blend missed its hurdle by **0.244pp** (3.912% vs 4.156%) as pure
arithmetic on 19 stored equity curves. That arithmetic models **none** of:

- commissions and slippage on 19 strategies trading simultaneously,
- **position netting** — many components hold SPY at once, and a real account
  holds one net SPY position, not nineteen,
- cash and margin constraints,
- the fact that a dollar-neutral sleeve (054) and a long-only crypto sleeve
  (087) cannot both be funded at nominal weight without borrowing.

Batch 5's section 6 pre-committed this run as the only legitimate follow-up to
a near-miss, and predicted **costs widen the gap rather than close it**. This
tests that prediction.

---

## 2. What is built

A single LEAN algorithm, `B6Blend`, containing all **19** components as
independent *sleeves*. No component is added or dropped — the batch-5
membership rule stands, losers included.

**Weighting:** each sleeve targets **1/19** of portfolio equity, matching
batch-5's equal weight exactly.

**Netting (the crux):** sleeves do not call `set_holdings` directly. Each sleeve
publishes a *target weight per symbol*; the algorithm sums targets across
sleeves and issues **one** order per symbol per rebalance. This is the
execution reality the spreadsheet blend could not represent, and it is expected
to change the result on its own, before any commission.

---

## 3. Two runs, and a validity check that must pass first

| Run | Fee model | Purpose |
|---|---|---|
| **A — frictionless** | zero fees, zero slippage | validity check only |
| **B — realistic** | LEAN default (Interactive Brokers) | **the actual result** |

**Validity check (locked now).** Run A must approximately reproduce batch-5's
arithmetic blend over the same window:

- annualised return within **±0.75pp** of 3.912%
- max drawdown within **±2.0pp** of 11.16%

Netting alone can move these legitimately, so the tolerance is deliberately
loose. **If Run A falls outside it, the implementation is presumed buggy: the
campaign is reported as VOID and no verdict is drawn from Run B.** A composite
of 19 hand-ported strategies is exactly the kind of code that silently
misbehaves, and I would rather discard the run than interpret a bug. (The
Phase-2 parser lesson: never trust a composition you have not validated against
a known answer.)

Only if Run A passes does Run B carry meaning.

---

## 4. The test — reused unchanged, defect and all

Batch 5 found the section-3 hurdle is **not leverage-invariant** and
recommended fixing it before reuse. **It is deliberately reused here
unchanged.**

Batch 6 asks a single narrow question — *does the same number move when
execution costs are applied?* — and changing the test at the same moment would
confound the comparison. Fixing the test is a separate matter for a future
pre-registration, and this run must not become the third reformulation.

Benchmarks are the stored `B4Benchmark` / `B4Cash` curves truncated to the
identical window: `R_bh` 11.028%, `D_bh` 51.7%, `c` 1.203%.

```
w = D_s / D_bh ;  PASS iff R_s > 1.25 * (w*R_bh + (1-w)*c)
```

Window pinned: **2008-01-03 → 2025-12-31**, identical to batch 5.

---

## 5. Which gates actually apply — stated honestly

The batch-5 recommendation said "run the true gauntlet". Two of those gates do
not apply, and saying so is more honest than fabricating them:

| Gate | Applies? | Why |
|---|---|---|
| Feasibility | **Yes** | frozen risk caps + the section-4 hurdle |
| **Walk-forward** | **No** | requires a parameter grid to optimise. An equal-weight blend has **zero free parameters**; there is nothing to walk forward. |
| **CPCV** | **No** | same reason — CPCV measures whether *parameter selection* generalises, and no parameter was selected. |
| Trade-level Monte Carlo | **Yes** | needs ≥10 closed trades; the blend will have thousands |
| Incubation | Only if everything above passes | 90 days forward |

This is a real property of parameter-free portfolios, not an evasion: **the
selection risk in this object lives in component membership, which was fixed
mechanically in batch 5 and is not sweepable.** Fabricating a grid to make CPCV
runnable would manufacture a robustness claim the design cannot support.

**Locked goals (frozen risk caps, unchanged since batch 2):** max drawdown 20%,
max risk of ruin 0.10, min annual return 4%, min trades/yr 8. The binding
return bar is the section-4 formula.

---

## 6. Trial accounting

| Item | Trials |
|---|---|
| Baseline | 31 |
| Run A (frictionless validity) | 1 |
| Run B (realistic) | 1 |
| **After** | **33** |

Run A is spent on *verifying my own code*, not on searching for an edge. It
still counts — the ledger records engine runs, not intentions.

At 33 trials the Deflated Sharpe should treat any survivor with deep suspicion,
and this object is assembled from 19 already-rejected strategies.

---

## 7. Expectations, locked

- **Run B fails the hurdle: ~75%.** Batch 5 predicted costs widen the 0.244pp
  gap. Nineteen strategies trading simultaneously is a lot of commission.
- **Netting alone materially changes the result (>0.5pp on annual return):
  ~50%.** Genuinely uncertain — netting reduces gross exposure and turnover,
  so it could cut costs as easily as returns.
- **Run A passes the validity check: ~70%.** A 19-sleeve hand-port is the
  single most bug-prone thing built in this project.
- **If Run B passes**, it still enters incubation rather than deployment, and
  the DSR caveat at 33 trials stands.

The most likely informative outcome is a **VOID** on the validity check, which
would say the composition is harder to implement faithfully than the arithmetic
suggested — itself a finding about the gap between a portfolio on paper and a
portfolio in an account.

---

## 8. Procedure

1. Commit this document. **No engine run before the commit lands.**
2. Build `B6Blend`; run A (frictionless); **check the validity tolerance first**.
3. If valid, run B (realistic fees); apply the hurdle and frozen caps.
4. Trade-level Monte Carlo if feasibility passes.
5. `REPORT.md` + `results.json`; backup; commit and push.
