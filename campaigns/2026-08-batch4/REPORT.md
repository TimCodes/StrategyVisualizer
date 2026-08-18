# Campaign #4 — Batch 4 Report

**Run:** 2026-08-17 · **Trials:** 6 (ledger 24 → 30, exactly as budgeted)
**Outcome: 0 of 4 pass. No candidate reached Stage 2.**
My locked expectation (0 of 4 at ~60%) was correct.

---

## 1. The corrected bar survived validation — barely

The measured cash yield came in at **1.203%/yr**, not the ~2% I had assumed:
the 2008–2025 window contains the entire ZIRP decade. That matters, because a
lower cash rate makes the test *more* permissive.

**Bar validation: 4 of 16 priors pass — the red line was "more than 4".**

| passers at measured `c` | 058, 025, 073, 027 |
|---|---|
| at `c = 0%` (batch-3's broken setting) | 8 — would have tripped |
| at `c = 2× measured` | 1 |

The test is accepted, **but by the narrowest margin the rule allows**. Three
more candidates (045b, 026, 023) sit within ~0.8pp of their hurdles; a slightly
lower measured cash rate would have admitted them and killed the approach
permanently. A test that survives its own validation by one candidate is not
one to lean on hard, and batch-4's verdicts should be read with that in mind.

**Benchmarks** (2008-01-01 → 2025-12-31, both `live_engine`):

| | value |
|---|---|
| SPY B&H `R_bh` | 11.024 %/yr, max DD 51.7% (ret/DD 0.213) |
| BIL B&H `c` | 1.203 %/yr (measured cash yield) |

---

## 2. Results

| # | Strategy | ann % | DD % | ret/DD | hurdle % | trades/yr | verdict |
|---|---|---|---|---|---|---|---|
| 071 | Risk Parity Lite | 6.83 | 23.2 | **0.294** | 7.01 | 55.4 | **FAIL** |
| 015 | Dual Momentum | 6.81 | 33.6 | 0.203 | 9.48 | 5.3 | **FAIL** |
| 054 | Sector Pair Spread | 0.49 | 11.2 | 0.044 | 4.16 | 52.0 | **FAIL** |
| 087 | Crypto Weekend (long-only) | −0.37 | 17.7 | −0.021 | 5.71 | 5.8 | **FAIL** |

All four ran on `live_engine` over the pinned window.

---

## 3. The 071 result, read carefully

Risk Parity missed its hurdle by **0.19 percentage points** (6.83% vs 7.01%).
That invites a "so close" narrative, and it should be resisted for two reasons.

**First, it independently fails a frozen risk cap.** Its 23.2% drawdown breaches
the 20% cap carried unchanged from batch 2. Two independent failures, not one
narrow one. The near-miss on the return bar is not the binding constraint.

**Second — and more interesting — 071 genuinely beats buy-and-hold
risk-adjusted and still fails:**

| | ret/DD |
|---|---|
| 071 Risk Parity | **0.294** |
| SPY buy-and-hold | 0.213 |

So the strategy *is* better than passive equity per unit of drawdown. It fails
because the hurdle is not "beat SPY's ratio" — it is "beat a SPY/cash blend
carrying *your* drawdown, by 25%". At 23.2% drawdown that blend is 44.9% SPY
and 55.1% cash, returning 5.61%/yr; the 25% premium puts the bar at 7.01%.

This is the test working exactly as designed. A strategy that improves on
buy-and-hold's ratio but cannot beat a lazy blend at the same risk, by a margin
that pays for its complexity, has not earned deployment. Batch 3's flat 0.30
bar would have failed 071 too (0.294), but for the wrong reason and by
coincidence.

---

## 4. Disclosed deviations

- **015** substitutes **EFA** for the doc's VEU (not in the data set). Committed
  in the pre-registration, before any run.
- **087** is a **daily-bar adaptation of an intraday rule** and is **long-only**,
  because Coinbase crypto is a cash account and cannot short. Only *down*
  dislocations could be faded. **This tested roughly half the mechanism**, and
  its negative result should be read as "the long half does not work on daily
  bars", not as a falsification of the weekend-dislocation hypothesis.
- **071** was run in its base form with **no per-sleeve trend gate**, deliberately:
  the mechanism under test is diversification, and a timing overlay would have
  confounded it with the trend archetype 073 already falsified.

---

## 5. Trial spend

| Item | Trials |
|---|---|
| Baseline | 24 |
| Benchmarks (SPY, BIL) | 2 |
| Stage 1 backtests (4) | 4 |
| **After** | **30** |

Exactly the budget stated in the pre-registration. Stage 2 was never entered,
so **CPCV was not exercised in batch 4** — no candidate earned the right to be
tested for parameter robustness.

At 30 trials, the Deflated Sharpe should treat any future survivor with deep
suspicion. That threshold has now been reached.

---

## 6. What four campaigns have established

**Standing record: 0 survivors from 20 candidates.**

The consistency across the whole search is now the most informative result the
factory has produced:

| | range across all 20 candidates |
|---|---|
| annualised return | ~0% – 7.4% |
| max drawdown | 8.8% – 35.1% |
| ret/DD | −0.02 – 0.355 |

**Nothing has ever reached 0.40, and only one candidate (073, 0.355) has passed
0.30.** Twenty strategies spanning mean reversion, calendar effects, trend,
rotation, relative value, structural liquidity and four novel designs all land
in the same band. That is not twenty independent failures; it looks like a
property of the search space — daily bars, liquid ETFs, long-only or
dollar-neutral constructions.

Batch 4 adds the sharpest version of the point: the two *profitable* candidates
(071 and 015, both ~6.8%/yr) fail on **drawdown**, not return. The factory keeps
finding real edges that cannot carry their own risk.

---

## 7. Recommended next — stop looking for a single survivor

Three campaigns have now searched for one strategy that clears the bar alone.
Twenty attempts say that is the wrong question for this data set.

**The untested lever is combination.** Praxis already has
`diversification.ts` (Phase 6), which combines daily P&L streams and re-runs
the Monte Carlo gate on the blend. Several tested candidates are profitable but
thin, and some are close to uncorrelated by construction — 071 (multi-asset),
054 (dollar-neutral sector spread), 045b (calendar), 023/026/027 (mean
reversion). A portfolio of thin uncorrelated edges can clear a ret/DD bar that
none of its components clears, because the drawdowns do not coincide.

That is also the deferred **Phase 14 multi-system portfolio sizing** work, and
it now has real material to operate on: 20 recorded `live_engine` equity curves.

A batch-5 pre-registration should therefore test **portfolios, not strategies**:
pre-declare the combination rule and weights, apply the same §3 hurdle to the
blend, and keep the same red line. If a diversified blend of thin edges also
fails, the honest conclusion is that this data set cannot support the bar — and
the next move is different data (intraday, single stocks, options), not more
strategies.

**Do not lower the bar.** It has already survived one failed attempt (batch 3)
and passed validation by a single candidate here.
