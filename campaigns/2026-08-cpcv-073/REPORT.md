# CPCV robustness test — 073 GTAA — Report

**Run:** 2026-08-17 · **Trials:** 1 optimization (ledger 21 → 22), 5 underlying engine runs
**Verdict: FAIL — PBO 0.77.** 073 GTAA is closed.

---

## Result

| Metric | Value |
|---|---|
| **PBO** | **0.7727** (fail threshold ≥ 0.50) |
| Splits evaluated | 44 (of C(8,4)=70; the rest fully purged by the embargo) |
| Paths (φ) | 35 |
| Configs | 5 |
| Blocks / embargo | 8 / 1 |
| Median logit | −0.6931 |
| P(OOS loss) | 0.00 |
| dataSource | `live_engine` |

> PBO 0.77 ≥ 0.5: across 44 combinatorial splits the IS-optimal configuration
> lands below the OOS median more often than not — overfit.

A median logit of −0.693 has a precise reading: the in-sample-best lookback
typically ranks **2nd from bottom out of 5** out of sample. Choosing the
lookback by backtest performance is worse than choosing at random.

---

## Validity check (§2) — PASSED

The `sma_days = 210` config had to reproduce batch-1's recorded 073 backtest
within 0.5pp of total return before anything could be interpreted.

| | batch-1 (2026-07-09) | this run | delta |
|---|---|---|---|
| Total return | 136.97% | 137.088% | **0.118 pp** ✓ |
| Max drawdown | 13.1% | 13.1% | exact |
| ret/DD | 0.355 | 0.355 | exact |

The parameterization is faithful. The 0.118pp difference is almost certainly
today's data refresh, which rewrote dividend factor files and shifts adjusted
history microscopically — the drawdown and ret/DD are unchanged.

---

## The finding that matters

Per-config results over 2007-01-03 → 2025-12-31 (18.99 years):

| `sma_days` | net profit % | DD % | ann % | ret/DD | vs 0.40 bar |
|---|---|---|---|---|---|
| **150** | 142.006 | 11.5 | 4.763 | **0.414** | **PASS** |
| 180 | 149.336 | 13.5 | 4.928 | 0.365 | fail |
| 210 *(Faber canonical, batch-1's choice)* | 137.088 | 13.1 | 4.650 | 0.355 | fail |
| 240 | 131.119 | 12.5 | 4.510 | 0.361 | fail |
| 270 | 101.646 | 16.8 | 3.762 | 0.224 | fail |

**A 150-day lookback clears the 0.40 rotation bar that 073 failed.**

This is the exact trap CPCV exists to catch, caught live. A researcher who
swept this parameter and reported the best value would have announced the
factory's first survivor — a strategy that "passes at 0.414", with a tidy
story about 7-month trend filters suiting a 5-sleeve portfolio. CPCV's answer
is that selecting on in-sample performance puts you below the OOS median 77%
of the time. The 0.414 is not an edge; it is the top of a noise distribution
whose spread (0.224 to 0.414) dwarfs the 0.045 by which 073 missed its bar.

Note also that **P(OOS loss) = 0**: every configuration made money out of
sample. GTAA is not broken — it is genuinely, mildly profitable at every
lookback tested. What it does not have is a *choosable* parameter. The trend
premium is real; the specific number is noise.

---

## Interpretation, as locked in §4

> **PBO ≥ 0.50 (fail):** even the near-miss was parameter luck. GTAA closes for
> good, and batch-1's 0.355 should be read as noise rather than a near-hit.

That is the outcome. Consequences, stated without hedging:

1. **073 is closed.** It failed its locked goals in batch 1 and this test does
   not reopen them — as pre-registered, it could not have. What has changed is
   the *reading* of that failure: 0.355-against-0.40 was not "so close", it was
   one draw from a wide distribution.
2. **Batch-3's recommendation is withdrawn.** That report called 073 "the
   highest-quality candidate the factory has produced" and suggested the
   archetype deserved revisiting under a corrected bar. The premise was that
   0.355 was a stable estimate. It was not. I am retracting the suggestion
   rather than quietly leaving it in the record.
3. **My stated expectation was wrong.** §6 predicted PBO < 0.50 at ~65%,
   reasoning that a diversified 5-sleeve system shouldn't depend on a precise
   lookback. The dissenting note in that same section — that 210 days is the
   most-mined parameter in this literature — turned out to be the right one.

---

## What this says about the factory

The Phase-14 CPCV gate has now been exercised on real research and **it changed
a conclusion**. Before this run, 073 sat in the record as a promising near-miss
worth another campaign. After it, 073 is closed and a future campaign that
would have swept its lookback has been prevented from manufacturing a false
survivor.

Standing record: **0 survivors from 16 candidates**, and the factory has now
demonstrated it can reject a *tempting* candidate, not merely a bad one.

### Recommended next (not run, not pre-registered)

- **Retro-apply CPCV to any candidate whose verdict rested on a swept
  parameter.** 025 Double-7s is the obvious one — it failed at 0.298 against
  0.30, an even thinner margin than 073's, and its `n` already showed PBO 0.73
  in the Phase-14 acceptance test. That result was on a technical fixture; a
  pre-registered run would make it a finding.
- **Treat any future near-miss as unresolved until CPCV clears it.** Both
  near-misses examined so far (073 here, 025 in testing) were parameter noise.
  The pattern is strong enough to become policy: a candidate within ~15% of a
  bar should face CPCV before anyone argues about the bar.
- **Stop mining single-parameter variations of published systems.** Faber's
  210 and Connors' 7 are the most-published numbers in their respective
  literatures, and neither survives combinatorial validation.
