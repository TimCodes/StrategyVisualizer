# Campaign #3 — Batch 3 Report

**Run:** 2026-08-17 · **Trials spent:** 1 (ledger 20 → 21)
**Outcome:** **INCONCLUSIVE — pre-registered red line tripped.** The proposed
test was rejected by its own validation stage. No candidate advanced.

---

## Verdict in one paragraph

The campaign proposed replacing the flat `ret/DD ≥ 0.30` bar with a
drawdown-matched passive alternative test. One benchmark run supplied SPY
buy-and-hold's numbers, and the candidate — 045b, Turn-of-Month with a
200-SMA filter — **passed** that new test. It does not matter, because the
§5 bar-validation stage, locked before any run, then showed the new test also
passes **8 of the 16 previously-failed candidates** — double the pre-registered
limit of 4. A filter that admits half of everything the factory has ever
rejected is not a filter. Per §5 the test is rejected, the campaign is
declared inconclusive, and **045b reverts to its batch-2 FAIL**. The factory's
standing record is unchanged: **0 survivors from 16 candidates.**

---

## 1. Benchmark (§4)

SPY buy-and-hold, 2000-01-03 → 2025-12-31 (batch-2's pinned window),
`dataSource: live_engine`, project `B3Benchmark`.

| Metric | Value |
|---|---|
| Total return | 645.71% |
| Annualized `R_bh` (app method, 25.995 yrs) | **8.036 %/yr** |
| Max drawdown `D_bh` | **54.5%** |
| Sharpe | 0.366 |
| B&H ret/DD | 0.147 |

The 54.5% drawdown is the 2008 crash and the 0.147 ret/DD matches the ~0.13
figure batch 1 and 2 cited, so the benchmark is behaving as expected.

---

## 2. Bar validation (§5) — the stage that decided the campaign

Test applied to all 16 prior candidates using recorded metrics. Hurdle is
`1.25 × (D_s/54.5) × 8.036` at the primary `cash = 0%`.

| # | ann % | DD % | w | hurdle % | §3 (0%) | §3 (2%) | §3 (4%) | ret/DD ≥0.30† |
|---|---|---|---|---|---|---|---|---|
| 058 | 7.35 | 28.4 | 0.52 | 5.23 | **PASS** | PASS | fail | fail |
| 086 | 5.41 | 27.3 | 0.50 | 5.03 | **PASS** | fail | fail | fail |
| 047 | 5.04 | 35.1 | 0.64 | 6.47 | fail | fail | fail | fail |
| 025 | 4.94 | 16.6 | 0.30 | 3.06 | **PASS** | PASS | fail | fail |
| 073 | 4.65 | 13.1 | 0.24 | 2.41 | **PASS** | PASS | fail | PASS |
| 045 | 3.84 | 31.1 | 0.57 | 5.73 | fail | fail | fail | fail |
| 027 | 3.73 | 13.4 | 0.25 | 2.47 | **PASS** | fail | fail | fail |
| 047b | 3.46 | 19.4 | 0.36 | 3.58 | fail | fail | fail | fail |
| **045b** | **2.94** | **13.7** | **0.25** | **2.52** | **PASS** | fail | fail | fail |
| 026 | 2.85 | 14.0 | 0.26 | 2.58 | **PASS** | fail | fail | fail |
| 023 | 2.83 | 10.7 | 0.20 | 1.97 | **PASS** | fail | fail | fail |
| 030 | 1.76 | 17.9 | 0.33 | 3.30 | fail | fail | fail | fail |
| 091 | 1.20 | 13.4 | 0.25 | 2.47 | fail | fail | fail | fail |
| 099 | 0.84 | 8.8 | 0.16 | 1.62 | fail | fail | fail | fail |
| 090 | 0.00 | 0.0 | 0.00 | 0.00 | fail | fail | fail | fail |
| 081 | −0.41 | 21.0 | 0.39 | 3.87 | fail | fail | fail | fail |

**8 of 16 pass at the primary `cash = 0%`. The red line was > 4. Tripped.**

† **Correction to the dual-report column:** this column applies a uniform 0.30
for reference, but 073 and 058 were rotation-archetype candidates whose actual
locked bar was **0.40** — both failed it (073: 0.355, and it also missed its 5%
return floor at 4.65%; 058: 0.26, plus a 28.4% drawdown over its 20% cap).
Nothing here readmits them.

---

## 3. Why the test failed — the methodological lesson

The error was mine, and it is worth stating precisely because it is subtle.

I set `cash_yield = 0%` as the primary assumption and justified it in the
pre-registration as "deliberately the most favourable to the candidate", so
that a failure would be undeniable. That reasoning conflated two different
things:

- **Conservative toward the candidate** — give it the easiest possible
  alternative to beat. 0% cash does this.
- **Conservative as a test** — be reluctant to pass things.

These point in *opposite* directions. Assuming idle cash earns nothing makes
the passive alternative genuinely pathetic: a strategy with a 13.7% drawdown
is compared against holding 25% SPY and leaving **75% of capital earning zero
for 26 years**. Almost anything beats that. I built the most candidate-friendly
version of a test whose entire job was to be unfriendly.

The sensitivity columns show the shape of it: at a 2% cash yield only 3 of 16
pass (inside the red line), and at 4% none do. A realistic cash assumption
would have produced a defensible test.

**I am not switching to the 2% column.** Choosing the variant after seeing
which one gives a sensible answer is precisely the goal-shopping this campaign
was built to avoid, and §5 named 0% as primary in advance for exactly this
reason. The 2% and 4% figures are reported as diagnosis, not as a verdict.

---

## 4. Candidate verdicts

| Candidate | Status |
|---|---|
| 045b Turn-of-Month + 200-SMA | Passed §3 at 0% cash (2.94% vs 2.52% hurdle) — **VOID**, test rejected. Reverts to **batch-2 FAIL** (ret/DD 0.214 < 0.30). |
| 047b Halloween + 200-SMA | **Eliminated before any run** by the frozen 15% drawdown cap (19.4%). Unchanged. |
| §7 robustness (walk-forward → CPCV → MC) | **Not reached.** §5 is checked first and voided the test. |
| §8 Stage F (046 build) | **Not run** — conditional on 045b surviving. |

**The Phase-14 CPCV gate was not exercised.** It remains unused on live
research, which is a genuine gap: the campaign design let a bar question
foreclose the robustness question.

---

## 5. Trial spend

| Item | Trials |
|---|---|
| Baseline | 20 |
| B3Benchmark SPY B&H run | 1 |
| **Ledger after** | **21** |

Metric reuse for the 16 priors consumed nothing, as pre-registered. One
un-ledgered LEAN CLI smoke run (Demo, SPY 2010–2012) was disclosed in §10 of
the pre-registration; it selected nothing.

---

## 6. Where this leaves the factory

**Still 0 survivors from 16 candidates.** Both calendar candidates are closed:
047b on a drawdown cap it plainly fails, 045b on the ret/DD bar it has now
failed twice, under two different tests, one of which was rejected for being
too generous to it.

What was actually learned:

1. **The regime-filter finding from batch 2 still stands and is still the most
   useful result the factory has produced** — the 200-SMA filter fixes calendar
   drawdown (31%→13.7%). It cannot manufacture return, and turn-of-month's
   return is too thin to survive any honest risk comparison.
2. **The bar-validation safeguard earned its place.** Without §5 this campaign
   would have reported a first survivor and moved 045b toward incubation on a
   broken test. The pre-registration caught its own author.
3. **Cheap campaigns are viable.** One trial produced a definitive negative and
   a re-scoring of every candidate the factory has ever run.

### Recommended next (not run, not pre-registered)

- **Batch 4 with a corrected test, declared in advance:** the drawdown-matched
  comparison is sound; only my cash assumption was wrong. A pre-registration
  specifying a realistic cash yield (e.g. the realised 3-month T-bill series,
  or a fixed 2%) as *primary*, subject to the same §5 red line, would be
  legitimate — because it would be declared before any run and validated the
  same way. On the numbers above such a test admits 3 of 16, which is a filter
  rather than a sieve.
- **Exercise CPCV on real research.** 073 (GTAA) is the natural subject: it is
  the highest-quality candidate the factory has produced (ret/DD 0.355 against
  a 0.40 bar, and it clears the corrected test at both 0% and 2%), and it
  failed by margins thin enough that parameter robustness is the deciding
  question. CPCV is exactly the gate for that.
- **Stop mining calendar effects.** Three campaigns have now established the
  pattern: the premium is real, thin, and cannot carry its own risk.
