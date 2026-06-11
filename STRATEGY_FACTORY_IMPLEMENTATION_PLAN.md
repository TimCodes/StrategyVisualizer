# Strategy Factory Implementation Plan

**Source methodology:** Kevin J. Davey, *Building Winning Algorithmic Trading Systems* (Wiley, 2014)
**Goal:** Close the gap between the book's full strategy-development process and what Praxis implements today, so every pipeline stage (`idea → feasibility → walk_forward → monte_carlo → incubation → diversification_sizing → live`) has real, evaluable tooling behind it.

---

## Gap Map: Davey's Process vs. Praxis Today

| # | Davey step (chapter) | Praxis status |
|---|---|---|
| 1 | Goals & objectives declared up front (Ch 9) | ❌ Missing — only a free-text `edge` is required |
| 2 | Trading idea with a stated edge (Ch 10) | ✅ Edge critique gate (`assessEdge`) |
| 3 | Limited / preliminary testing (Ch 12) | ❌ `feasibility` stage has no tooling |
| 4 | Walk-forward analysis (Ch 13) | ❌ Scaffold only — `computeWalkForward()` always returns `cannot_evaluate`; config storage exists |
| 5 | Monte Carlo simulation (Ch 14, 19) | 🟡 Equity-curve bootstrap with ret/DD > 2.0 + risk-of-ruin gates exists; missing trade-level resampling, starting-capital solver, probability-of-profit, quitting equity |
| 6 | Incubation, 3–6 months (Ch 14, 23) | 🟡 `computeIncubationVerdict` implemented with real pass/fail logic; observations are manual and **stored in memory only** |
| 7 | Diversification measurement (Ch 15) | ❌ Missing entirely |
| 8 | Position sizing / money management (Ch 16, 19, 20) | ❌ Missing entirely — `diversification_sizing` stage has no tooling |
| 9 | Documenting the process (Ch 17) | ✅ `gateHistory`, `refinementHistory`, trial counter |
| 10 | Monitoring a live strategy (Ch 23–24) | ❌ Missing entirely — no performance bands, efficiencies, or quit rules |
| 11 | Real (non-simulated) backtest engine | 🟡 LEAN runner written but unverified (`TODO(local)` markers); all current results are `Math.random()` |

Engineering prerequisites identified in the repo review that block the above:

- **Persistence**: trades, backtests, gate results, trials, and incubation observations live in `MemStorage` only. A 90-day incubation cannot survive on in-memory state.
- **Broken root scripts**: `npm run dev`/`build` point at `server/index.ts` instead of `packages/server/index.ts`; no `workspaces` field; `NODE_ENV=x cmd` syntax fails on Windows.
- **No auth**: every endpoint is open, including ones that act with real Kraken/IBKR keys.
- **`.env` not gitignored**; path traversal via `projectName` in `lean-runner.ts`.

---

## Phase 0 — Repo Hygiene (half a day)

Small fixes that everything else sits on.

