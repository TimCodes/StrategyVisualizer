# Campaign #5 — Batch 5 Report (portfolio)

**Run:** 2026-08-18 · **Trials:** 1 (ledger 30 → 31); the blend itself cost none
**Verdict: FAIL — the blend missed the hurdle by 0.244 percentage points.**
My locked expectation (65% pass) was **wrong**.

And yet this is the most informative campaign the factory has run, because the
blend beat every real alternative while failing the formal bar.

---

## 1. The headline numbers

| | ann % | DD % | ret/DD | Sharpe | hurdle % | verdict |
|---|---|---|---|---|---|---|
| **BLEND** (19, equal weight) | **3.91** | **11.2** | **0.350** | **0.76** | 4.16 | **FAIL** |
| 60/40 SPY/AGG | 8.12 | 34.0 | 0.239 | 0.60 | 9.59 | FAIL |
| SPY buy-and-hold | 11.03 | 51.7 | 0.213 | 0.53 | 13.79 | FAIL |

Benchmarks over the identical grid: `R_bh` 11.028%, `D_bh` 51.7%, `c` 1.203%.

**The blend fails by 0.244pp.** The pre-registered verdict stands, and nothing
below changes it.

---

## 2. Diversification worked. The bar was simply higher.

The hypothesis was that thin edges with non-coinciding drawdowns would combine
into something better than any part. That is exactly what happened:

- **ret/DD 0.350** — higher than every one of its 19 components on this window,
  and the best risk-adjusted figure the factory has produced in 5 campaigns.
- **Drawdown 11.2%**, against components spanning 8.8–35.1%.
- **Beta to SPY just 0.119.** Only **1.31pp of the blend's 3.91%/yr** is equity
  beta; the rest is genuinely strategy return, not disguised market exposure.
- Correlation to SPY **+0.537** — I predicted >0.7 and was wrong; the blend is
  less market-coupled than expected.

**It also cleared the check I pre-registered as decisive.** Section 5 said: *if
the blend does not beat 60/40 on ret/DD, it is uninteresting no matter what the
hurdle says.* It beats 60/40 on ret/DD (0.350 vs 0.239) **and** on Sharpe (0.76
vs 0.60), and beats SPY on both by wider margins.

So: the mechanism is vindicated, and the object it produced still fails the bar.

**Leave-one-out confirms it is not one lucky component.** Maximum swing in
ret/DD from dropping any single strategy: **6.7%**, against the 15% threshold I
pre-registered. Notably, dropping the worst component (081, −10.1% total)
*improves* the blend to 0.374 — which is precisely why 081 stayed in.

---

## 3. Two structural quirks the campaign exposed in the test

Both are properties of the hurdle, found by running it on things it had not
been run on before. Neither is used to revise this campaign's verdict.

**(a) The benchmark fails its own test.** SPY buy-and-hold needs 13.79% and
delivers 11.03%. This is inevitable: a strategy whose drawdown equals `D_bh`
faces a hurdle of `1.25 × R_bh`, so passive can never clear a 25% premium over
itself. That is arguably correct — "SPY isn't 25% better than SPY" is true and
uninteresting — but it means the test is strictly *"does this earn a premium
over the lazy alternative at your risk"*, never *"is this good"*. Worth stating
so the SPY row is not misread as absurd.

**(b) The test is not leverage-invariant.** Scaling a strategy by `k` scales
`R_s` and `D_s` together, but the cash term `(1-w)·c` does not scale, so higher
leverage makes passing *easier*. Concretely: at **2.82×**, the blend matches
SPY's 11.03% return with a **31.5% drawdown versus SPY's 51.7%** — and at that
leverage it would **pass** the hurdle it just failed.

That is a genuine defect. A verdict that flips on an arbitrary scaling choice
is not measuring what it claims to. **I am not using it to flip this
verdict** — the blend was pre-registered as constructed, unlevered, and it
failed.

---

## 4. Secondary weightings (never binding, as pre-registered)

| weighting | ann % | DD % | ret/DD | verdict |
|---|---|---|---|---|
| Equal weight (primary) | 3.91 | 11.2 | 0.350 | FAIL |
| Inverse volatility | 2.82 | 8.1 | 0.348 | FAIL |
| Positive-return subset (17) | 4.42 | 11.7 | 0.377 | **PASS** — *selection-contaminated* |

**The positive-only subset passes, and it does not count.** It was declared
non-binding in advance precisely because dropping the two losers requires
knowing which they were. It is reported only to quantify what cherry-picking
buys: about +0.5pp of annual return, enough to flip the verdict. That is the
measure of how little separates this result from a fabricated one.

---

## 5. Expectations check

| prediction | outcome |
|---|---|
| Blend clears the hurdle (~65%) | **WRONG** — failed |
| Blend beats 60/40 on ret/DD (~45%) | **right**, and I was underconfident |
| Correlation to SPY > 0.7 (~70%) | **WRONG** — 0.537 |
| Leave-one-out swing < 15% (~80%) | **right** — 6.7% |

Two of four. The two I got wrong both pointed the same way: I underestimated
how much genuine diversification 19 mediocre strategies would provide, and
overestimated how easily a low-drawdown portfolio clears an absolute-return bar.

---

## 6. Ledger

| Item | Trials |
|---|---|
| Baseline | 30 |
| `B5Balanced` 60/40 reference | 1 |
| Blend construction (stored curves) | 0 |
| **After** | **31** |

At 31 trials the Deflated Sharpe should treat any claimed survivor with deep
suspicion — and this blend is assembled from 19 strategies that search already
rejected. Combining rejects does not launder them.

---

## 7. Where this leaves the factory

**Standing record: 0 survivors from 20 candidates and 1 portfolio.**

But the finding is no longer "nothing works". It is sharper than that:

> The factory's 19 strategies, equally weighted, produce a portfolio that beats
> both a 60/40 index blend and SPY on every risk-adjusted measure, with only
> 0.119 beta — and still cannot clear a bar demanding a 25% premium over a
> drawdown-matched passive alternative, missing by a quarter of a point.

That is a genuinely different statement from batches 1–4, and it locates the
problem precisely: **not the edges, and not the diversification — the absolute
return level.** 3.91%/yr is simply low, and the hurdle at 11% drawdown is
4.16%.

### Recommended next

1. **Implement the blend as a real algorithm and gauntlet it.** This is the only
   legitimate follow-up to a near-miss, and it was pre-committed in section 6 of
   the pre-registration. A spreadsheet blend has taken no walk-forward, CPCV,
   Monte Carlo or incubation gate, and models none of the 19× execution cost.
   Expect costs to widen the 0.244pp gap, not close it.
2. **Fix the leverage non-invariance before reusing the test.** A defensible
   formulation compares ret/DD ratios directly, which is scale-free. **This
   would be the third version of this test**, and that is a warning sign in
   itself — so it must be declared in a batch-6 pre-registration in advance,
   subject to the same red line, and if it fails validation the whole
   drawdown-matched family should be abandoned as agreed in batch 4.
3. **Do not lower the bar, and do not adopt the positive-only subset.** The gap
   is 0.244pp; the temptation to close it by dropping two known losers is
   exactly what the pre-registration was written to prevent.

The honest summary: **the portfolio approach is the best thing this factory has
built, and it is still not good enough on the terms set before it was tested.**
