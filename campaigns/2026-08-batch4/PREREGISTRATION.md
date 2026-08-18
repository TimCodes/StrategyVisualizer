# Campaign #4 — Batch 4 Pre-Registration

**Date locked:** 2026-08-17 (committed BEFORE any batch-4 engine run)
**Trial ledger baseline:** 24
**Question:** With a properly calibrated bar and CPCV in the gauntlet from the
start, does any archetype in the library survive?

---

## 1. What batch 3 got wrong, and the single change here

Batch 3 proposed a drawdown-matched passive alternative test and its own
bar-validation stage rejected it: the test passed **8 of 16** previously-failed
candidates against a pre-registered limit of 4. The defect was the cash yield.
I set it to **0%**, reasoning it was "most favourable to the candidate so a
failure would be undeniable" — conflating *conservative toward the candidate*
with *conservative as a test*. With 0% cash the passive alternative is holding
25% SPY and leaving 75% of capital earning nothing for two decades; almost
anything beats that.

**The one change in batch 4: the cash yield is measured, not assumed.**

`BIL` (SPDR 1-3 Month T-Bill ETF) is in the data set from 2007-05-30. Its
realised total return over the campaign window *is* the risk-free rate an
investor actually earned on idle capital — no assumption required. Batch 3's
own sensitivity table showed a ~2% cash yield admits **3 of 16**, which is a
filter rather than a sieve, but a measured rate is defensible in a way that a
hand-picked constant is not.

Everything else about the test is unchanged from batch 3.

---

## 2. Prior-knowledge conflict (disclosed, as in batch 3)

I designed this knowing batch-3's results, including that a ~2% cash yield
produces ~3 passers. That is precisely the kind of knowledge that makes a
"corrected" bar suspect. Mitigations, all pre-registered:

1. The cash yield is **measured from market data**, removing my discretion over
   the number that broke batch 3.
2. **Dual reporting** against the original flat 0.30 ret/DD bar throughout.
3. **The section 5 red line survives unchanged** — if the corrected test still
   admits more than 4 of 16 priors, batch 4 is declared INCONCLUSIVE and the
   drawdown-matched approach is abandoned for good rather than tuned a third
   time. **This is its last attempt.**

---

## 3. The test

From two benchmark runs (section 4): SPY buy-and-hold `R_bh`, `D_bh`; and BIL
buy-and-hold annualised return `c` (the measured cash yield). For a candidate
with annualised return `R_s` and max drawdown `D_s`:

```
w              = D_s / D_bh                  # SPY weight carrying the same drawdown
passive_return = w * R_bh + (1 - w) * c      # the lazy alternative
PASS  iff  R_s > 1.25 * passive_return
```

The `1.25` premium (25%, for overfitting risk, costs and attention that a
passive blend does not carry) is unchanged from batch 3 and is **not** revisited.

**Sensitivities reported, never pass/fail:** `c = 0%` and `c = 2x measured`.

**Direction disclosure.** Algebraically this is a drawdown-sensitive ret/DD bar:
`R_s/D_s > 1.25 x [retDD_bh + c/D_s - c/D_bh]`. At `c ~ 2%` and `D_bh ~ 55%`
it requires roughly **0.26** at a 20% drawdown rising to **0.39** at 10% — i.e.
it is *stricter* for low-drawdown strategies than the flat 0.30 it replaces,
and it correctly rewards drawdown reduction rather than treating all risk alike.

---

## 4. Benchmark runs (2 trials)

| Run | Instrument | Purpose |
|---|---|---|
| `B4Benchmark` | SPY buy-and-hold | `R_bh`, `D_bh` |
| `B4Cash` | BIL buy-and-hold | `c`, the measured cash yield |

**Window (pinned): 2008-01-01 -> 2025-12-31** (18 years). Chosen because BIL
begins 2007-05-30 and every candidate instrument is available; it spans the GFC
tail, 2011, 2015-16, COVID and 2022. Both benchmarks and all candidates use
this identical window.

Formulae are locked above, so no discretion remains once the numbers appear.

---

## 5. Bar validation — unchanged red line

Apply section 3 with the measured `c` to all 16 prior candidates using recorded
metrics (no new runs). Priors were scored over 2000-2025 against that era's
benchmark (`R_bh` 8.036%, `D_bh` 54.5%), which is retained for them; only the
measured `c` is carried across. **The period mismatch on `c` alone is a
disclosed approximation** — the cash yield enters as a constant rate either way.

- **More than 4 of 16 pass -> campaign INCONCLUSIVE**, the drawdown-matched
  approach is abandoned permanently, and batch 4's candidate verdicts revert to
  the flat 0.30 bar.
- **0-4 pass -> accepted**, and candidate verdicts stand.

Checked **before** any candidate verdict is interpreted.

---

## 6. Candidates — four distinct mechanisms

Batch 3 concluded: *stop mining single-parameter variations of published
systems.* So these are chosen to test **different sources of edge**, not
different lookbacks on the same one. All are untested by this factory and all
are viable on daily ETF/crypto data.

