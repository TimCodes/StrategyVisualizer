# LEAN Local Setup

> **This file documents steps to be completed LOCALLY, not in Replit.**
> Everything below requires Docker and the `lean` CLI installed on your local
> machine. **Do not perform these steps in Replit** — LEAN and Docker are not
> available there and are not needed for the app to run in simulation mode.

## What already works in Replit (no action needed)

- Backtests run via the built-in simulator (`dataSource: "simulated"`).
- The gate pipeline shows `cannot_evaluate` (correct — gates only pass on `live_engine` data).
- The app builds and runs with zero errors.
- `LEAN_ENABLED` is unset/`false`, so `runLeanBacktest()` is never called.

---

## Option B: Docker (recommended)

Instead of installing Python and the `lean` CLI on your machine (steps 2–3
below), you can run the CLI from a Docker image. Only Docker Desktop is
required. See **`packages/lean-engine/README.md`** for the full instructions;
the short version:

```powershell
cd packages/lean-engine
npm run build        # build the praxis/lean-cli image (pinned CLI version)
npm run build:shim   # Windows only: compile bin/lean-docker.exe
```

Then initialize the workspace through the wrapper
(`bin\lean-docker.cmd init` from inside `lean-workspace/`) and set in `.env`:

```ini
LEAN_COMMAND=C:\path\to\repo\packages\lean-engine\bin\lean-docker.exe   # Windows
# LEAN_COMMAND=/path/to/repo/packages/lean-engine/bin/lean-docker.sh   # Linux/macOS
```

Steps 1 and 4–8 below still apply; steps 2–3 are replaced by the wrapper.

---

## Option A: Manual local setup steps (to be done later — not now)

### 1. Install Docker

Follow the official Docker Desktop instructions for your OS:
<https://docs.docker.com/get-docker/>

### 2. Install the LEAN CLI

```bash
pip install lean
```

Verify:

```bash
lean --version
```

### 3. Initialize a LEAN workspace

```bash
mkdir lean-workspace
cd lean-workspace
lean init
```

Follow the prompts to configure your data folder and credentials.

### 4. Configure data

Download or link historical data into the LEAN workspace data directory.
Refer to the LEAN documentation: <https://www.lean.io/docs/v2/lean-cli/datasets>

### 5. Set environment variables (local machine only)

In your local `.env` (never commit secrets):

```
LEAN_ENABLED=true
LEAN_COMMAND=lean
LEAN_WORKSPACE_DIR=./lean-workspace
LEAN_BACKTEST_TIMEOUT_MS=600000
```

**Never set `LEAN_ENABLED=true` in Replit or any deployed environment.**

### 6. Run one real backtest

Start the Praxis server locally and trigger a backtest from the Strategy Editor.
The server will call `runLeanBacktest()`, which:
1. Writes the strategy code to `lean-workspace/<projectName>/main.py`
2. Spawns `lean backtest <projectName>`
3. Locates the newest results JSON under `lean-workspace/<projectName>/backtests/<id>/`
4. Parses results via `parseLeanResults()`

If it succeeds, the backtest is stored with `dataSource: "live_engine"` and the
pipeline gates (Monte Carlo, DSR, etc.) become evaluable for that result.

### 7. Verify the parser key paths

The `parseLeanResults()` function in `packages/server/services/lean-runner.ts`
contains `// TODO(local): verify key path` comments at each field mapping.

After a real run, open the actual results JSON file from
`lean-workspace/<projectName>/backtests/<id>/<id>.json` and check that the
field names used in the parser match reality. Common discrepancies:

- `"Net Profit"` vs `"Compounding Annual Return"` for total return
- `"Total Orders"` vs `"Total Trades"` for trade count
- Exact path to equity curve values inside `Charts`
- Trade field names inside `TotalPerformance.ClosedTrades`

Update the parser and the `lean-sample.json` fixture to match the real structure,
then re-run `npx vitest run` to confirm all parser tests pass with the real keys.

### 8. Update `LIVE_TRADING_ENABLED`

Once you have confirmed the parser is accurate and backtests are tagged
`live_engine`, you may set `LIVE_TRADING_ENABLED=true` locally to enable
live order placement. Review `packages/server/lib/liveTrading.ts` for the
full guard logic before doing so.

---

## Guard summary

| Variable | Replit value | Local (after setup) |
|---|---|---|
| `LEAN_ENABLED` | `false` / unset | `true` |
| `LIVE_TRADING_ENABLED` | `false` / unset | `true` (after verification) |
| Backtest `dataSource` | `"simulated"` | `"live_engine"` (real runs) |
| Gates evaluable? | No (`cannot_evaluate`) | Yes (on live_engine results) |
