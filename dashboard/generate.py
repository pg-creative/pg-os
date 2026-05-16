"""Dashboard generator — reads all module markdown + upwork state, emits index.html.

Single-page lightweight HTML served locally via `python -m http.server 8765`.
The existing Next.js app at :3030 is the rich interactive surface; this is a
zero-build mirror for offline / snapshot / phone-screenshot use.

Run: python dashboard/generate.py
Serve: python -m http.server 8765 -d dashboard
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODULES = ROOT / "modules"
DASHBOARD = ROOT / "dashboard"
TIERS_MD = ROOT / "tiers.md"
UPWORK = ROOT.parent / "upwork"
INCOME_LOG = UPWORK / "income-log.md"
REVENUE_TIERS = UPWORK / "revenue-tiers.md"


def read_or_empty(p: Path) -> str:
    return p.read_text() if p.exists() else ""


def parse_mtd_from_income_log() -> tuple[float, list[dict]]:
    """Return (mtd_dollars, recent_entries)."""
    text = read_or_empty(INCOME_LOG)
    if not text:
        return 0.0, []
    month = datetime.utcnow().strftime("%Y-%m")
    section = ""
    marker = f"## {month}"
    if marker in text:
        section = text.split(marker, 1)[1].split("\n## ", 1)[0]
    total = 0.0
    entries = []
    for line in section.splitlines():
        m = re.search(r"\$([\d,]+(?:\.\d+)?)", line)
        if m:
            amt = float(m.group(1).replace(",", ""))
            total += amt
            entries.append({"line": line.strip(), "amount": amt})
    return total, entries[:10]


def parse_tier_table(md_path: Path) -> list[dict]:
    """Extract ## Tier N: $X — ⬜/✅ rows."""
    text = read_or_empty(md_path)
    rows = []
    pattern = re.compile(
        r"## Tier\s*(\w+):\s*\$([\d,]+).*?—\s*([⬜✅])\s+(\w+)\s+—\s+Reward:\s*(.+?)$",
        re.MULTILINE,
    )
    for m in pattern.finditer(text):
        rows.append({
            "tier": m.group(1),
            "threshold": float(m.group(2).replace(",", "")),
            "unlocked": m.group(3) == "✅",
            "reward": m.group(5).strip(),
        })
    return rows


def parse_projects_table() -> list[dict]:
    text = read_or_empty(MODULES / "projects.md")
    rows = []
    for line in text.splitlines():
        if not line.startswith("| ") or "Project" in line or "---" in line:
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) >= 4:
            rows.append({
                "project": cells[0],
                "status": cells[1],
                "last_commit": cells[2],
                "summary": cells[3],
            })
    return rows


