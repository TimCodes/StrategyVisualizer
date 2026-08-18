# Campaign #5 — Batch 5 Pre-Registration (portfolio)

**Date locked:** 2026-08-18 (committed BEFORE any batch-5 engine run)
**Trial ledger baseline:** 30
**Question:** Can a blend of thin, individually-failing edges clear the same
hurdle that none of its components clears?

---

## 1. Why portfolios, and why now

Four campaigns have asked "is there one strategy that clears the bar alone?"
Twenty candidates say no, and they fail in a suspiciously uniform way: returns
~0–7.4%, drawdowns 8.8–35.1%, ret/DD −0.02 to 0.355, nothing ever reaching
0.40. Batch 4 sharpened it — the two *profitable* candidates (071 and 015, both
~6.8%/yr) failed on **drawdown**, not return.

That is the precise situation diversification exists for. Drawdowns that do not
coincide partially cancel, so a blend can clear a ret/DD bar none of its parts
clears. This is also the deferred **Phase 14 multi-system sizing** work, and it
finally has material: **19 recorded `live_engine` equity curves**.

---

## 2. Components — mechanical eligibility, no performance filter

**I know all 20 individual results.** Any component list I hand-pick is
contaminated by that. So the primary rule performs **no selection on
performance whatsoever**:

> **Include every candidate the factory has ever run** that (a) has a stored
> completed `live_engine` backtest matching its recorded campaign result,
> (b) whose equity curve covers the full common window, and (c) took at least
> one trade.

All three criteria are mechanical. That yields **19 components**:

`023, 025, 026, 027, 030, 045, 045b, 047, 047b, 054, 058, 071, 073, 081, 086,
087, 091, 015, 099`

**Excluded:** `090` (C2Vacuum) — zero trades over its entire backtest. It never
took a position, so it is not a strategy; this is a structural exclusion, not a
performance one.

Losers are deliberately kept in, including `081` (−10.1% total) and `087`
(−0.37%/yr). Dropping them would be exactly the cherry-picking this rule exists
to prevent.

**Common window (mechanical): 2008-01-03 → 2025-12-31**, the intersection of
all 19 curves (set by `091`'s start). ~18 years.

---

## 3. Combination method — locked, parameter-free

1. **Dedupe** each equity curve to end-of-day closes (LEAN emits multiple
   intraday points; the Phase-12 ghost-run bug came from not doing this).
2. **Align** on the union of dates across components, **forward-filling** each
   component's equity. A strategy with no bar on a date (e.g. equity strategies
   on a crypto weekend) simply has unchanged equity that day.
3. **Daily returns** per component from the aligned curves.
4. **Blend return** = weighted mean of component daily returns, i.e. equal
   weight, continuously rebalanced.
5. Compound to an equity curve; compute annualised return, max drawdown, ret/DD.

**Primary weighting: equal weight (1/19).** Chosen because it has **zero free
parameters** — portfolio construction is itself an overfitting surface, and
equal weight cannot be tuned.

**Secondary weightings — reported, never binding:**

- **Inverse volatility** (weights from realised vol only, no return information).
- **Positive-return subset**, explicitly labelled **selection-contaminated** and
  reported only to quantify how much cherry-picking would have bought.
- **Leave-one-out**: 19 re-runs dropping one component each, to show no single
  component drives the result.

---

## 4. The test — unchanged, and its inherited fragility

The section-3 hurdle from batch 4, unchanged:

```
w              = D_s / D_bh
passive_return = w * R_bh + (1 - w) * c
PASS  iff  R_s > 1.25 * passive_return
```

`R_bh`, `D_bh` and `c` are recomputed from the **stored** B4Benchmark (SPY) and
B4Cash (BIL) curves **truncated to the identical common window**, so benchmark
and blend are measured on exactly the same grid. No new benchmark run.

**Bar validation is not repeated** — the test is identical to batch 4's, where
it passed **4 of 16** against a red line of "more than 4". That margin was the
narrowest the rule allows, and **batch 5 inherits that fragility**. Any pass
here must be reported with it attached.

