#!/usr/bin/env bash
# Install (or reinstall) the Kitsu proactive sweep launchd job.
# Free + reversible. Runs every 30 min against the local PG OS dev server (:3030).
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)/com.pgos.kitsu-sweep.plist"
DEST="$HOME/Library/LaunchAgents/com.pgos.kitsu-sweep.plist"

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/.pg-os/kitsu"
cp "$SRC" "$DEST"

# Reload cleanly if already loaded.
launchctl unload "$DEST" 2>/dev/null || true
launchctl load "$DEST"

echo "Kitsu sweep installed: $DEST"
echo "Runs every 30 min against http://127.0.0.1:3030/api/kitsu/sweep (silent if dev server is down)."
echo "Log: ~/.pg-os/kitsu/sweep.log"
echo "Uninstall: launchctl unload \"$DEST\" && rm \"$DEST\""
