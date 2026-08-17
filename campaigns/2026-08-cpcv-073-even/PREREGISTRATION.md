# CPCV re-run — 073 GTAA on an even grid

**Date locked:** 2026-08-17 (committed BEFORE the additional engine run)
**Trial ledger baseline:** 23
**Subject:** Strategy 073, Faber GTAA (`C1Gtaa`, strategy `8cd6c05c`)
**Type:** Confirmatory re-analysis closing the calibration loop

---

## 1. Why this run, and its honest value

The 025 campaign found that `computeCpcv` inflated PBO on **odd** grid sizes
(exact-median rank scored as overfit). 073 ran on 5 configs and was recomputed
to **0.7273** after the fix, against a corrected null of **0.507** — already
strong evidence of overfitting.

**The value here is lower than when I recommended it.** The fix itself
demonstrated M=5 is now unbiased via the null test, so this is not needed to
trust 073's number. What it adds is (a) an independent check of the *fixed*
gate on real data at an even grid size, and (b) a genuine new question — see §2.
It costs 1 trial. I would not run it for the calibration reason alone.

---

## 2. The sixth configuration — why 120, not 300

Going from 5 configs to 6 requires adding one. The choice is not neutral and
must be justified before the run:

- 073's per-config results improved monotonically toward **shorter** lookbacks
  (`sma_days=150` was best at ret/DD 0.414, `270` worst at 0.224).
- **Adding 300** would almost certainly produce another poor performer. Extra
  poor configs sit *below* the in-sample-best in the OOS ranking, which
  **mechanically depresses PBO**. That would make 073 look more robust for a
  reason that has nothing to do with robustness.
- **Adding 120** probes the direction where performance was still improving.
  If short lookbacks genuinely dominate, 120 may become in-sample-best — and
  the test then asks whether *that* selection generalizes. This is the more
  demanding choice.

**Locked grid:** `sma_days ∈ {120, 150, 180, 210, 240, 270}` — 6 configs.

**Dropping a config to reach 6 (e.g. removing 270) is explicitly rejected**:
270 is the known-worst performer and removing it would be selection on results.

---

## 3. Mechanism — and why this is an analysis, not a gate result

Two constraints, both consequences of rules working as intended:

1. **073's walk-forward config is locked** (2026-08-17, grid `{150…270}`,
   start 2007-01-03). Lock-once forbids revision, so the CPCV **gate route
   cannot run this grid**.
2. **The backtest API does not accept parameters** (`runBacktestBodySchema`
   takes `code` and `socketId` only), so the 120 run cannot be injected there
   either.

**Therefore:**

- The 120 run is obtained by creating a **separate LEAN project**,
  `C1Gtaa_sma120`, whose code is `C1Gtaa` verbatim except the parameter default
  reads `"120"`. This avoids mutating `C1Gtaa`'s stored code. The run is
  executed through the API and **counts 1 `backtest` trial** (ledger 23 → 24).
- PBO is then recomputed **offline** via `computeCpcv` over the **6 stored
  equity curves** (5 already on disk from the 2026-08-17 CPCV run, plus the new
  one), 8 blocks, embargo 1 — consuming no further engine runs.
- **The persisted gate result of record for 073 remains the M=5 run.** This
  re-analysis is reported as an analysis and will not be written to the gate
  history, because it did not come from the gate.

All five existing curves were produced by the identical algorithm over the
identical window (2007-01-03 → 2025-12-31), so combining them with the new run
is valid.

---

## 4. Interpretation, locked before the result

- **PBO ≥ 0.50 (expected):** confirms 073. The GTAA lookback does not
  generalize, on an even grid, with a calibrated gate, across 6 configs. 073's
  closure is then settled on every axis I know how to test.
- **PBO < 0.50 (would be a genuine problem):** two calibrated computations on
  overlapping data disagreeing would mean the result is grid-composition
  dependent — i.e. CPCV is more fragile than its use in this repo assumes. I
  would report that as a gate-reliability finding and treat **both** 073
  verdicts as unresolved rather than picking the congenial one.
- 073 **remains a FAIL** on its locked goals either way; this cannot reopen them.

---

## 5. Expectation

**PBO ≥ 0.50 at ~80%.** Lower confidence than the 85% I wrongly asserted for
025, deliberately: I have now been wrong once today about a CPCV outcome, and
adding a config at the strong end is the change most capable of moving the
number.

---

## 6. Procedure

1. Commit this document. **No engine run before the commit lands.**
2. Create `C1Gtaa_sma120`; run one backtest over 2007-01-03 → 2025-12-31.
3. Recompute CPCV offline over the 6 curves; record verbatim.
4. `REPORT.md` + `results.json`; backup; commit and push.
