# Campaign #2 — Batch 2 Report

**Run:** 2026-07-14, real LEAN engine, daily data through 2026-07-14
**Pre-registration:** `PREREGISTRATION.md` (committed before any run; goal bars unchanged from batch 1)
**Result: 0 of 6 passed feasibility** (4 fail, 2 cannot_evaluate). Pre-stated expectation was 0–2.

## Verdicts

| # | Strategy | Ann. % | Ret/DD | MaxDD % | Trades/yr | Closed | Verdict | Note |
|---|---|---|---|---|---|---|---|---|
| 081 | Gap Budget Fade (NOVEL) | −0.4 | −0.02 | 21.0 | 5.3 | 69 | **FAIL** | negative — premise inverted |
| 086 | Vol-of-Vol Gate (NOVEL) | 5.4 | 0.20 | 27.3 | 2.4 | 31 | **FAIL** | +293% total, but DD + too few trades |
| 090 | Liquidity Vacuum Fade (NOVEL) | 0 | — | 0 | 0 | 0 | **CANNOT_EVAL** | no instances on index data |
| 099 | Vol Lifecycle Migration (NOVEL) | 0.8 | 0.10 | 8.8 | 1.0 | 13 | **CANNOT_EVAL** | 13 trades < 30 significance floor |
| 045b | Turn-of-Month + Regime (FIX) | 2.9 | 0.21 | 13.7 | 17.2 | 223 | **FAIL** | DD fixed; ret/DD short |
| 047b | Halloween + Regime (FIX) | 3.5 | 0.18 | 19.4 | 5.2 | 67 | **FAIL** | DD halved; still over cap |

**Trial ledger:** 6 `backtest` trials recorded (13 → 19). Combined with batch 1,
these strategies' DSRs are deflated by the full campaign history.

## The signal in the failures

### The calendar regime-filter fixes worked — measurably — but not enough
This was the batch's real question, and the answer is nuanced and useful:

| | Batch-1 (no filter) | Batch-2 (+200-SMA regime) |
|---|---|---|
| **045 Turn-of-Month** DD | 31.1% (failed the cap) | **13.7% — now UNDER the 15% cap** |
| 045 ret/DD | 0.12 | 0.21 |
| **047 Halloween** DD | 35.1% (failed the cap) | **19.4% (halved)** |
| 047 ret/DD | 0.14 | 0.18 |

The 200-day-SMA regime filter did exactly what it was hypothesized to do:
**045b's drawdown failure is completely fixed** (31% → 13.7%, inside the cap),
and 047b's is roughly halved. The filter earns most of the drawdown budget.
What it cannot do is manufacture return — both still fail the 0.30 ret/DD bar
because the underlying calendar premium, once you subtract the sit-in-cash
periods, is simply thin. **Verdict: the fix is directionally validated on risk,
rejected on edge.** A batch-3 could legitimately test these against a lower,
disclosed ret/DD bar — but that would be a *new* pre-registration made knowing
these numbers, and the report would say so.

### The novels
- **081 Gap Budget Fade** — actively *negative* (−0.4% ann). Repeated
  same-direction down-gaps continued rather than reverting; the "exhaustion"
  premise is backwards on SPY. Cleanly falsified.
- **086 Vol-of-Vol Gate** — the seductive one: +293% total return, the biggest
  in either campaign. But 27.3% drawdown, ret/DD 0.20, and just 2.4 trades/yr.
  A perfect illustration of why the pipeline judges ret/DD, not the headline —
  the gate reduces whipsaw but doesn't cap tail risk, and it trades too rarely
  to clear the trend-archetype floor.
- **090 Liquidity Vacuum Fade** — **0 trades in 26 years.** A large move on
  *low* volume essentially never happens on a mega-cap index (big moves come
  with big volume). The counterparty this needs — someone chasing price
  through an empty book — doesn't exist in SPY. The hypothesis requires
  single-stock/mid-cap data the pipeline doesn't have; honestly untestable
  here rather than tested badly.
- **099 Vol Lifecycle Migration** — only 13 trades; the migration-into-mid-band
  condition is too rare on one index to reach statistical significance. Its
  8.8% drawdown was the tightest in the batch, but there simply isn't enough
  evidence to rule on.

## Process notes
- Empty-body gates worked 6/6 (Phase 9 linkage); no hand-built payloads.
- All six produced `live_engine` data on the first attempt — no engine
  failures this batch (the Phase-9 retry + errorLog stood ready but wasn't
  needed).
- Two `cannot_evaluate`s (090, 099) are the sample-size guard doing its job:
  the pipeline refuses to render a verdict on 0 and 13 trades rather than
  pretending 13 trades is evidence.

## Disposition
All six remain at `idea`/`gateStatus: failed` (or unadvanced) in Postgres —
durable verdicts. No strategy advances; no goal was revised retroactively.
Across both campaigns: **16 candidates tested, 0 survivors, 19 trials logged.**
The established edges are thin in the modern sample and the novel hypotheses
are not surviving contact with real data — which is the factory working, not
failing. The most promising thread for batch 3 is the regime-filtered calendar
pair against an explicitly-lowered, disclosed ret/DD bar.
