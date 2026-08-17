# CPCV re-run — 073 GTAA on an even grid — Report

**Run:** 2026-08-17 · **Trials:** 1 backtest (ledger 23 → 24)
**Result: PBO 0.7273 — FAIL. Identical to the corrected 5-config value.**
073's closure is settled. My 80% expectation was correct.

---

## 1. Result

| grid | configs | PBO | median logit | verdict |
|---|---|---|---|---|
| `{150…270}` (corrected, prior) | 5 (odd) | 0.7273 | −0.6931 | fail |
| **`{120…270}` (this run)** | **6 (even)** | **0.7273** | −0.9163 | **fail** |

Null baseline after the tie fix is ~0.50 at every grid size, so 0.727 sits far
above chance on both. Adding a sixth configuration **at the demanding end**
moved PBO by exactly zero.

The median logit of −0.9163 has the same reading as before: with 6 configs the
in-sample-best lookback typically ranks **2nd from bottom out of 6** out of
sample. Selecting GTAA's trend lookback by backtest performance remains worse
than picking at random.

---

## 2. The new configuration strengthens the original finding

Per-config results, 2007-01-03 → 2025-12-31 (18.99 years):

| `sma_days` | ann % | DD % | ret/DD | vs 0.40 bar |
|---|---|---|---|---|
| **120** *(added here)* | 4.584 | 11.0 | **0.417** | **PASS** |
| **150** | 4.763 | 11.5 | **0.414** | **PASS** |
| 180 | 4.928 | 13.5 | 0.365 | fail |
| 210 *(Faber canonical, batch-1's choice)* | 4.650 | 13.1 | 0.355 | fail |
| 240 | 4.510 | 12.5 | 0.361 | fail |
| 270 | 3.762 | 16.8 | 0.224 | fail |

**Two of six configurations now clear the 0.40 rotation bar that 073 failed at
210.** A sweep-and-report-the-best workflow would have had not one but two
"passing" variants to choose from, and 120 — the value added by this run —
scores highest of all.

And CPCV still says 0.727. That is the finding in its clearest form: the
strategy has configurations that look like winners, and choosing among them on
backtest evidence does not work.

Note the sensible-looking gradient — shorter lookbacks show lower drawdown and
better ret/DD, monotonically. It is exactly the kind of pattern that invites a
story about faster trend detection. The combinatorial evidence says the
ordering does not persist out of sample.

---

## 3. Design choice, honoured

The pre-registration committed to adding **120 rather than 300**, on the
grounds that another likely-poor config at the long end would sit below the
in-sample-best in the OOS ranking and *mechanically depress* PBO — flattering
073 for reasons unrelated to robustness.

That reasoning held up. 120 turned out to be the **best** config by ret/DD, so
the added configuration made the test harder, not easier, and PBO did not
budge. Had I added 300 and seen PBO fall, the result would have been
uninterpretable.

---

## 4. Scope and limits

- **This is an analysis, not a gate result.** 073's walk-forward config is
  locked at 5 configs, so the gate route could not run this grid; PBO was
  recomputed offline via `computeCpcv` over 6 stored equity curves. **The
  persisted gate result of record for 073 remains the M=5 run.** Nothing was
  written to gate history.
- **The 120 run came from a separate project** (`C1Gtaa_sma120`, identical code
  with the parameter default changed) because the backtest API accepts no
  parameters. `C1Gtaa` was not mutated. The run is `live_engine` and ledgered.
- **The gate still ranks on block total return, not risk-adjusted return.**
  Unchanged from the 025 report and still the most substantive weakness. Here
  it matters less than it did for 025 — drawdowns across configs span a
  narrower 11.0–16.8% — but the caveat stands.
- **073 remains a FAIL** on its locked goals. This could not and did not
  reopen them.

---

## 5. Ledger

| Item | Trials |
|---|---|
| Baseline | 23 |
| `C1Gtaa_sma120` backtest | 1 |
| **After** | **24** |

The offline recomputation consumed nothing. (Note: the trial records on
backtest *completion*, not launch — the ledger reads 23 immediately after
POSTing, which is expected behaviour, not a miscount.)

---

## 6. Where this leaves things

**073 is closed on every axis I know how to test:** it failed its locked goals
in batch 1, and its parameter selection fails combinatorial validation at
PBO 0.727 on an odd grid (corrected), an even grid, and a coarser 3-config
fixture. Standing record remains **0 survivors from 16 candidates**.

The calibration loop opened by the 025 campaign is now closed. The CPCV gate
has been verified against its null distribution across five grid sizes, and
its one live failing verdict reproduces across grid compositions.

### Remaining work on the gate (unchanged from the 025 report)

- **Rank on a risk-adjusted block metric, or report both.** This is now the
  only known substantive weakness.
- Even grid sizes remain the safer default for pre-registrations.
