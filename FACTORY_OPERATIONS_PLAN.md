# Factory Operations Plan (Roadmap v2)

**Predecessor:** `STRATEGY_FACTORY_IMPLEMENTATION_PLAN.md` — all 8 phases complete
(commits `743fd85` → `502d7bb`). The factory is built: real LEAN engine, every
Davey gate implemented and E2E-verified, Postgres persistence, free Tier 1-3
data, auth + audit hardening, 192 tests.

**The shift:** v1 built the machine. v2 is about *running* it — and every
build item below exists only because operating the factory needs it. The
honest scoreboard so far: 2 strategies tested, 2 failed feasibility on
pre-registered goals. That is the machine working; now it needs throughput.

Guiding constraint carried forward: **preserve the design principles** —
`assertEvaluable()` chokepoint, `lockedAt` pre-registration, trial counting
feeding DSR, the human as the only actor that trades.

---

## Phase 9 — Close the honesty gaps (small, do first)

Gaps in the audit/trial ledger that quietly flatter results. Cheap to fix,
and everything downstream depends on the ledger being right.

1. **Count every real-engine backtest as a trial.** Today only AI
   generation/refinement and walk-forward runs increment the trial count —
   manual backtests iterate free, silently un-deflating the DSR. Extend
   `trialTypeSchema` with `"backtest"` and record a trial on every
   `live_engine` run tied to a strategy.
2. **First-class strategy ↔ LEAN project link.** Add `leanProjectName` to the
   strategy schema so gates can resolve "this strategy's latest live_engine
   backtest" server-side. Today the feasibility/MC payload is hand-assembled
   by the caller — error-prone and unverifiable.
3. **Fix the `backtestId` parameter semantics** in the gate routes (it is
   currently treated as a projectId lookup — a latent bug found during the
   pipeline runs).
4. **LEAN reliability triage.** The engine exited code 1 once (2026-06-16)
   and fell back to the simulator gracefully; capture stderr into the
   backtest `errorLog`, add one automatic retry, and surface engine failures
   in the UI instead of only in server logs.

**Acceptance:** running a backtest for a linked strategy increments the trial
count; `POST .../gates/feasibility` works with an empty body (server resolves
the latest live_engine backtest); a forced engine failure shows its stderr in
the stored result.
**Effort:** 2–3 days.

## Phase 10 — Run the whole gauntlet from the browser

The pipeline is fully drivable by API but only partially by UI — the gate
panel's Run buttons still post placeholder simulated payloads (honest
`cannot_evaluate`, but useless). With Phase 9's linkage this becomes real.

1. Gate panel: backtest picker fed by the linked project's `live_engine`
   results; feasibility/Monte Carlo buttons submit the real thing.
2. Walk-forward: run launcher + live progress (the `wf:progress` socket
   events already exist), windows table, WFE/PBO display.
3. Position-sizing UI: the deferred Phase 5b charts — f-sweep curves
   (return / drawdown / ruin vs f), constraint sliders, lock-plan action.
4. A full strategy detail page (the card panel is bursting).

**Acceptance:** the entire Double-7s-style gauntlet — goals → feasibility →
WF → MC → sizing → quit rule — clickable end-to-end with zero curl.
**Effort:** 1–2 weeks.

## Phase 11 — Research campaign #1 (the actual point)

Can start right after Phase 9, in parallel with Phase 10, since the API path
already works.

1. **Calibrate goal guidance first** (lesson from the failed runs): both
   candidates beat buy-and-hold risk-adjusted but missed absolute goals.
   Write a short goal-calibration note per strategy archetype (mean-reversion
   overlay vs allocation vs trend), anchored to the instrument's own
   buy-and-hold ret/DD as the floor. Goals stay pre-registered — this only
   informs the *next* registration, it never revises a locked one.
2. **Batch 1 (~10 candidates)** from the library: daily-bar, data-available,
   parameter-light — suggested: 023 RSI(2), 025 re-registration, 026, 027 IBS,
   030 VIX-spike, 045 turn-of-month, 047 Halloween, 058 stock/bond ratio,
   073 GTAA re-registration, 091 stress-divergence (first novel).
3. Pre-register all ten (edges + goals + WF configs where parameterized),
   then run feasibility across the batch; survivors proceed to WF → MC;
   MC-passers start real 90-day incubations.
