#!/usr/bin/env bash
#
# Install (or reinstall) the PG OS + cosmos launchd job: `next start` on :3030,
# KeepAlive, RunAtLoad.
#
# MIRRORS: scripts/install-kitsu-sweep.sh, the installer that already works on
# this machine. Same shape, two differences: `bootstrap`/`bootout` instead of the
# deprecated `load`/`unload`, and a set of preflight checks, because this job
# serves private paintings and a half-configured one fails closed and silently.
#
# NOT RUN BY AN AGENT. A LaunchAgent is a standing change to PG's machine; the
# plist is drafted and this script waits for his yes.
#
# Uninstall: launchctl bootout gui/$(id -u)/com.pgos.cosmos && rm ~/Library/LaunchAgents/com.pgos.cosmos.plist

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/scripts/com.pgos.cosmos.plist"
DEST="$HOME/Library/LaunchAgents/com.pgos.cosmos.plist"
LABEL="com.pgos.cosmos"
LOG_DIR="$HOME/Library/Logs/pgos"

# ── Preflight ────────────────────────────────────────────────────────────────

fail() { echo "install-cosmos-service: $1" >&2; exit 1; }

[ -f "$SRC" ] || fail "no plist at $SRC"

[ -f "$ROOT/.env.local" ] || fail "no .env.local at $ROOT (the gate needs PGOS_SHARED_SECRET; without it /cosmos is 404)"

# Read the key names only. Values are never printed by this script.
grep -q '^PGOS_SHARED_SECRET=..' "$ROOT/.env.local" || fail "PGOS_SHARED_SECRET is missing or empty in .env.local"
grep -q '^COSMOS_ROOT=' "$ROOT/.env.local" || echo "install-cosmos-service: warning, COSMOS_ROOT unset; the reader falls back to /Users/pg/cortex/cosmos" >&2

[ -d "$ROOT/.next" ] || fail "no .next at $ROOT — run 'pnpm build' first"

# The plist names an absolute WorkingDirectory. If this checkout moved (the
# worktree merging into ~/cortex/personal-os is the expected case), say so rather
# than installing a job that starts in the wrong tree.
PLIST_ROOT="$(/usr/libexec/PlistBuddy -c 'Print :WorkingDirectory' "$SRC" 2>/dev/null || echo "")"
if [ -n "$PLIST_ROOT" ] && [ "$PLIST_ROOT" != "$ROOT" ]; then
  fail "the plist's WorkingDirectory is $PLIST_ROOT but this checkout is $ROOT — update the two AT MERGE lines in the plist first"
fi

chmod +x "$ROOT/scripts/cosmos-start.sh"
mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

# ── Install ──────────────────────────────────────────────────────────────────

install -m 644 "$SRC" "$DEST"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$DEST"

echo "installed: $DEST"
echo "serving:   http://127.0.0.1:3030 (KeepAlive, restarts on crash and at login)"
echo "log:       $LOG_DIR/cosmos.log"
echo
echo "Once per device, open http://127.0.0.1:3030/?key=<PGOS_SHARED_SECRET> — the cookie lasts 90 days."
echo "After a merge or a code change: pnpm build && launchctl kickstart -k gui/\$(id -u)/$LABEL"
