# CPCV ranking metric — why the gate now reports two numbers

**Date:** 2026-08-17 · **Status:** implemented

## The defect

CPCV asks: *if I pick the configuration that looks best in-sample, does it hold
up out-of-sample?* That question contains a hidden assumption — **what "best"
means**. The gate originally ranked configurations by mean block **total
return**, which ignores dispersion entirely.

Every goal in this pipeline is risk-adjusted (ret/DD bars, drawdown caps). So
the gate was answering a question the factory never asks. The disagreement is
not hypothetical — on candidate 025 the raw-return ranking favoured a
configuration carrying a **29.5% drawdown** over one at **14.0%**. No
researcher here would have picked it, yet the gate treated it as the selection
under test.

## The first attempt, and why it was wrong

The obvious fix — rank by Sharpe over the block returns — is **not** canonical
CSCV and behaves badly. After purge/embargo an in-sample set holds only 3–4
blocks, so a Sharpe computed from those aggregates has 3–4 observations. Two
synthetic probes showed the consequence: near-constant series drew
astronomically large ratios and rankings became erratic, moving PBO in the
*opposite* direction from the one the construction intended.

Bailey and López de Prado compute the performance metric over the **underlying
return series** inside each sub-sample, not over block aggregates.

## What was implemented

- `sliceEquityIntoBlockDailyReturns()` retains each block's daily returns.
- `computeCpcv()` accepts `blockDailyReturns` and computes the risk-adjusted
  ranking over **pooled daily returns** of the selected blocks — hundreds of
  observations per sub-sample rather than three or four. Without it, the
  function falls back to aggregate scoring.
- **Both rankings are always computed and reported** (`pboBySharpe`,
  `pboByTotalReturn`) from the same splits and the same purge/embargo, so they
  are directly comparable. `metric` selects which drives the headline `pbo`;
  default is risk-adjusted.
- `cpcvVerdict()` **flags disagreement**: if the two rankings fall on opposite
  sides of the 0.5 threshold, the reason string says the verdict is unsettled.
- The runner supplies daily returns automatically; the UI shows both numbers.

## Verification

**Null calibration** (pure noise, true PBO = 0.50), pooled dailies:

| configs | risk-adjusted | raw return |
|---|---|---|
| 3 | 0.5010 | 0.5009 |
| 4 | 0.5388 | 0.5374 |
| 5 | 0.4806 | 0.4795 |
| 6 | 0.5083 | 0.5055 |

Both unbiased at every grid size.

**Recorded verdicts are unchanged**, recomputed on the stored equity curves:

| candidate | risk-adjusted | raw return | verdict |
|---|---|---|---|
| 073 GTAA (6 cfg) | 0.6818 | 0.7273 | FAIL — agree |
| 025 Double 7s (3 cfg) | 0.4545 | 0.3864 | PASS — agree |

The upgrade moved the numbers but flipped no conclusion, which is the outcome
that makes it safe to adopt. **Persisted gate results were not rewritten** —
they stand as recorded, and this note is the audit trail.

## Caveats

- The aggregate fallback remains available and remains noisy. Prefer supplying
  daily returns; the runner now always does.
- 20 unit tests cover the metric, including a constructed case where raw return
  is fooled by a volatile configuration and the risk-adjusted ranking is not.