| # | Strategy | Mechanism being tested | Instruments |
|---|---|---|---|
| **071** | Risk Parity Lite (volatility-weighted multi-asset) | **Diversification/structure** — edge from covariance, not timing. Nearly parameter-free, so least exposed to the selection failure that killed 073. | SPY, TLT, GLD, DBC, VNQ |
| **015** | Dual Momentum (absolute + relative) | **Momentum**, in its best-documented form (Antonacci). Distinct from 073's per-sleeve SMA filter: relative selection *plus* an absolute cash gate. | SPY, EFA, EEM, AGG, BIL |
| **054** | Sector ETF Pair Spread Reversion | **Relative value** — a mechanism this factory has never tested. Market-neutral, so its drawdown profile is structurally unlike anything in batches 1-3. | XLK/XLI, XLP/XLY |
| **087** | Crypto Weekend Dislocation Reversion (NOVEL) | **Structural liquidity** — thin weekend order books in a market that never closes. Different asset class; no equity-market analogue. | BTCUSD, ETHUSD |

Rejected for lack of data, recorded so the slate is not mistaken for a ranking:
all options strategies (059-067, no options data), intraday (035, 044, 074-079,
no intraday bars), single-stock (018, 019, 056, 095), and VIX term structure
(061, index only, no VX futures).

---

## 7. Gauntlet and locked goals

**Staged, to spend trials only where they buy information:**

- **Stage 1 (all 4):** backtest -> feasibility. 1 trial each.
- **Stage 2 (feasibility survivors only):** walk-forward -> **CPCV** ->
  trade-level Monte Carlo. 2 further trials each.

CPCV is in the gauntlet from the start, per the policy the 073/025 runs
established: *any candidate within ~15% of a bar faces CPCV before anyone
argues about the bar.* Here it applies to every survivor, not just near-misses.

**Locked CPCV configuration — even grids throughout** (the 025 campaign showed
odd grids admit an exact-median rank; even sizes avoid it entirely):

| # | Grid (4 configs each) | Blocks | Embargo |
|---|---|---|---|
| 071 | vol lookback in {20, 40, 60, 90} days | 8 | 1 |
| 015 | momentum lookback in {63, 126, 189, 252} days | 8 | 1 |
| 054 | z-score entry in {1.5, 2.0, 2.5, 3.0} | 8 | 1 |
| 087 | z-score entry in {1.0, 1.5, 2.0, 2.5} | 8 | 1 |

**Primary CPCV metric: risk-adjusted** (pooled daily returns), per
`docs/CPCV_RANKING_METRIC.md`. Both rankings reported; **if they disagree, the
candidate's CPCV verdict is recorded as unsettled and the candidate does not
advance.** Pass requires PBO < 0.50.

**Locked goals — risk caps frozen from batch 2, unchanged:**

| Bar | Value |
|---|---|
| max drawdown | 20% |
| max risk of ruin | 0.10 |
| min annualised return | 4% |
| min trades/yr | 4 (071, 015) / 8 (054, 087) |
| min ret/DD (app gate only) | **0.26** |

The 0.26 app-gate floor is the section 3 formula evaluated at its *loosest*
point (the 20% drawdown cap), so the app's feasibility gate can never reject a
candidate the binding formula would accept. **The formula in section 3 is the
binding return bar**; the app gate enforces the risk caps.

---

## 8. Trial budget

| Stage | Trials |
|---|---|
| Baseline | 24 |
| Benchmarks (SPY, BIL) | 2 |
| Stage 1 backtests (4) | 4 |
| Stage 2 (per survivor: WF + CPCV) | 2 each |
| **Projected if 0-1 survive** | **30-32** |

Past ~30 trials the Deflated Sharpe treats any survivor with deep suspicion,
and that is the correct posture. Recorded here so the cost is visible in
advance rather than rationalised afterward.

---

## 9. Expectations, locked

- **0 of 4 clear section 3 (~60%).** Three campaigns say classic edges are real
  but too thin to carry their own risk.
- **1 clears section 3 but fails CPCV or MC (~30%).** 071 is the most likely to
  reach Stage 2 and the least likely to fail CPCV, having almost nothing to
  select.
- **1 clears everything and enters incubation (~10%)** — the factory's first
  survivor in 20 candidates.
- **Bar validation:** expect **3 of 16** priors to pass (batch-3's 2% column).
  More than 4 ends the approach permanently.

Most interesting single outcome: **071 passing while 015 fails**, which would
say the factory's edge lies in portfolio structure rather than in timing — a
different kind of finding from anything in batches 1-3.

---

## 10. Procedure

1. Commit this document. **No engine run before the commit lands.**
2. Benchmarks (section 4); record `R_bh`, `D_bh`, `c` verbatim.
3. Bar validation (section 5); **check the red line first**.
4. Stage 1 for all four; then Stage 2 for survivors only.
5. `REPORT.md` + `results.json`; backup; commit and push.
