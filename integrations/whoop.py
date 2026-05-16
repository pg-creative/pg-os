"""WHOOP CLI mirror — pulls daily recovery + sleep + strain, writes markdown.

The existing PG OS Next.js app at `src/lib/whoop.ts` handles OAuth + live UI.
This script is the **offline cron-friendly mirror** that writes rolling-30-day
data into modules/fitness.md and modules/sleep.md so the snapshot skill and
dashboard reads stay LLM-friendly.

Token storage: piggybacks on the existing `~/.pg-os/tokens.json` written by
the Next.js OAuth flow. If that file doesn't exist or doesn't have whoop tokens,
falls back to env vars (WHOOP_ACCESS_TOKEN, WHOOP_REFRESH_TOKEN).

Run modes:
- One-shot: python integrations/whoop.py
- Daily cron: launchd plist (TODO) calls this at 6am
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODULES = ROOT / "modules"
CACHE = ROOT / "data"
CACHE.mkdir(exist_ok=True)
TOKENS_PATH = Path.home() / ".pg-os" / "tokens.json"
CACHE_PATH = CACHE / "whoop-cache.json"


def load_tokens() -> tuple[str, str]:
    """Get (access_token, refresh_token) from PG OS token store or env."""
    if TOKENS_PATH.exists():
        try:
            data = json.loads(TOKENS_PATH.read_text())
            whoop = data.get("whoop", {})
            access = whoop.get("access_token", "")
            refresh = whoop.get("refresh_token", "")
            if access:
                return access, refresh
        except Exception:
            pass
    return os.environ.get("WHOOP_ACCESS_TOKEN", ""), os.environ.get("WHOOP_REFRESH_TOKEN", "")


def fetch_whoop(endpoint: str, access_token: str, params: dict | None = None) -> dict:
    import requests
    headers = {"Authorization": f"Bearer {access_token}"}
    base = "https://api.prod.whoop.com/developer/v1"
    resp = requests.get(f"{base}{endpoint}", headers=headers, params=params or {})
    resp.raise_for_status()
    return resp.json()


def pull_30d_data(access_token: str) -> dict:
    """Pull rolling 30-day recovery + sleep + strain."""
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=30)
    params = {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "limit": 50,
    }
    recovery = fetch_whoop("/recovery", access_token, params)
    sleep = fetch_whoop("/activity/sleep", access_token, params)
    cycle = fetch_whoop("/cycle", access_token, params)
    return {"recovery": recovery, "sleep": sleep, "cycle": cycle, "pulled_at": end.isoformat()}


def compute_averages(data: dict) -> dict:
    """Reduce the raw API responses to module-ready averages."""
    rec_records = data.get("recovery", {}).get("records", [])
    sleep_records = data.get("sleep", {}).get("records", [])
    cycle_records = data.get("cycle", {}).get("records", [])

    def avg(values: list[float]) -> float:
        return round(sum(values) / len(values), 1) if values else 0.0

    recovery_scores = [r.get("score", {}).get("recovery_score", 0) for r in rec_records]
    strain_scores = [c.get("score", {}).get("strain", 0) for c in cycle_records]
    sleep_perf = [s.get("score", {}).get("sleep_performance_percentage", 0) for s in sleep_records]
    sleep_eff = [s.get("score", {}).get("sleep_efficiency_percentage", 0) for s in sleep_records]
    sleep_consistency = [s.get("score", {}).get("sleep_consistency_percentage", 0) for s in sleep_records]

    return {
        "recovery_avg": avg([x for x in recovery_scores if x]),
        "strain_avg": avg([x for x in strain_scores if x]),
        "sleep_performance_avg": avg([x for x in sleep_perf if x]),
        "sleep_efficiency_avg": avg([x for x in sleep_eff if x]),
        "sleep_consistency_avg": avg([x for x in sleep_consistency if x]),
        "days_pulled": len(rec_records),
        "high_recovery_days": sum(1 for x in recovery_scores if x >= 70),
        "low_recovery_days": sum(1 for x in recovery_scores if x and x < 33),
    }


def update_fitness_md(stats: dict) -> None:
    p = MODULES / "fitness.md"
    if not p.exists():
        return
    text = p.read_text()
    block = (
        f"\n## WHOOP-tracked metrics (rolling 30-day) — pulled {datetime.utcnow().isoformat()[:10]}\n"
        f"- **Strain avg:** {stats['strain_avg']}\n"
        f"- **Recovery avg:** {stats['recovery_avg']}%\n"
        f"- **High recovery days (≥70):** {stats['high_recovery_days']} of {stats['days_pulled']}\n"
        f"- **Low recovery days (<33):** {stats['low_recovery_days']} of {stats['days_pulled']}\n"
    )
    marker = "## WHOOP-tracked metrics (rolling 30-day)"
    if marker in text:
        head, _, _ = text.partition(marker)
        rest = text[text.index(marker):]
        # cut to next ##
        next_section = "\n## "
        if next_section in rest:
            rest_idx = rest.index(next_section, 1)
            tail = rest[rest_idx:]
        else:
            tail = ""
        text = head.rstrip() + block.lstrip() + tail
    p.write_text(text)


def update_sleep_md(stats: dict) -> None:
    p = MODULES / "sleep.md"
    if not p.exists():
        return
    text = p.read_text()
    block = (
        f"\n## WHOOP-tracked metrics (rolling 30-day) — pulled {datetime.utcnow().isoformat()[:10]}\n"
        f"- **Sleep performance avg:** {stats['sleep_performance_avg']}%\n"
        f"- **Sleep efficiency avg:** {stats['sleep_efficiency_avg']}%\n"
        f"- **Sleep consistency avg:** {stats['sleep_consistency_avg']}%\n"
    )
    marker = "## WHOOP-tracked metrics (rolling 30-day)"
    if marker in text:
        head, _, _ = text.partition(marker)
        rest = text[text.index(marker):]
        next_section = "\n## "
        if next_section in rest:
            rest_idx = rest.index(next_section, 1)
            tail = rest[rest_idx:]
        else:
            tail = ""
        text = head.rstrip() + block.lstrip() + tail
    p.write_text(text)


def main() -> int:
    access, refresh = load_tokens()
    if not access:
        print("[whoop] no access token (PG OS token store missing + env empty). "
              "Visit http://127.0.0.1:3030 and connect WHOOP OAuth first.")
        return 1

    try:
        data = pull_30d_data(access)
    except Exception as e:
        print(f"[whoop] pull failed: {e}")
        print("[whoop] If token expired, the Next.js OAuth flow refreshes it automatically.")
        return 1

    CACHE_PATH.write_text(json.dumps(data, indent=2))
    stats = compute_averages(data)
    update_fitness_md(stats)
    update_sleep_md(stats)
    print(f"[whoop] updated modules/fitness.md + modules/sleep.md with {stats['days_pulled']} days")
    return 0


if __name__ == "__main__":
    sys.exit(main())
