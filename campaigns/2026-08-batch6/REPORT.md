# Campaign #6 — Batch 6 Report (blend as a real algorithm)

**Run:** 2026-08-18 · **Trials:** 2 (ledger 31 → 33, exactly as budgeted)
**Verdict: FAIL — on two independent grounds.**

The composite is faithful, the execution costs were nearly neutral, and the
blend still falls short. My prediction about *why* it would fail was wrong.

---

## 1. Validity check — PASSED, and closely

Run A (frictionless) had to reproduce batch-5's arithmetic blend or the
campaign was void.

| | batch-5 arithmetic | Run A | delta | tolerance |
|---|---|---|---|---|
| annualised | 3.912% | **4.074%** | +0.162pp | ±0.75 ✓ |
| max drawdown | 11.16% | **11.10%** | −0.06pp | ±2.00 ✓ |

A 19-sleeve hand-port landing within 0.16pp of an independently computed
blend is strong evidence the composition is faithful. I had put only ~70% on
this passing. **Run B's number therefore measures friction, not my bugs.**

---

## 2. The result

| | ann % | DD % | ret/DD | trades | trades/yr |
|---|---|---|---|---|---|
| Run A — frictionless | 4.074 | 11.10 | 0.367 | 4,058 | 225.5 |
| **Run B — realistic** | **3.925** | **11.20** | **0.350** | 4,058 | 225.5 |

**Hurdle 4.164%. Run B delivers 3.925%. FAIL by 0.239pp.**

**It also fails a frozen risk cap:**

| frozen bar (unchanged since batch 2) | value | result |
|---|---|---|
| max drawdown ≤ 20% | 11.20% | PASS |
| **min annualised return ≥ 4%** | **3.925%** | **FAIL** |
| min trades/yr ≥ 8 | 225.5 | PASS |

Feasibility failed, so per the pre-registered gauntlet the trade-level Monte
Carlo was **not run**.

---

## 3. The finding: execution reality was neutral, not adverse

Batch 5 predicted — and I put 75% on it — that costs would **widen** the
0.244pp gap. That was wrong in mechanism, and right in verdict only by
accident:

| effect | impact on annual return |
|---|---|
| Netting (one net position instead of 19 overlapping) | **+0.162 pp** |
| Commissions and slippage | **−0.149 pp** |
| **Net effect of execution reality** | **+0.013 pp** |

They almost exactly cancelled. Netting *helped*: when several sleeves want SPY
at once, a real account holds one position rather than repeatedly crossing the
spread against itself. The spreadsheet blend, by construction, could not model
that benefit — only its costs.

**The gap is remarkably stable:**

| | shortfall vs hurdle |
|---|---|
| Batch 5 (arithmetic) | 0.244 pp |
| Batch 6 (real algorithm, real costs) | **0.239 pp** |

ret/DD likewise: 0.350 arithmetic, 0.3505 real. **The portfolio's shortfall is
not an artifact of modelling assumptions.** It survives a full implementation
with netting, commissions and slippage, and lands in the same place.

---

## 4. Why no reformulation of the test can rescue this

Batches 5 and 6 both flagged that the section-3 hurdle is not
leverage-invariant, and I twice recommended fixing it. **That fix is now moot
for this object**, and saying so plainly matters more than defending the test:

> The blend fails the **frozen 4% minimum annual return** — a bar locked since
> batch 2, carried unchanged through four campaigns, and entirely independent
> of the disputed drawdown-matched hurdle.

3.925% < 4%. No reformulation of the hurdle changes that. Rescuing this blend
would require lowering a *frozen* bar, which is precisely the goal-shopping the
whole apparatus exists to prevent. **The portfolio approach is exhausted on its
own terms**, and I am not proposing a third version of the test to revisit it.

---

## 5. Expectations check

| prediction | outcome |
|---|---|
| Run B fails the hurdle (~75%) | **right** — but for the wrong reason |
| Netting alone moves annual return >0.5pp (~50%) | **WRONG** — it moved +0.162pp |
| Run A passes validity (~70%) | **right**, and by a wide margin |
| Batch-5's "costs widen the gap" | **WRONG** — costs were neutral |

Two of three, plus a falsified inherited prediction. The consistent error
across batches 5 and 6 is that I over-weighted execution costs and
under-weighted the benefit of netting.

---

## 6. Ledger

| Item | Trials |
|---|---|
| Baseline | 31 |
| Run A (frictionless validity) | 1 |
| Run B (realistic) | 1 |
| **After** | **33** |

Exactly the budget. At 33 trials the Deflated Sharpe treats any survivor with
deep suspicion, and this object is assembled from 19 already-rejected
strategies.

---

## 7. Where six campaigns leave the factory

**Standing: 0 survivors from 20 candidates, 1 arithmetic portfolio and 1
implemented portfolio.**

The conclusion is now specific and well-supported rather than a shrug:

> The best object this factory can build from its library — 19 strategies
> equally weighted, netted, and charged real commissions — earns **3.93%/yr at
> 11.2% drawdown**. That beats SPY and 60/40 on every risk-adjusted measure and
> beats a drawdown-matched passive blend by 17.8%. It is still short of a 4%
> return floor set before any of this began.

The binding constraint is **the absolute return level**, and it has now been
confirmed three independent ways: individually (20 candidates, none above
7.4%), arithmetically (3.91%), and in a real implementation with costs (3.93%).

### What I recommend

1. **Stop searching this space.** Daily bars on liquid ETFs, long-only and
   dollar-neutral, cannot produce 4%/yr at low drawdown from this library. Six
   campaigns and 33 trials is a sufficient sample to say so.
2. **If the research continues, change the data, not the bar.** Intraday bars,
   single-stock universes with survivorship handling, or options — each opens
   mechanisms this data set structurally cannot express (the 087 sleeve could
   not even short).
3. **Do not lower the 4% floor and do not re-cut the hurdle.** The blend is a
   quarter-point short under every measurement method tried. That is a real
   answer, and it is more valuable than a manufactured pass.

The factory worked. It was built to destroy strategies honestly, and over six
campaigns it destroyed twenty of them, two portfolios, one of my own test
designs, and several of my predictions — including both in this campaign.