**A known permissiveness, stated in advance:** with `c ≈ 1.2%`, the hurdle in
*absolute return* terms is low for low-drawdown strategies (at 8% drawdown it
is roughly 3.4%/yr). A diversified blend will have low drawdown by
construction, so it enters the test in the region where the bar is easiest.
This is not a reason to change the bar mid-campaign — it is a reason for the
extra scrutiny in section 5.

---

## 5. Skeptical checks — mandatory, reported whatever the verdict

A blend clearing a low-drawdown hurdle could be an artifact of the metric
rather than a real edge. All of the following are pre-registered and reported
regardless of outcome:

1. **A real passive alternative anyone can buy.** New run `B5Balanced`:
   **60% SPY / 40% AGG, monthly rebalanced**, same window. **1 trial.** If the
   blend does not beat 60/40 on ret/DD, it is uninteresting no matter what the
   hurdle says.
2. **Correlation matrix** across all 19 components, plus each component's
   correlation to SPY. Many components are SPY mean-reversion variants; a
   "diversified" blend of near-identical strategies is not diversified, and the
   matrix will say so plainly.
3. **Equity beta** of the blend to SPY, and the share of blend return
   attributable to it.
4. **Sharpe** of blend vs SPY vs 60/40.
5. **Leverage-to-parity**: the leverage needed for the blend to match SPY's
   annualised return, and the drawdown that implies.

---

## 6. What a PASS would and would not mean

**A passing blend is not a deployable system, and will not be described as
one.** It is a spreadsheet combination of 19 backtests. Specifically:

- It has taken **no** walk-forward, CPCV, Monte Carlo or incubation gate. A
  blend is not a LEAN project, so it cannot enter the pipeline as-is.
- Several components are **already falsified individually** (073 by CPCV at
  PBO 0.727; 025 near-boundary; 081/087 negative). A blend inherits their
  weaknesses.
- It ignores execution reality: 19 simultaneous strategies means 19× the
  commissions, margin and operational load, none of which the daily-return
  arithmetic models.

**The only legitimate follow-up to a pass** is to implement the blend as a
single LEAN algorithm and run the real gauntlet on it — a batch-6
pre-registration, with its own locked goals and its own trials.

---

## 7. Trial accounting

| Item | Trials |
|---|---|
| Baseline | 30 |
| `B5Balanced` 60/40 reference run | 1 |
| Blend construction from stored curves | **0** |
| **Projected after** | **31** |

The blend itself consumes **no engine runs** — it is arithmetic on curves that
were already paid for. But the ledger stands at 30, past the point where the
Deflated Sharpe treats any survivor with deep suspicion, and combining 19
already-tested strategies does not reset that. If anything it compounds it:
these are the survivors of a search that already discarded them.

---

## 8. Expectations, locked

- **The blend clears the section-3 hurdle: ~65%.** Not a bold prediction —
  low drawdown plus a 1.2% cash rate makes the absolute bar low. That is
  precisely why section 5 exists.
- **The blend beats 60/40 on ret/DD: ~45%.** This is the check I actually
  expect to be decisive, and the one I am least confident about.
- **Blend correlation to SPY > 0.7: ~70%.** Most components are long-biased
  equity strategies on the same underlying.
- **No single component drives the result** (leave-one-out moves ret/DD by less
  than 15%): ~80%.

**The outcome I would find most informative:** the blend clears the hurdle but
fails against 60/40. That would say the factory's 19 strategies, combined, are
a worse portfolio than a two-fund index blend — the cleanest possible statement
of what four campaigns have actually produced.

---

## 9. Procedure

1. Commit this document. **No engine run before the commit lands.**
2. Run `B5Balanced` (1 trial).
3. Build the blend from stored curves; recompute benchmarks on the identical
   truncated window.
4. Apply the hurdle; then run **every** section-5 check.
5. `REPORT.md` + `results.json`; backup; commit and push.
