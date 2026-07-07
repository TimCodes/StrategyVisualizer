# Praxis — Algorithmic Strategy Factory

Praxis takes a trading idea from hypothesis to a defensible verdict — **deploy, incubate, or (usually) discard** — while leaving an auditable trail of every test run and every parameter touched. It mechanizes Kevin Davey's development process (*Building Winning Algorithmic Trading Systems*) and the anti-overfitting statistics of Bailey & López de Prado and Harvey & Liu, on top of the real QuantConnect LEAN backtest engine.

The core discipline: **most ideas are noise.** A backtest that looks great is, by prior probability, more likely a selection artifact than a discovery. Praxis is built to try to destroy every strategy you propose and report honestly on what survives.

- **React + Express + TypeScript** monorepo (`packages/client`, `packages/server`, `packages/shared`)
- **LEAN engine** in Docker (`packages/lean-engine`) — real backtests, no random-number simulator once enabled
- **A gate pipeline** every strategy must pass: `idea → feasibility → walk_forward → monte_carlo → incubation → diversification_sizing → live`
- **Postgres persistence** so gate histories, trial counts, and 90-day incubations survive restarts
- **A free daily data pipeline** (29 ETFs, VIX, BTC/ETH) and a **100-strategy hypothesis library** (`strategy-library/`)

> **Safety:** live order placement is fail-closed (`LIVE_TRADING_ENABLED` must be exactly `"true"`, enforced at two layers). Until a strategy clears every gate on real data, the app produces analysis only — it never trades.

---

## Table of contents

