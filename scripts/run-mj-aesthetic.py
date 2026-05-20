#!/usr/bin/env python3
"""
Run a batch of Midjourney generations against the legnext.ai API for PG OS visual overhaul.
Saves 4 candidates per prompt to personal-os/public/art/2026-05-15/.

Usage:
    LEGNEXT_API_KEY=... python3 scripts/run-mj-batch.py [--limit N] [--parallel K] [--filter PATTERN]

Reads prompts from scripts/mj-prompts-2026-05-15.md. Adapted from
~/CEREBRUM/wayfarer/scripts/run-mj-batch.py.

Critical gotchas (per ~/.claude/projects/-Users-pg/memory/reference_legnext_mj_api.md):
  - Python urllib default User-Agent gets 403'd on BOTH the API AND the image CDN.
    Set a non-default UA on EVERY request (submit, poll, download).
  - Pro tier = 30000 credits. This batch = ~36 gens × 80 credits = 2880 credits. ~10% monthly budget.
  - Endpoint: POST /api/v1/diffusion body {"text": "<prompt>"}. Returns {job_id, status: "pending"}.
  - Poll GET /api/v1/job/<id> until status=completed. Response has output.image_urls (array of 4).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import concurrent.futures
from dataclasses import dataclass
from pathlib import Path

REPO = Path("/Users/pg/CEREBRUM/personal-os/.claude/worktrees/cockpit")
PROMPTS_FILE = REPO / "scripts/mj-prompts-aesthetic-2026-05-20.md"
OUT_DIR = REPO / "public/art/aesthetic-2026-05-20"
LOG_FILE = REPO / "docs/mj-aesthetic-2026-05-20.md"

BASE = "https://api.legnext.ai"
GEN_ENDPOINT = f"{BASE}/api/v1/diffusion"
JOB_ENDPOINT = f"{BASE}/api/v1/job"

# Non-default UA — REQUIRED to avoid 403s on both API and image CDN.
UA = "pg-os-mj-batch/1.0 curl/8.0"

POLL_INTERVAL = 8  # seconds
POLL_TIMEOUT = 600  # 10 min per generation


@dataclass
class Prompt:
    section: str  # "hero" | "glyph" | "texture" | "avatar" | "bonus"
    filename_base: str
    text: str


def parse_prompts(md: str) -> list[Prompt]:
    """Extract prompts from mj-prompts-2026-05-15.md."""
    out: list[Prompt] = []
    lines = md.splitlines()
    section = "unknown"
    current_filename: str | None = None
    in_code = False
    code_buf: list[str] = []
    for line in lines:
        # Section markers
        lower = line.lower()
        if lower.startswith("## hero backdrops"):
            section = "hero"
        elif lower.startswith("## custom tab glyphs"):
            section = "glyph"
        elif lower.startswith("## parchment ui textures"):
            section = "texture"
        elif lower.startswith("## operator avatar"):
            section = "avatar"
        elif lower.startswith("## bonus"):
            section = "bonus"

        # Filename markers: -> `<filename>.png`
        m = re.search(r"->\s*`([^`]+\.png)`", line)
        if m:
            current_filename = m.group(1).replace(".png", "")

        # Code block toggling
        if line.strip() == "```":
            if in_code and current_filename and code_buf:
                text = "\n".join(code_buf).strip()
                if text:
                    out.append(Prompt(section=section, filename_base=current_filename, text=text))
                code_buf = []
                current_filename = None
                in_code = False
            else:
                in_code = True
                code_buf = []
            continue

        if in_code:
            code_buf.append(line)

    return out


def post_json(url: str, payload: dict, headers: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    for k, v in headers.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def get_json(url: str, headers: dict) -> dict:
    req = urllib.request.Request(url, method="GET")
    for k, v in headers.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def download(url: str, dest: Path, headers: dict) -> None:
    req = urllib.request.Request(url, method="GET")
    for k, v in headers.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


def generate_one(p: Prompt, api_key: str, out_dir: Path) -> dict:
    """Submit one prompt, poll until complete, download all 4 candidates."""
    headers = {"x-api-key": api_key, "Content-Type": "application/json", "User-Agent": UA}
    # Skip if any of the 4 candidate files already exist
    existing = [out_dir / f"{p.filename_base}_{i}.png" for i in range(4)]
    if all(f.exists() for f in existing):
        return {"prompt": p.filename_base, "status": "cached"}

    try:
        submit = post_json(GEN_ENDPOINT, {"text": p.text}, headers)
        job_id = submit.get("job_id") or submit.get("id")
        if not job_id:
            return {"prompt": p.filename_base, "status": "submit_failed", "response": submit}
    except Exception as e:
        return {"prompt": p.filename_base, "status": "submit_error", "error": str(e)}

    poll_start = time.time()
    while True:
        if time.time() - poll_start > POLL_TIMEOUT:
            return {"prompt": p.filename_base, "status": "poll_timeout", "job_id": job_id}
        try:
            data = get_json(f"{JOB_ENDPOINT}/{job_id}", headers)
        except Exception as e:
            return {"prompt": p.filename_base, "status": "poll_error", "error": str(e)}
        status = data.get("status", "")
        if status == "completed":
            output = data.get("output", {})
            urls = output.get("image_urls") or []
            if not urls and output.get("image_url"):
                urls = [output["image_url"]]
            for i, url in enumerate(urls[:4]):
                dest = out_dir / f"{p.filename_base}_{i}.png"
                dest.parent.mkdir(parents=True, exist_ok=True)  # support subdir slugs (characters/, environments/)
                try:
                    download(url, dest, {"User-Agent": UA})
                except Exception as e:
                    return {"prompt": p.filename_base, "status": "download_error", "error": str(e), "image_index": i}
            return {"prompt": p.filename_base, "status": "completed", "count": len(urls[:4])}
        if status == "failed":
            return {"prompt": p.filename_base, "status": "failed", "response": data}
        time.sleep(POLL_INTERVAL)


def check_balance(api_key: str) -> dict:
    headers = {"x-api-key": api_key, "User-Agent": UA}
    try:
        return get_json(f"{BASE}/api/account/balance", headers)
    except Exception as e:
        return {"error": str(e)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Cap on number of prompts to submit")
    parser.add_argument("--parallel", type=int, default=4, help="Parallel submissions (default 4)")
    parser.add_argument("--filter", type=str, default=None, help="Substring filter on filename_base")
    parser.add_argument("--prompts-file", type=str, default=str(PROMPTS_FILE), help="Prompts markdown file")
    parser.add_argument("--out-dir", type=str, default=str(OUT_DIR), help="Output dir for generated images")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without submitting")
    args = parser.parse_args()

    api_key = os.environ.get("LEGNEXT_API_KEY")
    if not api_key and not args.dry_run:
        print("LEGNEXT_API_KEY not set in environment.", file=sys.stderr)
        return 2

    prompts_file = Path(args.prompts_file)
    out_dir = Path(args.out_dir)
    md = prompts_file.read_text(encoding="utf-8")
    prompts = parse_prompts(md)
    if args.filter:
        prompts = [p for p in prompts if args.filter in p.filename_base]
    if args.limit:
        prompts = prompts[: args.limit]

    print(f"Parsed {len(prompts)} prompts.")
    for p in prompts[:3]:
        print(f"  · {p.filename_base} [{p.section}] · {p.text[:60]}...")
    if len(prompts) > 3:
        print(f"  ... +{len(prompts) - 3} more")

    if args.dry_run:
        return 0

    out_dir.mkdir(parents=True, exist_ok=True)
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

    bal = check_balance(api_key)
    print(f"Balance: {bal}")
    est_cost = len(prompts) * 80
    print(f"Estimated cost: {est_cost} credits ({est_cost / 30000 * 100:.1f}% of monthly Pro budget)")

    started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    results: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.parallel) as ex:
        futures = {ex.submit(generate_one, p, api_key, OUT_DIR): p for p in prompts}
        for f in concurrent.futures.as_completed(futures):
            r = f.result()
            results.append(r)
            print(f"  {r.get('status'):15s}  {r.get('prompt'):30s}  {r.get('count') or ''}")

    finished_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Log to docs/mj-batch-2026-05-15.md
    counts = {"completed": 0, "cached": 0, "failed": 0, "error": 0}
    for r in results:
        s = r.get("status", "")
        if s == "completed":
            counts["completed"] += 1
        elif s == "cached":
            counts["cached"] += 1
        elif s == "failed" or "fail" in s:
            counts["failed"] += 1
        elif "error" in s:
            counts["error"] += 1

    log_md = f"""# MJ Batch Log — 2026-05-15

Started: {started_at}
Finished: {finished_at}
Total prompts: {len(prompts)}
Completed: {counts['completed']}
Cached (already downloaded): {counts['cached']}
Failed: {counts['failed']}
Errors: {counts['error']}

## Per-prompt results

| Filename | Status | Notes |
|---|---|---|
""" + "\n".join(
        f"| `{r.get('prompt')}` | {r.get('status')} | {r.get('error', '') or r.get('count', '')} |" for r in results
    )

    LOG_FILE.write_text(log_md, encoding="utf-8")
    print(f"\nLog: {LOG_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
