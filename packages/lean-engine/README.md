# @app/lean-engine

Dockerized QuantConnect **LEAN CLI** for the Praxis backtest runner.

This package replaces the manual local setup in the repo-root `LEAN_SETUP.md`
(steps 2–3: `pip install lean` on the host). Instead of installing Python and
the `lean` CLI yourself, you build one Docker image and point the server's
`LEAN_COMMAND` env var at a wrapper script in `bin/`. The server-side runner
(`packages/server/services/lean-runner.ts`) is unchanged — it still spawns
`LEAN_COMMAND backtest <projectName>` with `cwd = LEAN_WORKSPACE_DIR` and
reads results from `<workspace>/<project>/backtests/<id>/`.

> LEAN requires Docker, so Praxis is local-first (the old Replit hosting path
> is retired — see the README's Operations section). All of this is for a
> local machine with Docker Desktop.

---

## Architecture: CLI-in-container with the host Docker socket

The `lean` CLI is a Python package that does not run backtests itself — it
launches the LEAN engine in a separate Docker container (image
`quantconnect/lean`). Two ways to containerize it were considered:

| Approach | How | Trade-off |
|---|---|---|
| **(a) CLI image + host Docker socket** (chosen) | Build a small image with `pip install lean`. The wrapper mounts `/var/run/docker.sock`, so the CLI starts the engine as a **sibling** container on the host daemon. | Pro: the CLI keeps doing all its work — engine config generation, data mounts, and the `backtests/<timestamp>/` output layout that `lean-runner.ts` parses. Con: the container gets root-equivalent access to the Docker daemon, and bind-mount paths must be host-resolvable (handled below). |
| (b) Run `quantconnect/lean` directly | `docker run quantconnect/lean` with hand-built mounts. | Pro: no socket mount. Con: you must replicate the CLI's undocumented `config.json` generation, data-folder layout, and results layout by hand — fragile across engine versions, and any drift breaks the server's result parsing. |

**(a)** was chosen because the runner's contract (output directory layout,
results JSON) is produced by the CLI, and re-implementing it is the riskiest
part. The socket-mount caveat is acceptable for a trusted local dev machine.

### The path-mirroring trick (important to understand)

When the CLI (inside its container) tells the daemon "bind-mount
`<workspace>/MyProject` into the engine container", the **host** daemon
resolves that path — not the CLI container. So the wrapper mounts your
workspace into the CLI container **at the same path the daemon uses for it**:

- **Linux/macOS**: mounted at the identical host path (`-v "$PWD:$PWD"`).
- **Windows (Docker Desktop)**: `C:\Users\you\...\lean-workspace` is mounted
  at `/run/desktop/mnt/host/c/Users/you/.../lean-workspace` — the path under
  which the Docker Desktop **WSL2 backend** VM exposes Windows drives. On the
  legacy **Hyper-V backend**, set `LEAN_DOCKER_MOUNT_PREFIX=/host_mnt`.

The wrapper also pins `HOME` and `TMPDIR` to folders **inside the workspace**
(`.praxis-lean-home`, `.praxis-lean-tmp`) so that:
- `lean login` credentials and CLI config persist across runs (they live on
  your disk, not in a throwaway container), and
- the temporary engine config files the CLI generates land on a path the host
  daemon can bind-mount into the sibling engine container.

---

## Setup

### 1. Build the image

```powershell
cd packages/lean-engine
npm run build          # docker build -t praxis/lean-cli:1.0.200 ...
npm run verify         # docker run --rm praxis/lean-cli:1.0.200 lean --version
```

(or `docker compose build` / `docker compose run --rm lean-cli` in this
directory.)

The lean CLI version and base image are pinned in the `Dockerfile`. To bump,
edit `LEAN_CLI_VERSION` there and the tag in `package.json`,
`docker-compose.yml`, and the default in both wrapper scripts.

### 2. Build the Windows shim (Windows only)

```powershell
npm run build:shim     # produces bin/lean-docker.exe (gitignored)
```

Why an `.exe`? The server spawns `LEAN_COMMAND` with Node's
`spawn(..., { shell: false })`, and Node ≥ 20.12 refuses to spawn `.cmd`/
`.bat` files that way (CVE-2024-27980 hardening). The shim is ~100 lines of
C# compiled with the `csc.exe` that ships with Windows (.NET Framework 4.x,
no SDK install needed); it just launches `bin/lean-docker.ps1` with your args
and passes stdio + exit code through.

On Linux/macOS skip this step and use `bin/lean-docker.sh` directly
(`chmod +x` it if your checkout lost the executable bit).

### 3. Initialize the workspace (one-time)

Same as the manual flow, but through the wrapper — no `pip install` needed:

```powershell
mkdir lean-workspace        # at the repo root (or wherever you prefer)
cd lean-workspace
..\packages\lean-engine\bin\lean-docker.cmd login   # optional: QC credentials for data
..\packages\lean-engine\bin\lean-docker.cmd init    # creates lean.json, data/
..\packages\lean-engine\bin\lean-docker.cmd project-create "MyProject" --language python
```

(`init`/`login` are interactive; the wrapper allocates a TTY automatically
when run from a terminal. On Linux/macOS use `bin/lean-docker.sh` the same
way.)

