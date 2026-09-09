#!/usr/bin/env bash
# Install the witness launchd job.
#
# EXTENDS scripts/install-kitsu-sweep.sh line for line: same copy, same clean
# reload, same uninstall hint. One addition, and it is the point of this file:
#
#   THIS SCRIPT REFUSES TO RUN WITHOUT --i-have-pgs-yes.
#
# Round one drafts the plist and does not install it. The route it schedules
# writes nothing yet (it computes weather and returns it), and a launchd job is
# machine configuration, which needs PG's specific approval every time. So the
# guard is a mechanism, not a comment saying please be careful.
set -euo pipefail

if [[ "${1:-}" != "--i-have-pgs-yes" ]]; then
  cat <<'MSG'
Refusing to install.

The witness plist is a draft. Installing it is a machine configuration change and
needs PG's specific approval, and the route it calls does not write anything yet.

When both are true, run:
    bash scripts/install-witness.sh --i-have-pgs-yes
MSG
  exit 2
fi

SRC="$(cd "$(dirname "$0")" && pwd)/com.pgos.witness.plist"
DEST="$HOME/Library/LaunchAgents/com.pgos.witness.plist"

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/.pg-os/witness"
cp "$SRC" "$DEST"

launchctl unload "$DEST" 2>/dev/null || true
launchctl load "$DEST"

echo "Witness installed: $DEST"
echo "Runs at 03:10 against http://127.0.0.1:3030/api/cosmos/witness (silent if the server is down)."
echo "Log: ~/.pg-os/witness/witness.log"
echo "Uninstall: launchctl unload \"$DEST\" && rm \"$DEST\""
