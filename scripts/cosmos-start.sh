#!/usr/bin/env bash
#
# The thing launchd actually runs: `next start`, with `.env.local` sourced.
#
# EXTENDS: nothing. It exists because a launchd plist is a bad place to keep a
# secret. A plist in ~/Library/LaunchAgents is world-readable, is backed up, and
# is easy to cat by accident; `.env.local` is gitignored and 0600. So the plist
# carries a PATH and a port, this script carries nothing, and the one secret lives
# in one file that `next start` reads.
#
# Plan 7i, D16: "next start under launchd with KeepAlive, never pnpm dev in tmux."
#
# It never echoes the environment. Do not add `set -x`.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3030}"

cd "$ROOT"

if [ -f "$ROOT/.env.local" ]; then
  # `set -a` exports every assignment in the file. Values are read, never printed.
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env.local"
  set +a
else
  echo "cosmos-start: no .env.local at $ROOT — the cosmos gate fail-closes to 404" >&2
fi

# Fail-closed is the design, but a server that 404s everything with no explanation
# wastes a morning. Say it once, at boot, without saying what the secret is.
if [ -z "${PGOS_SHARED_SECRET:-}" ]; then
  echo "cosmos-start: PGOS_SHARED_SECRET is unset; /cosmos and /api/cosmos will 404" >&2
fi

# THE SERVICE NEVER SERVES FIXTURES. `?fixture=<name>` reaches the harness's
# invented canon (invented names, invented LEDGER-shaped lines, in a public repo)
# and answers only under COSMOS_FIXTURES=1. This is the mini's always-on server,
# so the variable is unset here rather than trusted to be absent: `set -a` above
# exports everything in .env.local, and a line added there one evening must not
# quietly turn the real cosmos into a test double. A harness that wants a fixture
# starts its OWN server with COSMOS_FIXTURES=1.
unset COSMOS_FIXTURES

echo "cosmos-start: $(date '+%Y-%m-%d %H:%M:%S') next start -p $PORT in $ROOT"

# `.next` must already exist. A build under launchd would rebuild on every crash
# loop; building is a hand's job (`pnpm build`), restarting is launchd's.
if [ ! -d "$ROOT/.next" ]; then
  echo "cosmos-start: no .next — run 'pnpm build' first" >&2
  exit 1
fi

exec pnpm exec next start -p "$PORT"
