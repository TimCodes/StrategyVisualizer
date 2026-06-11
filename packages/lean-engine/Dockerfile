# ─────────────────────────────────────────────────────────────
#  Praxis LEAN CLI image
#
#  This image contains ONLY the QuantConnect `lean` CLI (a Python
#  package). The LEAN engine itself runs in a separate
#  `quantconnect/lean` container that the CLI launches as a SIBLING
#  container through the host Docker daemon — which is why the
#  wrapper scripts in ./bin mount the host Docker socket into this
#  container. The engine image is pulled and cached by the HOST
#  daemon on first run (it is large, several GB).
#
#  Build:  npm run build          (from packages/lean-engine)
#     or:  docker compose build   (same directory)
#
#  To bump the CLI, change LEAN_CLI_VERSION here, in package.json
#  ("build" script), in docker-compose.yml, and the default image
#  tag in bin/lean-docker.ps1 / bin/lean-docker.sh.
#  lean-cli releases are sequential 1.0.N patch versions, so any
#  N up to the current latest exists on PyPI.
# ─────────────────────────────────────────────────────────────

# Pinned base image. slim is enough: the CLI talks to the Docker
# daemon via the docker Python SDK, so no docker binary is needed.
FROM python:3.11.9-slim-bookworm

ARG LEAN_CLI_VERSION=1.0.200

# lean depends on pynput -> evdev, which compiles a C extension and
# needs gcc + kernel headers (linux-libc-dev) absent from slim images.
# Install them only for the pip step, then purge to keep the image small.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc python3-dev linux-libc-dev \
    && pip install --no-cache-dir "lean==${LEAN_CLI_VERSION}" \
    && apt-get purge -y gcc python3-dev linux-libc-dev \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Default workdir; the wrapper overrides this with -w <mirrored
# workspace path> at run time so that the paths the CLI passes to
# the host Docker daemon (for sibling engine containers) resolve
# on the host.
WORKDIR /workspace

# No ENTRYPOINT on purpose: the wrapper passes the full
# "lean <subcommand> ..." command, and the image stays usable for
# ad-hoc debugging (docker run --rm -it praxis/lean-cli:1.0.200 bash).
CMD ["lean", "--help"]