Note: `lean backtest <project>` expects the project to have a `config.json`,
which `lean project-create` generates. The server only writes `main.py` into
the project folder, so create each project once with `project-create` before
the first server-triggered backtest of that name.

### 4. Point the server at the wrapper

In your local `.env`:

```ini
LEAN_ENABLED=true
# Windows — use the compiled shim (absolute path, forward or back slashes both fine):
LEAN_COMMAND=C:\path\to\repo\packages\lean-engine\bin\lean-docker.exe
# Linux/macOS:
# LEAN_COMMAND=/path/to/repo/packages/lean-engine/bin/lean-docker.sh
LEAN_WORKSPACE_DIR=./lean-workspace
LEAN_BACKTEST_TIMEOUT_MS=600000
```

That's it — when the server runs a backtest it spawns
`lean-docker backtest <project>` in the workspace, the wrapper starts the CLI
container, the CLI starts the engine container, and results appear in
`lean-workspace/<project>/backtests/<id>/` exactly as `lean-runner.ts`
expects. The first run pulls the `quantconnect/lean` engine image onto the
host daemon (several GB — be patient once).

---

## Windows-specific notes

- **Docker socket path**: the wrappers mount `/var/run/docker.sock`. With
  Docker Desktop on Windows running **Linux containers** (the default) this
  works as-is — Desktop maps the VM's socket. The Windows named pipe
  (`//./pipe/docker_engine`) is only relevant for Windows containers, which
  LEAN does not use.
- **Backend / mount prefix**: default assumes the WSL2 backend
  (`/run/desktop/mnt/host`). On the Hyper-V backend set
  `LEAN_DOCKER_MOUNT_PREFIX=/host_mnt`. If engine containers fail with
  "invalid mount config" or empty data folders, this prefix is the first
  thing to check (`docker inspect` a failed engine container and look at the
  `Mounts` source paths).
- **File sharing**: the workspace must live on a drive shared with Docker
  Desktop (Settings → Resources → File sharing; `C:\Users\...` is shared by
  default).
- **Git Bash**: `bin/lean-docker.sh` also works under Git Bash — it detects
  MSYS, applies the mount prefix, and disables MSYS path mangling.

## Environment variables understood by the wrappers

| Variable | Default | Purpose |
|---|---|---|
| `LEAN_WORKSPACE_DIR` | (cwd) | Used when cwd has no `lean.json` (the server always invokes with cwd = workspace, so this is for manual runs). |
| `LEAN_DOCKER_IMAGE` | `praxis/lean-cli:1.0.200` | Override the CLI image tag. |
| `LEAN_DOCKER_MOUNT_PREFIX` | `/run/desktop/mnt/host` | Windows only: daemon-side prefix for Windows drives (`/host_mnt` on Hyper-V backend). |

## Troubleshooting

- **`lean: not found` / image missing** — run `npm run build` in this package.
- **Engine container can't see the project / data** — wrong mount prefix
  (see Windows notes) or workspace on an unshared drive.
- **Timeout kills the run but a container keeps running** — the server kills
  the wrapper process on `LEAN_BACKTEST_TIMEOUT_MS`, but Docker containers it
  started may outlive it. `docker ps` and `docker stop` any stragglers.
- **Interactive prompts hang a server-triggered run** — `backtest` itself is
  non-interactive once the workspace is initialized; if a run hangs, execute
  the same command manually from the workspace
  (`...\bin\lean-docker.cmd backtest MyProject`) to see the prompt.
- **Pinned CLI version won't install** — lean-cli releases are sequential
  `1.0.N` versions on PyPI; bump `LEAN_CLI_VERSION` in the `Dockerfile` (and
  the tags listed above) to a current release.

## Data pipeline (free Tier 1-3 daily data)

`npm run data:refresh` (or `python pipeline/download_data.py [SYMBOLS...]`) downloads
and converts free daily data into the LEAN workspace (`lean-workspace/data`):

- **Tier 1 — 29 US ETFs** (broad market, bonds, commodities, all 11 sector SPDRs)
  from Yahoo Finance, written as LEAN equity zips with map files and
  dividend factor files. Yahoo prices are split-adjusted at source, so factor
  files carry dividends only (documented in `data/PROVENANCE.md`).
- **Tier 2 — VIX** full history from CBOE, written both as a LEAN index zip
  (`add_index("VIX")` — bars arrive at 16:15 ET) and as a raw CSV under
  `data/alternative/vix/` for custom-data use.
- **Tier 3 — BTC/ETH daily** (Yahoo), written as `Market.COINBASE` crypto zips,
  plus **8 FX majors** written as `Market.OANDA` forex daily zips
  (`add_forex("EURUSD", Resolution.DAILY, Market.OANDA)`)
  (`add_crypto("BTCUSD", Resolution.DAILY, Market.COINBASE)`).

Every refresh rewrites `data/PROVENANCE.md` with source, adjustment method,
row counts, and coverage dates per symbol (Davey Ch 11 data discipline).
All three formats are validated against the real engine (see the DataCheck /
CryptoCheck projects in the workspace).

Requires `pip install yfinance requests`. Not for single-stock cross-sectional
research: the ETF set is not a survivorship-safe universe. Intraday and
options strategies still need paid data.