4. **Campaign report** in-repo: verdicts, trial spend, DSR context, and the
   discard list with reasons. Expect 0–3 survivors; say so plainly.

**Acceptance:** ten durable verdicts in Postgres, every trial counted, at
least one strategy in incubation (or an honest report that none earned it).
**Effort:** ~1 week elapsed (engine hours dominate).

## Phase 12 — Incubation automation

Incubation currently depends on hand-entered observations; 90 days of manual
data entry will not happen in practice.

1. **Nightly ghost runs:** a scheduled job re-runs each incubating strategy's
   locked code over the trailing window on fresh data and auto-logs the daily
   P&L as `source: "paper"` observations. (Requires the data refresh in
   Phase 13 to keep bars current.)
2. Scheduler infrastructure (node-cron or OS scheduler invoking a script) +
   an `incubation:observed` socket event; quit-rule breaches already alarm.
3. Optional: outbound notification (webhook/email) for quit-rule and
   review-due alerts, so incubation genuinely runs unattended.

**Acceptance:** an incubating strategy accrues observations for a week with
zero human input, visible on `/monitoring`.
**Effort:** ~1 week.

## Phase 13 — Data expansion & freshness

1. **Scheduled refresh:** weekly `data:refresh` run (same scheduler as
   Phase 12) + a staleness detector comparing `PROVENANCE.md` coverage
   against today; stale data warns on `/api/system/status`.
2. **FX daily** (deferred from the original pipeline): unlocks 044 London
   breakout (daily approximation), 068 FX carry.
3. **Decision gate — paid data:** intraday (~12 strategies) needs minute
   bars (Polygon/Databento ~$30–200/mo); options strategies (9) need
   IV/chain history (ORATS-class, pricier). Decide per-campaign whether the
   strategy set justifies the spend; until then those docs stay marked
   untestable — never tested badly.

**Effort:** 2–3 days (excluding the paid-data decision).

## Phase 14 — Methodology upgrades

The known statistical improvements, in order of value:

1. **CPCV (Combinatorial Purged Cross-Validation):** the literature finds it
   strictly stronger than single-split walk-forward on both PBO and DSR.
   Implement as an additional gate mode reusing the existing grid runner;
   report CPCV-PBO alongside WFE.
2. **Multi-system portfolio sizing** (deferred Phase 5c): joint f-sweep
   across all live/incubating strategies using combined daily P&L —
   correlation-aware sizing instead of per-strategy.
3. **Regime-conditional reporting:** split gate metrics by volatility regime
   (the vol-of-vol tercile machinery from strategy 086 exists conceptually)
   so a pass isn't secretly a single-regime artifact.

**Effort:** 2–3 weeks, best done after campaign #1 surfaces real needs.

## Phase 15 — Ops & deployment (as needed)

1. **Postgres backups:** scheduled `pg_dump` of the `praxis_pgdata` volume —
   the trial ledger and gate history are now the crown jewels.
2. Decide the hosting story: local-first is the working model; either
   re-verify the Replit path against everything new (auth, sessions,
   node-postgres, `--env-file-if-exists` on Node 20) or retire it in docs.
3. README ops section: backup/restore, data refresh cadence, incubation
   scheduler.

**Effort:** 2–3 days.

---

## Sequencing

| Phase | What | Effort | Depends on |
|---|---|---|---|
| 9 | Honesty gaps (trial ledger, linkage, LEAN triage) | 2–3 days | — |
| 10 | Full pipeline UI | 1–2 wk | 9 |
| 11 | Research campaign #1 | ~1 wk | 9 (not 10) |
| 12 | Incubation automation | ~1 wk | 11 started, 13.1 |
| 13 | Data freshness + FX; paid-data decision | 2–3 days | — |
| 14 | CPCV, portfolio sizing, regime reporting | 2–3 wk | after 11 |
| 15 | Backups, deployment story | 2–3 days | any time |

**Recommended order:** 9 → 11 kickoff (campaign runs while building) → 10 →
13 → 12 → 14 → 15. Roughly 6–8 weeks to a factory that runs campaigns with
automated incubation — but the first new verdicts land in week one.

## What "done" looks like for v2

Not a feature list — an operating rhythm: candidates enter from the library
or the research agent, pre-registered and gated on fresh data; incubations
tick forward nightly without a human; the monitoring page is the morning
"How We Doin'" read; the trial ledger deflates every claim automatically;
and most strategies still die — durably, auditably, and for the right
reasons.
