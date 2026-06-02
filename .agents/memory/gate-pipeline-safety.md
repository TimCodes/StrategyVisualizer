---
name: Gate pipeline safety constraint
description: Hard constraint preventing any gate from returning "pass" on simulated backtest data.
---

`assertEvaluable(backtest)` in `packages/server/services/gates.ts` is the single chokepoint.

**Rule:** Returns `{ ok: false, reason: SIMULATED_REASON }` unless `backtest.dataSource === "live_engine"`. Any other value (including `undefined`, `"simulated"`, or missing field) is blocked.

**Why:** The entire backtest engine is currently a random-number simulator. Allowing pass verdicts on simulated data would create false confidence in strategy quality. The guard must fire before any computation — if you add a new gate function, call `assertEvaluable()` as the very first statement and return `{ verdict: "cannot_evaluate", reason }` immediately.

**How to apply:** Every gate route and every gate compute function must call `assertEvaluable()` before running any math. The `persistGateResult()` helper does NOT call it — that is intentional, because the route must return the guard reason before calling persist.

**When to lift:** When `dataSource: "live_engine"` is set by a real backtest engine (not `Math.random()`). See `replit.md` Safety Boundaries section.
