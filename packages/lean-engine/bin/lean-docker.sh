#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# lean-docker.sh — run the QuantConnect `lean` CLI inside the
# praxis/lean-cli Docker image. Drop-in replacement for a locally
# pip-installed `lean` binary; point LEAN_COMMAND at this script.
#
# The lean CLI launches the LEAN engine as a SIBLING container via
# the host Docker daemon (socket mount), so every path the CLI asks
# the daemon to bind-mount must resolve ON THE HOST. The workspace
# is therefore mirror-mounted at a host-resolvable path, and HOME /
# TMPDIR are pinned inside the workspace so credentials and the
# generated engine configs are host-visible.
#
# Env vars (all optional):
#   LEAN_WORKSPACE_DIR        workspace path, used when cwd is not a
#                             lean workspace (no ./lean.json)
#   LEAN_DOCKER_IMAGE         image tag (default praxis/lean-cli:1.0.200)
#   LEAN_DOCKER_MOUNT_PREFIX  Git-Bash-on-Windows only: daemon-side
#                             prefix for the Windows filesystem
#                             (default /run/desktop/mnt/host; use
#                             /host_mnt for the Hyper-V backend)
#
# Usage:
#   ./lean-docker.sh --version
#   ./lean-docker.sh init                 # interactive, run from workspace
#   ./lean-docker.sh backtest MyProject
# ─────────────────────────────────────────────────────────────
set -euo pipefail

IMAGE="${LEAN_DOCKER_IMAGE:-praxis/lean-cli:1.0.200}"

# ── Resolve the workspace directory ──────────────────────────
# lean-runner.ts spawns this script with cwd = LEAN_WORKSPACE_DIR.
if [ -f "./lean.json" ]; then
  WORKSPACE="$(pwd)"
elif [ -n "${LEAN_WORKSPACE_DIR:-}" ] && [ -d "${LEAN_WORKSPACE_DIR}" ]; then
  WORKSPACE="$(cd "$LEAN_WORKSPACE_DIR" && pwd)"
else
  # No lean.json yet (e.g. first `lean init`): treat cwd as the workspace.
  WORKSPACE="$(pwd)"
fi

SOCK="/var/run/docker.sock"
MIRROR="$WORKSPACE" # on Linux/macOS the host path IS daemon-resolvable

case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    # Git Bash on Windows: pwd looks like /c/Users/...; prefix it with the
    # path under which the Docker Desktop VM exposes the Windows drives,
    # and stop MSYS from mangling the Linux-style docker args.
    PREFIX="${LEAN_DOCKER_MOUNT_PREFIX:-/run/desktop/mnt/host}"
    MIRROR="${PREFIX}${WORKSPACE}"
    SOCK="//var/run/docker.sock"
    export MSYS_NO_PATHCONV=1
    export MSYS2_ARG_CONV_EXCL='*'
    ;;
esac

# Host-visible HOME (persists lean credentials between runs) and TMPDIR
# (keeps lean's generated engine configs bind-mountable by the host daemon).
mkdir -p "$WORKSPACE/.praxis-lean-home" "$WORKSPACE/.praxis-lean-tmp"

# Allocate a TTY only for interactive use (lean init / lean login prompts).
# When the server spawns this script, stdio are pipes and no TTY is added,
# so stdout/stderr stay plain for lean-runner.ts to capture.
TTY_ARGS=()
if [ -t 0 ] && [ -t 1 ]; then
  TTY_ARGS=(-i -t)
fi

exec docker run --rm "${TTY_ARGS[@]+"${TTY_ARGS[@]}"}" \
  -v "$SOCK:/var/run/docker.sock" \
  -v "$WORKSPACE:$MIRROR" \
  -w "$MIRROR" \
  -e "HOME=$MIRROR/.praxis-lean-home" \
  -e "TMPDIR=$MIRROR/.praxis-lean-tmp" \
  "$IMAGE" lean "$@"