def render_html(state: dict) -> str:
    mtd = state["mtd"]
    target = state["monthly_target"]
    pct = min(100, int(mtd * 100 / target)) if target else 0
    tier_rows_html = "".join(
        f'<tr class="{"unlocked" if t["unlocked"] else "locked"}">'
        f'<td>{t["tier"]}</td>'
        f'<td>${int(t["threshold"]):,}</td>'
        f'<td>{"✅" if t["unlocked"] else "⬜"}</td>'
        f'<td>{t["reward"]}</td></tr>'
        for t in state["revenue_tiers"]
    )
    project_rows_html = "".join(
        f'<tr><td>{p["project"]}</td><td>{p["status"]}</td><td>{p["last_commit"]}</td><td>{p["summary"]}</td></tr>'
        for p in state["projects"]
    )
    income_lines = "".join(f"<li><code>{e['line']}</code></li>" for e in state["recent_income"])

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>PG OS — Lightweight Dashboard</title>
  <style>
    body {{ font: 14px/1.5 -apple-system, BlinkMacSystemFont, ui-sans-serif, sans-serif;
           background: #0f1419; color: #e4e9ee; margin: 0; padding: 24px; max-width: 1100px; margin: 0 auto; }}
    h1 {{ font-size: 22px; margin: 0 0 6px; letter-spacing: 0.02em; }}
    h2 {{ font-size: 16px; margin: 28px 0 8px; color: #9aa6b1; text-transform: uppercase; letter-spacing: 0.08em; }}
    .meta {{ color: #6b7884; font-size: 12px; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }}
    .card {{ background: #1a2128; border: 1px solid #2a323b; border-radius: 10px; padding: 16px; }}
    .big {{ font-size: 36px; font-weight: 600; margin: 6px 0; color: #f0e0a0; }}
    .bar {{ height: 8px; background: #2a323b; border-radius: 4px; overflow: hidden; margin-top: 8px; }}
    .bar > div {{ height: 100%; background: linear-gradient(90deg, #d4a73e, #f0e0a0); transition: width 0.4s; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
    td, th {{ padding: 6px 8px; border-bottom: 1px solid #232a32; text-align: left; vertical-align: top; }}
    tr.unlocked td {{ color: #c5e0a0; }}
    tr.locked td {{ color: #6b7884; }}
    code {{ background: #232a32; padding: 1px 5px; border-radius: 3px; font-size: 12px; }}
    a {{ color: #8ab4f8; }}
  </style>
</head>
<body>
  <h1>PG OS — Lightweight Dashboard</h1>
  <div class="meta">Generated {state["generated_at"]}. Target $15K/mo by early October 2026.</div>

  <h2>Income</h2>
  <div class="grid">
    <div class="card">
      <div class="meta">MTD ({datetime.utcnow().strftime("%Y-%m")})</div>
      <div class="big">${mtd:,.0f}</div>
      <div class="meta">Target ${target:,.0f} ({pct}%)</div>
      <div class="bar"><div style="width: {pct}%"></div></div>
    </div>
    <div class="card">
      <div class="meta">Recent income entries</div>
      <ul style="padding-left: 18px; margin: 8px 0 0;">{income_lines or "<li class=meta>(none yet)</li>"}</ul>
    </div>
  </div>

  <h2>Revenue Tiers</h2>
  <div class="card">
    <table>
      <thead><tr><th>Tier</th><th>Threshold</th><th>Unlocked</th><th>Reward</th></tr></thead>
      <tbody>{tier_rows_html or '<tr><td colspan=4 class=meta>(no tiers yet)</td></tr>'}</tbody>
    </table>
  </div>

  <h2>Projects</h2>
  <div class="card">
    <table>
      <thead><tr><th>Project</th><th>Status</th><th>Last commit</th><th>Summary</th></tr></thead>
      <tbody>{project_rows_html or '<tr><td colspan=4 class=meta>(no projects)</td></tr>'}</tbody>
    </table>
  </div>

  <h2>Module summaries</h2>
  <div class="grid">
    <div class="card">
      <div class="meta">Fitness</div>
      <pre style="white-space: pre-wrap; font-size: 12px; color: #c5cdd5; margin: 8px 0 0;">{state["fitness_excerpt"]}</pre>
    </div>
    <div class="card">
      <div class="meta">Sleep</div>
      <pre style="white-space: pre-wrap; font-size: 12px; color: #c5cdd5; margin: 8px 0 0;">{state["sleep_excerpt"]}</pre>
    </div>
    <div class="card">
      <div class="meta">Creative</div>
      <pre style="white-space: pre-wrap; font-size: 12px; color: #c5cdd5; margin: 8px 0 0;">{state["creative_excerpt"]}</pre>
    </div>
  </div>

  <h2>Cross-module tiers</h2>
  <div class="card">
    <pre style="white-space: pre-wrap; font-size: 12px; color: #c5cdd5; margin: 0;">{state["tiers_excerpt"]}</pre>
  </div>

  <div class="meta" style="margin-top: 32px;">
    Source files: <code>modules/*.md</code>, <code>tiers.md</code>, <code>../upwork/income-log.md</code>, <code>../upwork/revenue-tiers.md</code>.
    Regenerate: <code>python dashboard/generate.py</code>
  </div>
</body>
</html>
"""


def excerpt(p: Path, max_chars: int = 600) -> str:
    text = read_or_empty(p)
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "\n…"


def main() -> int:
    mtd, recent = parse_mtd_from_income_log()
    state = {
        "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "mtd": mtd,
        "monthly_target": 15000.0,
        "recent_income": recent,
        "revenue_tiers": parse_tier_table(REVENUE_TIERS),
        "cross_tiers_md": read_or_empty(TIERS_MD),
        "projects": parse_projects_table(),
        "fitness_excerpt": excerpt(MODULES / "fitness.md"),
        "sleep_excerpt": excerpt(MODULES / "sleep.md"),
        "creative_excerpt": excerpt(MODULES / "creative.md"),
        "tiers_excerpt": excerpt(TIERS_MD, 1500),
    }
    out = DASHBOARD / "index.html"
    out.write_text(render_html(state))
    # also write JSON state for the Next.js app to optionally consume
    (DASHBOARD / "state.json").write_text(
        json.dumps({k: v for k, v in state.items() if isinstance(v, (int, float, str, list, dict))}, indent=2, default=str)
    )
    print(f"[dashboard] wrote {out}")
    print(f"[dashboard] serve with: python -m http.server 8765 -d {DASHBOARD}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
