#!/usr/bin/env python3
"""
export-cowork-signals.py — Parse Cowork session exports into the same
signal format as Claude Code findings.

Usage:
    python3 scripts/export-cowork-signals.py

Reads markdown/text exports from ~/.pg-os/claude/cowork-exports/ and
writes a JSONL file at ~/.pg-os/claude/cowork-signals.jsonl that the
Personal OS Claude tab merges with Claude Code findings.
"""

import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime

EXPORTS_DIR = Path.home() / ".pg-os" / "claude" / "cowork-exports"
OUTPUT_FILE = Path.home() / ".pg-os" / "claude" / "cowork-signals.jsonl"


# Same patterns as ~/.claude/self-improvement/transcript-parser/parse_transcripts.py
CORRECTION_PATTERNS = [
    (r"\bno[,.]?\s+(that|i |don|it|we|you|this)", "direct_no"),
    (r"\bthat'?s (wrong|not|incorrect)", "thats_wrong"),
    (r"\bactually[,.]?\s", "actually"),
    (r"\bi meant\b", "i_meant"),
    (r"\bi mean\b", "i_mean"),
    (r"\bnot (what|that)\b", "not_what"),
    (r"\bdon'?t (do|use|run|add)\b", "dont"),
    (r"\bstop\b", "stop"),
    (r"\bnope\b", "nope"),
    (r"\bwrong\b", "wrong"),
    (r"\binstead\b", "instead"),
    (r"\bredo\b", "redo"),
    (r"\bundo\b", "undo"),
    (r"\brevert\b", "revert"),
]

CONFIRMATION_PATTERNS = [
    (r"\bperfect\b", "perfect"),
    (r"\bgreat\b(?!\s+question)", "great"),
    (r"\bnailed it\b", "nailed_it"),
    (r"\blooks good\b", "looks_good"),
    (r"\blgtm\b", "lgtm"),
    (r"\bship it\b", "ship_it"),
    (r"\byes[,.]?\s+(that|exactly|please|do)", "yes_that"),
    (r"\bexactly\b", "exactly"),
    (r"\bawesome\b", "awesome"),
    (r"\bnice\b", "nice"),
    (r"\bthanks?\b(?!\s+but)", "thanks"),
    (r"\b(love|loving) (it|this|that)\b", "love"),
]


def detect_signals(text: str):
    """Return (signal_types, signal_details) for a user message."""
    if not text:
        return [], []
    lower = text.lower()
    types = set()
    details = []
    for pattern, name in CORRECTION_PATTERNS:
        if re.search(pattern, lower):
            types.add("correction")
            details.append({"type": "correction", "pattern": name})
            break  # One correction signal per message is enough
    for pattern, name in CONFIRMATION_PATTERNS:
        if re.search(pattern, lower):
            types.add("confirmation")
            details.append({"type": "confirmation", "pattern": name})
            break
    return sorted(types), details


def parse_export_file(path: Path):
    """Yield (user_text, assistant_context, timestamp, session_id) tuples.

    Expected format (loose markdown): blocks separated by `---` or repeated
    `## User:` / `## Assistant:` headings. Falls back to treating the whole
    file as one user message if no structure is found.
    """
    raw = path.read_text(encoding="utf-8", errors="replace")
    session_id = path.stem
    # Try to extract a timestamp from the filename: cowork-YYYY-MM-DD-HHMM.md
    ts_match = re.search(r"(\d{4}-\d{2}-\d{2})", path.name)
    file_ts = ts_match.group(1) + "T12:00:00Z" if ts_match else datetime.utcnow().isoformat() + "Z"

    blocks = re.split(r"\n##\s+", raw)
    last_assistant = ""
    for block in blocks:
        if block.lower().startswith("user"):
            user_text = re.sub(r"^user:?\s*", "", block, flags=re.IGNORECASE).strip()
            if user_text:
                yield user_text, last_assistant, file_ts, session_id
        elif block.lower().startswith("assistant"):
            last_assistant = re.sub(r"^assistant:?\s*", "", block, flags=re.IGNORECASE).strip()[:280]


def main():
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    files = sorted(EXPORTS_DIR.glob("*.md")) + sorted(EXPORTS_DIR.glob("*.txt"))
    if not files:
        print(f"[cowork-signals] no exports in {EXPORTS_DIR}; writing empty file", file=sys.stderr)
        OUTPUT_FILE.write_text("")
        return

    written = 0
    with OUTPUT_FILE.open("w", encoding="utf-8") as out:
        for export in files:
            for user_text, assistant_context, ts, session_id in parse_export_file(export):
                signals, details = detect_signals(user_text)
                if not signals:
                    continue
                row = {
                    "signals": signals,
                    "signal_details": details,
                    "user_text": user_text[:600],
                    "assistant_context": assistant_context,
                    "timestamp": ts,
                    "session_id": session_id,
                    "project": "cowork",
                }
                out.write(json.dumps(row) + "\n")
                written += 1

    os.chmod(OUTPUT_FILE, 0o600)
    print(f"[cowork-signals] wrote {written} signals from {len(files)} exports → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
