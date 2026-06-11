#Requires -Version 5.1
<#
.SYNOPSIS
  Runs the QuantConnect `lean` CLI inside the praxis/lean-cli Docker image.

.DESCRIPTION
  Drop-in replacement for a locally pip-installed `lean` binary. The Praxis
  server (packages/server/services/lean-runner.ts) spawns LEAN_COMMAND with
  args ["backtest", <projectName>] and cwd = LEAN_WORKSPACE_DIR; this script
  forwards those args to `lean` inside the container, passes stdout/stderr
  through untouched, and exits with the container's exit code.

  Because the lean CLI launches the LEAN engine as a SIBLING container via
  the host Docker daemon, every path the CLI asks the daemon to bind-mount
  must resolve ON THE HOST. This script therefore mirror-mounts the
  workspace at the path the Docker Desktop VM uses for the Windows
  filesystem (default: /run/desktop/mnt/host/c/... for the WSL2 backend)
  and points HOME and TMPDIR inside that mirrored workspace so that
  credentials, CLI cache, and generated engine configs are all
  host-visible.

.NOTES
  Environment variables (all optional):
    LEAN_WORKSPACE_DIR        Workspace path, used when cwd is not already a
                              lean workspace (no lean.json in cwd).
    LEAN_DOCKER_IMAGE         Image tag. Default: praxis/lean-cli:1.0.200
    LEAN_DOCKER_MOUNT_PREFIX  Daemon-side prefix for the Windows filesystem.
                              Default: /run/desktop/mnt/host  (WSL2 backend)
                              Use /host_mnt for the legacy Hyper-V backend.

  Examples:
    .\lean-docker.ps1 --version
    .\lean-docker.ps1 init                 # interactive, run from workspace
    .\lean-docker.ps1 backtest MyProject
#>
[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$LeanArgs
)

$ErrorActionPreference = 'Stop'

$Image = if ($env:LEAN_DOCKER_IMAGE) { $env:LEAN_DOCKER_IMAGE } else { 'praxis/lean-cli:1.0.200' }
$MountPrefix = if ($env:LEAN_DOCKER_MOUNT_PREFIX) { $env:LEAN_DOCKER_MOUNT_PREFIX } else { '/run/desktop/mnt/host' }

# ── Resolve the workspace directory ─────────────────────────────
# lean-runner.ts spawns this script with cwd = LEAN_WORKSPACE_DIR, so the
# cwd check matches the server's invocation. The LEAN_WORKSPACE_DIR
# fallback covers manual invocations from elsewhere (e.g. npm scripts).
$cwd = (Get-Location).Path
if (Test-Path (Join-Path $cwd 'lean.json')) {
  $Workspace = $cwd
} elseif ($env:LEAN_WORKSPACE_DIR -and (Test-Path $env:LEAN_WORKSPACE_DIR)) {
  $Workspace = (Resolve-Path $env:LEAN_WORKSPACE_DIR).Path
} else {
  # No lean.json yet (e.g. first `lean init`): treat cwd as the workspace.
  $Workspace = $cwd
}

# ── Translate C:\Users\... -> <prefix>/c/Users/... ──────────────
if ($Workspace -notmatch '^[A-Za-z]:\\') {
  Write-Error "Workspace path '$Workspace' is not an absolute Windows path."
  exit 1
}
$drive = $Workspace.Substring(0, 1).ToLower()
$rest = $Workspace.Substring(2).Replace('\', '/')
$Mirror = "$MountPrefix/$drive$rest"

# ── Host-visible HOME and TMPDIR for the CLI ────────────────────
# HOME persists lean credentials/config between runs; TMPDIR keeps the
# temp files lean generates (engine config etc.) on a path the host
# daemon can bind-mount into the sibling engine container.
$homeDir = Join-Path $Workspace '.praxis-lean-home'
$tmpDir = Join-Path $Workspace '.praxis-lean-tmp'
New-Item -ItemType Directory -Force -Path $homeDir, $tmpDir | Out-Null

$dockerArgs = @(
  'run', '--rm',
  '-v', '/var/run/docker.sock:/var/run/docker.sock',
  '-v', "${Workspace}:${Mirror}",
  '-w', $Mirror,
  '-e', "HOME=$Mirror/.praxis-lean-home",
  '-e', "TMPDIR=$Mirror/.praxis-lean-tmp"
)

# Allocate a TTY only for interactive use (lean init / lean login prompts).
# When the server spawns this script, stdio are pipes and no TTY is added,
# so stdout/stderr stay plain for lean-runner.ts to capture.
if (-not [Console]::IsInputRedirected -and -not [Console]::IsOutputRedirected) {
  $dockerArgs += @('-i', '-t')
}

& docker @dockerArgs $Image lean @LeanArgs
exit $LASTEXITCODE
