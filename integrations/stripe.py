"""Stripe CLI mirror — pulls last 30 days of charges into modules/income.md.

Companion to the upwork project's `agent/stripe_hook.py` (which handles real-time
webhook events). This script is for retroactive backfill OR if you want a daily
cron pull as an alternative to webhook hosting.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODULES = ROOT / "modules"


def main() -> int:
    api_key = os.environ.get("STRIPE_API_KEY", "")
    if not api_key:
        print("[stripe] STRIPE_API_KEY missing")
        return 1
    try:
        import stripe
    except ImportError:
        print("[stripe] pip install stripe")
        return 1
    stripe.api_key = api_key

    now = datetime.now(timezone.utc)
    start = int((now - timedelta(days=30)).timestamp())
    charges = stripe.Charge.list(created={"gte": start}, limit=100, status="succeeded")

    total_cents = 0
    by_day = {}
    for ch in charges.auto_paging_iter():
        total_cents += ch.amount
        day = datetime.fromtimestamp(ch.created, timezone.utc).strftime("%Y-%m-%d")
        by_day[day] = by_day.get(day, 0) + ch.amount

    p = MODULES / "income.md"
    if not p.exists():
        return 1
    text = p.read_text()
    block = (
        f"\n## Stripe 30-day summary (pulled {now.isoformat()[:10]})\n\n"
        f"- **Total received:** ${total_cents / 100:,.2f}\n"
        f"- **Active days:** {len(by_day)}\n"
    )
    marker = "## Stripe 30-day summary"
    if marker in text:
        head, _, rest = text.partition(marker)
        next_section = "\n## "
        if next_section in rest:
            rest_idx = rest.index(next_section, 1)
            tail = rest[rest_idx:]
        else:
            tail = ""
        text = head.rstrip() + block.lstrip() + tail
    else:
        text = text.rstrip() + "\n" + block
    p.write_text(text)
    print(f"[stripe] wrote ${total_cents / 100:,.2f} from {len(by_day)} active days")
    return 0


if __name__ == "__main__":
    sys.exit(main())