1. Fix root [package.json](package.json) scripts: `tsx packages/server/index.ts`, `esbuild packages/server/index.ts`; add `cross-env` for Windows (`cross-env NODE_ENV=development ...`).
2. Add `"workspaces": ["packages/*"]` to root package.json (or delete the three stub package.json files and update docs — pick one, stop claiming a workspace that doesn't exist).
3. Add `.env*` and `lean-workspace/` to [.gitignore](.gitignore).
4. Sanitize `projectName` in [lean-runner.ts](packages/server/services/lean-runner.ts): reject anything not matching `/^[A-Za-z0-9_-]+$/` before `path.join`.
5. Move `vitest` to `devDependencies`; remove unused deps (`passport`, `passport-local`, `express-session`, `connect-pg-simple`, `memorystore`) until Phase 7 needs auth, or keep and wire them there.
6. Fix the error middleware in [packages/server/index.ts](packages/server/index.ts) — remove `throw err` after the response is sent.

**Acceptance:** `npm run dev` works on Windows and Replit; `npm test` and `npx tsc` pass.

---

## Phase 1 — Full Postgres Persistence (1–2 weeks)

**Why first:** incubation (90 days), monitoring (months), and trial counting (the DSR input) are meaningless if a restart wipes them. Strategies/settings/LEAN entities already have the hybrid db-or-memory pattern in [storage.ts](packages/server/storage.ts) — extend it.

1. Add pgTable definitions in [shared/schema.ts](packages/shared/schema.ts) for: `trades`, `backtest_results`, `trials`, `chat_messages` (gate_results and lean_backtests already have tables).
2. Implement the existing "single source of truth" pattern (db when available, Map when null — see `.agents/memory/strategy-persistence.md`) for every `IStorage` method that is memory-only today.
3. Rehydrate jsonb Date fields in mappers (known footgun per memory notes).
4. `drizzle-kit push` migration; seed guards idempotent via count checks.
5. Tests: a storage test suite that runs the memory path (CI) and optionally the db path (local `DATABASE_URL`).

**Acceptance:** restart the server mid-incubation; observations, gate history, and trial counts survive.

---

## Phase 2 — Verify the Real Backtest Engine (1 week, local machine)

**Why second:** Davey's entire process — and the app's own hard rule "no gate passes on simulated data" — is blocked until `dataSource: "live_engine"` results exist.

1. On the local machine with Docker + LEAN CLI (per [LEAN_SETUP.md](LEAN_SETUP.md)), run a real backtest and capture the results JSON.
2. Resolve every `TODO(local)` in [lean-runner.ts](packages/server/services/lean-runner.ts): statistics key names, equity-curve chart path, closed-trades path, results filename.
3. Add a fixture test: check a real (anonymized) LEAN results JSON into `__tests__/fixtures/` and assert `parseLeanResults` extracts all metrics.
4. Extend `ParsedLeanResult` with **trade-level results** (per-trade P&L list) — Phases 4–6 need trade distributions, not just the equity curve.
5. Wire `POST /api/lean/backtest` to prefer the real runner when `LEAN_ENABLED=true` and tag `dataSource: "live_engine"` (route plumbing partially exists in [routes/lean.ts](packages/server/routes/lean.ts)).
6. Data quality (Davey Ch 11): record the data vendor/resolution/date-range in the backtest record so results are auditable.

**Acceptance:** A Monte Carlo gate run against a real LEAN backtest returns `pass`/`fail` instead of `cannot_evaluate`, end to end from the UI.

---

## Phase 3 — Strategy Goals & Feasibility Gate (Davey Ch 9 + 12) (1 week)

Davey: declare goals **before** testing, then "compare results to your goals; if it fails, discard." The app's `feasibility` stage currently has nothing behind it.

1. Schema: add `goals` to the strategy —
   ```ts
   goals: {
     minRetDDRatio: number,      // Davey default 2.0
     maxDrawdownPct: number,
     maxRiskOfRuin: number,      // Davey default 0.10
     minAnnualReturnPct: number,
     minTradesPerYear: number,
     lockedAt: Date,             // immutable once set — changing goals mid-pipeline is optimization
   }
   ```
2. Lock semantics: `goals` can only be set once, while `stage === "idea"`. PATCH strips it afterward (same pattern as gate fields).
3. New gate `POST /api/strategies/:id/gates/feasibility`: takes a backtest (live_engine only, `assertEvaluable` first), runs Davey's preliminary checks — meets goals, average trade > slippage/commission buffer, enough trades for significance (≥30), no "too good to be true" red flags (flag Sharpe > 4 or win rate > 90% for manual review rather than auto-pass).
4. UI: goals form on strategy creation (after the edge critique step); feasibility section in [GatePipelinePanel.tsx](packages/client/src/components/strategies/GatePipelinePanel.tsx).
5. All later gates compare against `strategy.goals` instead of hardcoded thresholds (keep current values as defaults when no goals set).

**Acceptance:** A strategy cannot pass `feasibility` without locked goals and a live-engine backtest meeting them.

---

## Phase 4 — Walk-Forward Engine (Davey Ch 13) (2–3 weeks, the big one)

The centerpiece of Davey's in-depth testing. Replace the `computeWalkForward()` scaffold with a real implementation driven by LEAN.

### 4a. Parameter optimization runner
1. Extend the LEAN project model with declared parameters: `parameters: { name, min, max, step }[]` (LEAN supports `lean optimize` / parameterized backtests).
2. New service `walk-forward-runner.ts`: given `walkForwardConfig` (already in schema: `inSampleDays, outOfSampleDays, anchored, numWindows, lockedAt`) —
   - Slice the date range into IS/OOS windows (anchored or rolling).
   - For each window: optimize over IS (grid over declared params, fitness function), then run the best params over the adjacent OOS window.
   - Stitch OOS segments into the walk-forward equity curve.
3. Fitness function options (Davey's three): `net_profit` (default), `return_on_account`, `equity_linearity` — stored in `walkForwardConfig`, **locked before the run** (Davey: choosing after the fact is optimization).
4. Long-running job handling: run as a background job with Socket.IO progress events (reuse the lean backtest streaming pattern); persist a `walk_forward_runs` table (windows, per-window params, OOS results, stitched curve).

### 4b. The gate
5. Implement `computeWalkForward(run, goals)` for real:
   - **WFE (walk-forward efficiency)** = annualized OOS profit / annualized IS profit; pass threshold ≥ 50% (configurable in goals).
   - Stitched OOS curve must meet the strategy's goals (ret/DD, max DD).
   - Consistency check: ≥ 50% of OOS windows profitable.
6. Guard against in/out-period optimization (Davey's "walk-forward inside a walk-forward" warning): `walkForwardConfig.lockedAt` already exists — enforce that config cannot change after the first run for a strategy; re-running with different windows requires a new trial record (increments the DSR trial count — the honest cost of trying again).

### 4c. Wire PBO
7. The full CSCV algorithm already exists in [pbo.ts](packages/server/services/pbo.ts) and is unit-tested. Feed it the optimization matrix from 4a (rows = time slices, columns = parameter combos' returns) and replace `pboCannotEvaluate()`. Gate: PBO < 0.5 warns, < 0.2 passes clean (informational alongside the WF verdict, like DSR).

**Acceptance:** From the UI: lock a WF config, run it against LEAN, watch progress stream, get a pass/fail with WFE + PBO + stitched OOS equity curve rendered.

---

## Phase 5 — Monte Carlo Upgrades & Position Sizing (Davey Ch 14, 16, 19, 20) (2 weeks)

### 5a. Trade-level Monte Carlo (upgrade existing gate)
1. Current MC resamples equity-curve returns. Davey resamples **individual trades**. Now that Phase 2 provides trade lists, add `computeMonteCarloFromTrades(trades, config)` alongside the existing one; prefer it when trade data exists.
2. Add Davey's missing inputs/outputs:
   - Inputs: `startingEquity`, `quittingEquity` (ruin level), `tradesPerYear`.
   - Outputs: probability of profit in one year, median annual return %, return/DD ratio, risk of ruin, percentile bands per trade-count (needed by Phase 7 monitoring bands).
3. **Starting-capital solver** (Ch 19/20): sweep starting equity, find the minimum where risk of ruin < goal threshold (default 10%). Output: "you need $X to trade this."

### 5b. Position sizing module (new — powers the `diversification_sizing` stage)
4. New service `position-sizing.ts`:
   - Fixed-fractional model: `N = floor(f × equity / largestLoss)` with `largestLoss` from walk-forward results.
   - **f-sweep via Monte Carlo**: simulate over f ∈ (0, 1], plot median return, median max DD, ret/DD, risk of ruin vs f; recommend max f subject to user's max-DD and risk-of-ruin constraints (Davey's exact procedure, Fig 16.1). Mark optimal-f for reference but never recommend it (Davey: "Wow! Those values are too high for me").
5. Schema: `strategy.positionSizingPlan: { model: "fixed_fractional", f, largestLoss, startingCapital, constraints, lockedAt }` — locked before going live; the monitoring phase checks adherence.
6. UI: sizing panel with the four f-sweep charts (recharts), constraint sliders, "lock plan" action.

### 5c. Multi-system sizing (after Phase 6 lands)
7. Portfolio-level f-sweep: joint Monte Carlo across all strategies marked for live trading using **combined daily returns** (preserves correlation — Davey Ch 19's combination technique), optimizing per-strategy f values subject to portfolio DD/ruin constraints.

**Acceptance:** The `diversification_sizing` gate requires a locked position-sizing plan whose Monte Carlo (at the chosen f) still meets goals.

---

## Phase 6 — Diversification Analyzer (Davey Ch 15) (1 week)

New service `diversification.ts` + API + UI panel. All inputs must be live-engine data (`assertEvaluable`).

1. **Daily-return correlation**: pairwise correlation matrix of daily returns across candidate + existing live/incubating strategies; full-history and rolling 6-month windows (Davey warns correlations spike in crises — show the rolling max, not just the mean).
2. **Combined equity curve**: sum daily returns; compute combined max DD and R² linearity vs each component (Davey Table 15.1–15.2).
3. **Combined Monte Carlo**: ret/DD and probability-of-profit for portfolio-with vs portfolio-without the candidate (Davey Table 15.3 — this is the actual gate criterion).
4. Gate `POST /api/strategies/:id/gates/diversification`: **pass** iff adding the strategy improves (or doesn't materially worsen) portfolio ret/DD and correlation with every existing system < threshold (default 0.7).
5. UI: correlation heatmap, combined-vs-individual equity overlay, verdict card.

**Acceptance:** Two intentionally-correlated strategies: second one fails the gate. Complementary pair: passes with improved combined ret/DD shown.

---

## Phase 7 — Incubation Hardening + Live Monitoring Dashboard (Davey Ch 23–24) (2–3 weeks)

The biggest pure-feature gap. Davey's monitoring kit: bird's-eye chart, monthly summary, efficiencies, statistical performance bands, and pre-declared quit rules.

### 7a. Expected-performance baseline
1. When a strategy passes `monte_carlo`, snapshot `expectedPerformance`: avg per-trade/per-day profit, std dev, expected trades/year, expected max DD, and **Monte Carlo percentile curves** (P2.5/P10/P50/P90/P97.5 cumulative-P&L by day-count — Davey prefers MC percentiles over normal-distribution bands because trade distributions are skewed). Persist on the strategy.

### 7b. Performance tracking
2. Observation ingestion: extend incubation observations to daily P&L records (paper/live/manual provenance already in schema). For live stage, auto-ingest fills from broker connectors into daily records (read-only — `getOrders`/`getPositions` are not blocked by the trading guard).
3. **Daily tracking chart** (Davey Fig 23.7/23.8): cumulative actual P&L vs `n × avg` expectation line, ±1σ/±2σ bands *and* MC percentile bands. Flag when the curve crosses below the P10 line ("the system may be different from its backtest").
4. **Return efficiency** = actual / expected return; **drawdown efficiency** = 1 − (actual / expected DD) (Davey's two key columns). Computed per strategy, shown on a **monthly summary table** across all live + incubating strategies ("How We Doin'" report).
5. Trade-count check: actual trades vs historical range (Davey week-7 review) — fewer/more trades than the historical min/max is a warning.
6. "Too good to be true" flag: performance above the P97.5 band is a warning, not a celebration (Davey Fig 23.4 — keep incubating).

### 7c. Quit rules
7. Schema: `strategy.quitRule: { type: "max_drawdown" | "percentile_floor", value, lockedAt }` — **must be locked before the strategy enters `live`** (gate on the `live` transition). Davey: "as long as I stick to the rule I create at the start, I'd be doing fine."
8. Monitor evaluates quit rules on every ingested observation; breach emits a `risk:alert` Socket.IO event + persistent red banner. The app never auto-liquidates — it tells the human the rule fired.

### 7d. Periodic review workflow
9. Davey's standing four-week review questions (surprised? in line with expectations? fills comparable? reason to stop? reason to change sizing?) as a structured review form, persisted as `strategy_reviews` — the app prompts when a review is due (every 4 weeks for live strategies, monthly for incubating).
10. New page `/monitoring`: monthly summary table, per-strategy drill-down (bird's-eye chart: walk-forward + incubation + live segments on one curve, color-coded), review due-dates, quit-rule status.

**Acceptance:** A strategy in incubation shows live percentile bands updating as observations arrive; breaching the quit rule fires an alert; the monthly summary shows efficiencies for every active strategy.

---

## Phase 8 — Auth & Go-Live Hardening (1 week; prerequisite for ever flipping `LIVE_TRADING_ENABLED`)

1. Single-user auth: wire the already-present `passport-local` + `express-session` + `connect-pg-simple`; protect all `/api` routes; login page.
2. Secrets: move Kraken/IBKR keys out of plain env into encrypted-at-rest settings (or at minimum document that env is the boundary); never return key material from any endpoint.
3. Rate-limit LLM endpoints (cost exposure) and order endpoints.
4. Pre-live checklist gate on the `live` transition (enforced server-side): incubation passed, diversification passed, sizing plan locked, quit rule locked, auth enabled, `dataSource` of all supporting gate results is `live_engine`.
5. Keep both existing order-placement guard layers; add an order audit log table.

---

## Sequencing & Effort Summary

| Phase | What | Effort | Depends on |
|---|---|---|---|
| 0 | Repo hygiene | 0.5 day | — |
| 1 | Full persistence | 1–2 wk | 0 |
| 2 | Real LEAN engine verified | 1 wk (local) | 0 |
| 3 | Goals + feasibility gate | 1 wk | 1, 2 |
| 4 | Walk-forward engine + PBO wiring | 2–3 wk | 2, 3 |
| 5 | MC upgrades + position sizing | 2 wk | 2, 4 |
| 6 | Diversification analyzer | 1 wk | 2, 5a |
| 7 | Incubation + monitoring dashboard | 2–3 wk | 1, 5 |
| 8 | Auth + go-live hardening | 1 wk | any time; required before live |

Total: roughly **10–13 weeks** of focused work. Phases 0–2 are the unglamorous foundation; nothing in Davey's process can produce a trustworthy verdict until results stop being random numbers and stop evaporating on restart.

## Design Principles to Preserve (already in the codebase — don't regress)

1. **No gate passes on simulated data** — `assertEvaluable()` stays the single chokepoint for every new gate.
2. **Pre-declaration over hindsight** — configs, goals, sizing plans, and quit rules all get `lockedAt` semantics; changing them after the fact is optimization and must cost a trial-count increment or be blocked.
3. **Append-only audit trails** — gate history, refinement history, reviews.
4. **Trial counting feeds DSR** — every re-run, re-optimization, and config change increments it; more attempts honestly lower the deflated Sharpe.
5. **The human stays in the loop** — the app warns, gates, and recommends; it never auto-trades, auto-quits, or auto-relaxes a standard.