- [Quick start](#quick-start)
- [How to create and backtest a strategy](#how-to-create-and-backtest-a-strategy) ← **the main walkthrough**
  - [1. Write the algorithm](#1-write-the-algorithm)
  - [2. Run a raw backtest (two ways)](#2-run-a-raw-backtest)
  - [3. Run it through the gate pipeline](#3-run-it-through-the-gate-pipeline)
- [The parameter contract (walk-forward)](#the-parameter-contract)
- [Data](#data)
- [Architecture](#architecture)
- [Reference](#reference)

---

## Quick start

**Prerequisites:** Node 20+ (22.9+ to auto-load `.env`), Docker Desktop, Python 3.11+ (`pip install yfinance requests`).

```bash
# 1. Install
npm install

# 2. Build the LEAN engine image (one-time, multi-GB pull on first backtest)
cd packages/lean-engine
npm run build          # builds praxis/lean-cli image
npm run build:shim     # Windows only: compiles the .exe wrapper (see note below)
cd ../..

# 3. Get market data into the workspace (free daily: 29 ETFs, VIX, BTC/ETH)
cd packages/lean-engine && npm run data:refresh && cd ../..

# 4. (Recommended) Local Postgres so verdicts persist across restarts
docker run -d --name praxis-postgres --restart unless-stopped \
  -e POSTGRES_USER=praxis -e POSTGRES_PASSWORD=praxis_local_dev -e POSTGRES_DB=praxis \
  -p 5434:5432 -v praxis_pgdata:/var/lib/postgresql/data postgres:16
npm run db:push        # creates all tables

# 5. Configure .env (see below), then start the app
npm run dev            # http://localhost:5000
```

Create a `.env` in the repo root (gitignored — see `.env.example`):

```bash
DATABASE_URL=postgresql://praxis:praxis_local_dev@localhost:5434/praxis
LEAN_ENABLED=true
LEAN_COMMAND=C:/absolute/path/to/packages/lean-engine/bin/lean-docker.exe   # .../lean-docker.sh on macOS/Linux
LEAN_WORKSPACE_DIR=./lean-workspace
```

Confirm the engine is live: `GET http://localhost:5000/api/system/status` should report `"backtestEngine": "lean"`. If it says `"simulated"`, `LEAN_ENABLED` is not `true` and **no gate can validate anything** — fix that before proceeding.

> **Why an `.exe` wrapper on Windows?** The server spawns `LEAN_COMMAND` with `shell:false`, which cannot launch a `.cmd`/`.ps1` on Node 20+. `npm run build:shim` compiles a tiny `.exe` that forwards to the PowerShell wrapper. On macOS/Linux, point `LEAN_COMMAND` at `bin/lean-docker.sh` directly.

---

## How to create and backtest a strategy

This is the end-to-end workflow, using a real example: **Strategy 025, "Double 7's"** from the library (buy a 7-day closing low above the 200-day SMA in a bull regime; sell the next 7-day closing high).

### 1. Write the algorithm

A LEAN "project" is a folder in `lean-workspace/` containing `main.py` (a `QCAlgorithm` subclass) and a small `config.json`.

```bash
mkdir lean-workspace/Double7
```

`lean-workspace/Double7/main.py`:

```python
from AlgorithmImports import *


class Double7(QCAlgorithm):
    """Strategy 025 — Double 7's.

    Buy an N-day closing low above the 200-day SMA; sell the next N-day
    closing high.
    """

    def initialize(self):
        # ── The parameter contract (see section below) ──
        # Read dates and grid params from config so the walk-forward runner
        # can inject window dates. Hardcoding these silently breaks WF.
        start = self.get_parameter("wf_start", "2000-01-03")
        end   = self.get_parameter("wf_end",   "2025-12-31")
        sy, sm, sd = [int(x) for x in start.split("-")]
        ey, em, ed = [int(x) for x in end.split("-")]
        self.set_start_date(sy, sm, sd)
        self.set_end_date(ey, em, ed)
        self.set_cash(100000)

        self.n      = int(self.get_parameter("n", "7"))   # tunable grid param
        self.spy    = self.add_equity("SPY", Resolution.DAILY).symbol
        self.sma200 = self.sma(self.spy, 200, Resolution.DAILY)
        self.closes = RollingWindow[float](self.n)
        self.set_warm_up(210, Resolution.DAILY)

    def on_data(self, data: Slice):
        if self.spy not in data.bars:
            return
        c = data.bars[self.spy].close
        self.closes.add(c)
        if self.is_warming_up or not self.sma200.is_ready or not self.closes.is_ready:
            return
        window = list(self.closes)
        if not self.portfolio.invested:
            if c > self.sma200.current.value and c <= min(window):   # 7-day low in bull regime
                self.set_holdings(self.spy, 1.0)
        elif c >= max(window):                                       # 7-day high
            self.liquidate(self.spy)
```

`lean-workspace/Double7/config.json`:

```json
{ "algorithm-language": "Python", "parameters": {} }
```

Only trade symbols you have data for — run `npm run data:refresh` first and check `lean-workspace/data/PROVENANCE.md` for coverage. SPY goes back to 1993.

### 2. Run a raw backtest

You can backtest two ways. Use the **CLI** for fast iteration while writing the algorithm; use the **API** when you want the result recorded in the pipeline.

#### Option A — CLI (fast iteration)

From the workspace directory, via the Docker wrapper:

```bash
cd lean-workspace
../packages/lean-engine/bin/lean-docker.ps1 backtest Double7    # Windows
# ../packages/lean-engine/bin/lean-docker.sh  backtest Double7  # macOS/Linux
```

Results land in `lean-workspace/Double7/backtests/<timestamp>/` — the main `<id>.json` holds statistics, the equity curve, and closed trades. The console prints a summary (Net Profit, Sharpe, Drawdown, Total Orders).

#### Option B — API (records into the pipeline)

With `npm run dev` running:

```bash
# Create/replace the project from your code, then launch the backtest
CODE=$(python -c "import json; print(json.dumps(open('lean-workspace/Double7/main.py').read()))")

curl -s -X POST http://localhost:5000/api/lean/projects \
  -H "Content-Type: application/json" -d "{\"name\":\"Double7\",\"code\":$CODE}"

curl -s -X POST http://localhost:5000/api/lean/projects/Double7/backtest \
  -H "Content-Type: application/json" -d "{\"code\":$CODE}"
# → {"backtestId":"...","status":"running"}

# Poll for the result
curl -s http://localhost:5000/api/lean/projects/Double7/results
```

The result carries `dataSource: "live_engine"` (real data) or `"simulated"` (fell back because LEAN was unavailable — **not** valid for gates). Progress also streams over Socket.IO (`lean:backtest:progress` / `lean:backtest:complete`), which the `/editor` page in the web app renders live.

> You can also do all of this in the browser: open `http://localhost:5000/editor`, pick or write a strategy, and click Run. The steps below are shown as API calls so they are scriptable and reproducible.

### 3. Run it through the gate pipeline

A raw backtest is not a verdict. The pipeline's discipline is **pre-registration**: you lock your success criteria *before* you look at results, so you cannot move the goalposts afterward.

**Step 3a — Create the strategy record with a stated edge.** Every strategy needs a falsifiable claim about *who persistently loses money and why* — not just a signal.

```bash
SID=$(curl -s -X POST http://localhost:5000/api/strategies \
  -H "Content-Type: application/json" -d '{
    "name":"Double 7s (SPY)",
    "description":"Strategy 025",
    "type":"mean_reversion","status":"inactive",
    "performance":0,"sharpeRatio":0,"maxDrawdown":0,"winRate":0,"totalTrades":0,
    "edge":"Short-horizon overreaction in index products: multi-day pullbacks inside a bull regime are driven by leveraged and emotional sellers whose liquidation exhausts itself; the structural bid reprices upward within days. The persistent loser is the stop-loss seller at the local extreme."
  }' | python -c "import json,sys; print(json.load(sys.stdin)['id'])")
```

**Step 3b — Lock goals (pre-registration).** These become the pass thresholds for every later gate. They lock once, at the `idea` stage; the generic PATCH cannot change them afterward.

```bash
curl -s -X POST http://localhost:5000/api/strategies/$SID/goals \
  -H "Content-Type: application/json" -d '{
    "minRetDDRatio":0.5, "maxDrawdownPct":20, "maxRiskOfRuin":0.10,
    "minAnnualReturnPct":4, "minTradesPerYear":8
  }'
```

**Step 3c — Feasibility gate.** One full-period backtest checked against the locked goals. Feed it the backtest from step 2 (must be `live_engine`):

```bash
# Build the payload from the backtest result, then:
curl -s -X POST http://localhost:5000/api/strategies/$SID/gates/feasibility \
  -H "Content-Type: application/json" -d @feasibility_payload.json
# → {"verdict":"pass"|"fail"|"cannot_evaluate", "reason":"...", "metrics":{...}}
```

The gate demands ≥ 30 trades for significance and requires the average trade to clear a slippage/commission buffer. **Suspiciously good results (Sharpe > 4 or win rate > 90%) return `cannot_evaluate`, not `pass`** — they demand manual review for look-ahead bias or fill fantasy. A `pass`/`fail` auto-advances the state machine; do not also call the manual gate endpoint.

> In the real run, Double 7's returned +250% over 26 years with a 73% win rate — and **failed feasibility anyway**: 4.9% annualized against a 16.6% drawdown is ret/DD 0.30, below the locked 0.50. That is the pipeline working. A genuinely profitable strategy that does not meet *your pre-registered* risk-adjusted bar gets discarded, cleanly.

**Step 3d — Walk-forward** (`walk_forward` stage). Lock the config first — windows, fitness function, and the parameter grid, all chosen before the run:

```bash
curl -s -X POST http://localhost:5000/api/strategies/$SID/gates/walk-forward/config \
  -H "Content-Type: application/json" -d '{
    "inSampleDays":1460, "outOfSampleDays":730, "anchored":false, "numWindows":4,
    "startDate":"2008-01-01", "fitnessFunction":"net_profit",
    "parameters":[{"name":"n","min":5,"max":9,"step":2}]
  }'

# Execute against LEAN (optimizes each in-sample window, applies the winner
# out-of-sample, stitches the OOS segments, computes WFE + PBO):
curl -s -X POST http://localhost:5000/api/strategies/$SID/gates/walk-forward/run \
  -H "Content-Type: application/json" -d "{\"projectName\":\"Double7\",\"code\":$CODE}"

# Poll:
curl -s http://localhost:5000/api/strategies/$SID/walk-forward/runs
```

Pass requires **walk-forward efficiency ≥ 50%** (annualized OOS ÷ IS), ≥ 50% of OOS windows profitable, and the stitched curve meeting goals. Re-locking the config is a **409** — testing multiple in/out combinations and keeping the best is optimization, and every run increments the trial count that deflates your Sharpe.

**Step 3e — Monte Carlo** (`monte_carlo` stage). Trade-level resampling (Davey Ch 19) when ≥ 10 closed trades exist:

```bash
curl -s -X POST http://localhost:5000/api/strategies/$SID/gates/monte-carlo \
  -H "Content-Type: application/json" -d @mc_payload.json
```

Reports median return, ret/DD, **risk of ruin**, **probability of profit in a year**, the **Deflated Sharpe Ratio** (corrected for the trial count and non-normality), and MC percentile bands. A pass snapshots the **expected-performance baseline** that incubation and live monitoring will judge against — then freezes it.

**Step 3f — Incubation → sizing → live.** Remaining stages, each with its own gate and pre-registration:

- **Incubation** (`incubation`): a 90-day forward watch; log observations (`POST .../gates/incubation/observation`) and monitor them against the frozen bands on the `/monitoring` page. Requires the period complete **and** ≥ 3 observations before it will evaluate.
- **Diversification** (`POST .../gates/diversification`): correlation (full-history *and* rolling max) against your existing strategies, plus a combined portfolio Monte Carlo with-vs-without the candidate.
- **Sizing** (`POST .../sizing/sweep` → `.../sizing/plan`): fixed-fractional *f*-sweep recommending the largest *f* inside your drawdown/ruin constraints (never the unconstrained "optimal *f*"), plus a minimum-starting-capital solver. Lock the plan.
- **Quit rule** (`POST .../quit-rule`): a pre-declared stop, locked **before** going live. The `→ live` transition is blocked with a 409 unless both a sizing plan and a quit rule are locked.

Throughout, watch `GET /api/trials/count`. Every generation, refinement, optimization, and walk-forward run increments it, and it is the denominator that keeps the Deflated Sharpe honest. Past ~30 trials, treat any surviving result with deep suspicion.

---

## The parameter contract

The walk-forward runner injects window dates and grid values through the project's `config.json`, and the algorithm **must** read them via `get_parameter`:

```python
start = self.get_parameter("wf_start", "2015-01-01")   # window start (injected)
end   = self.get_parameter("wf_end",   "2019-12-31")   # window end   (injected)
n     = int(self.get_parameter("n", "7"))              # each grid parameter
```

If the code hardcodes `set_start_date(...)` instead, **every in-sample and out-of-sample window silently runs the identical full-period backtest** — the WFE and PBO come back confidently, invisibly meaningless. Verify the contract is present before launching a walk-forward run, and sanity-check afterwards that different windows report different date ranges and trade counts.

---

## Data

`cd packages/lean-engine && npm run data:refresh` downloads and converts free daily data into `lean-workspace/data/`:

| Tier | Data | Source |
|---|---|---|
| 1 | 29 US ETFs (broad market, bonds, commodities, all 11 sector SPDRs) | Yahoo Finance |
| 2 | VIX full history (as index feed + raw CSV) | CBOE |
| 3 | BTC/ETH daily | Yahoo Finance |

Each refresh rewrites `data/PROVENANCE.md` with source, adjustment method, row counts, and coverage per symbol — the provenance your research should record before trusting any backtest. Yahoo prices are split-adjusted at source, so factor files carry dividends only. **This ETF set is not a survivorship-safe single-stock universe**, and intraday/options strategies still need paid data.

---

## Architecture

```
packages/
  client/      React + Vite frontend (dashboard, /editor, /monitoring, /strategies)
  server/      Express API + Socket.IO; the gate services live in server/services/
  shared/      Drizzle schema + Zod types (the single source of truth)
  lean-engine/ Dockerized LEAN CLI + the data pipeline
strategy-library/   100 strategy hypotheses (80 established, 20 novel) — Stage-0 inputs
lean-workspace/     LEAN projects + downloaded data (gitignored)
.agents/            The PhD-level strategy-research-agent prompt
```

Key services (all behind the `assertEvaluable` chokepoint — no gate passes on simulated data): `gates.ts` (feasibility, Monte Carlo, DSR, incubation), `walk-forward-runner.ts` (window optimization, WFE, PBO), `position-sizing.ts` (trade-level MC, f-sweep, capital solver), `diversification.ts`, `monitoring.ts`.

Common commands:

```bash
npm run dev        # start API + client (loads .env)
npm test           # vitest (184 tests)
npm run check      # tsc type-check
npm run db:push    # apply schema to Postgres
```

---

## Reference

- **`.agents/strategy-research-agent.md`** — the research discipline in full (epistemics, gate-by-gate playbook, the anti-overfitting canon). Read this before doing serious research.
- **`STRATEGY_FACTORY_IMPLEMENTATION_PLAN.md`** — the roadmap and methodology mapping to Davey's chapters.
- **`strategy-library/README.md`** — the 100-strategy index.
- **`packages/lean-engine/README.md`** — Docker/LEAN setup and data pipeline details.
- **`LEAN_SETUP.md`** — LEAN workspace initialization notes.

**The literature's blunt collective finding:** *most claimed research findings in this field are false.* Praxis's value is not generating candidates — those are cheap. It is being the process almost nothing survives.
