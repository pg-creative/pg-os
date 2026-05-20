#!/usr/bin/env python3
"""
PixelLab batch generator — true pixel-art sprites for the Cockpit (Marvis + agents).

Mirrors run-mj-batch.py but hits the PixelLab API (real pixel sprites, not MJ's
faux-pixel look). Endpoint: POST https://api.pixellab.ai/v1/generate-image-pixflux
Auth: Authorization: Bearer $PIXELLAB_API_KEY
Body: {"description": str, "image_size": {"width": int, "height": int}}
Resp: {"image": {"base64": "<png>"}}

Usage: PIXELLAB_API_KEY=... python3 scripts/run-pixellab-batch.py [--filter X] [--parallel K] [--out-dir D]
Saves <slug>.png to OUT_DIR (default public/agent-office/pixel/). Idempotent.
"""
from __future__ import annotations
import argparse, base64, json, os, sys, time, urllib.request, concurrent.futures
from pathlib import Path

BASE = "https://api.pixellab.ai/v1"
ENDPOINT = f"{BASE}/generate-image-pixflux"
ANIM_ENDPOINT = f"{BASE}/animate-with-text"
OUT_DIR = Path("/Users/pg/CEREBRUM/personal-os/public/agent-office/pixel")

# 7 distinct MARVIS concepts (the orchestrator presence) in PG's Ghibli golden-hour
# JRPG DNA. 64px so they're animatable via animate-with-text (64x64 only).
PROMPTS = [
    ("marvis-wisp", "a glowing amber will-o-wisp hearth spirit, a small floating flame light being with two calm eyes, warm gold and cream glow with soft embers, Studio Ghibli Calcifer energy, dark navy background, centered", 64),
    ("marvis-sage", "a small wise hooded sage spirit cradling a glowing amber orb of light, cream and gold robe with deep blue trim, serene, floating, Studio Ghibli golden hour, dark navy background, centered", 64),
    ("marvis-owl", "a small ornate brass clockwork owl familiar with glowing amber eyes and golden gears, magical mechanical companion, warm gold and bronze, dark navy background, centered", 64),
    ("marvis-crystal", "a floating crystalline guardian being of amber and gold gemstone facets glowing with warm inner light, Laputa crystal energy, magical, dark navy background, centered", 64),
    ("marvis-kitsune", "a small celestial nine-tailed fox spirit with flowing golden flame tails and amber eyes, ethereal, warm gold and cream, Studio Ghibli magic, dark navy background, centered", 64),
    ("marvis-lantern", "a small genie-like light spirit gently rising from an ornate glowing golden lantern, wisps of warm amber light, magical, Studio Ghibli, dark navy background, centered", 64),
    ("marvis-construct", "a small floating guardian construct of warm golden light with glowing runes orbiting it, magical automaton core, amber and cream, dark navy background, centered", 64),
]
ACTIONS = ["idle", "talk"]  # animation states


def animate(slug: str, desc: str, key: str, out_dir: Path) -> list[dict]:
    """Animate a generated base sprite into frame-sets per action via animate-with-text."""
    base = out_dir / f"{slug}.png"
    results = []
    if not base.exists():
        return [{"slug": slug, "action": a, "status": "no_base"} for a in ACTIONS]
    ref_b64 = base64.b64encode(base.read_bytes()).decode()
    for action in ACTIONS:
        # skip if first frame already exists
        if (out_dir / f"{slug}-{action}-0.png").exists():
            results.append({"slug": slug, "action": action, "status": "cached"})
            continue
        body = json.dumps({
            "description": desc, "action": action,
            "image_size": {"width": 64, "height": 64},
            "reference_image": {"type": "base64", "base64": ref_b64},
        }).encode()
        req = urllib.request.Request(ANIM_ENDPOINT, data=body, method="POST")
        req.add_header("Authorization", f"Bearer {key}")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                data = json.loads(r.read().decode())
            frames = data.get("images") or []
            for i, fr in enumerate(frames):
                b64 = fr.get("base64") if isinstance(fr, dict) else fr
                if b64:
                    (out_dir / f"{slug}-{action}-{i}.png").write_bytes(base64.b64decode(b64))
            results.append({"slug": slug, "action": action, "status": "ok", "frames": len(frames)})
        except Exception as e:
            results.append({"slug": slug, "action": action, "status": "error", "error": str(e)[:160]})
    return results


def generate(slug: str, desc: str, size: int, key: str, out_dir: Path) -> dict:
    dest = out_dir / f"{slug}.png"
    if dest.exists():
        return {"slug": slug, "status": "cached"}
    body = json.dumps({"description": desc, "image_size": {"width": size, "height": size}}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, method="POST")
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = json.loads(r.read().decode())
        b64 = (data.get("image") or {}).get("base64")
        if not b64:
            return {"slug": slug, "status": "no_image", "resp": str(data)[:200]}
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(base64.b64decode(b64))
        return {"slug": slug, "status": "ok", "bytes": dest.stat().st_size}
    except Exception as e:
        return {"slug": slug, "status": "error", "error": str(e)[:200]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--filter", default=None)
    ap.add_argument("--parallel", type=int, default=3)
    ap.add_argument("--out-dir", default=str(OUT_DIR))
    ap.add_argument("--stage", default="all", choices=["base", "animate", "all"])
    args = ap.parse_args()
    key = os.environ.get("PIXELLAB_API_KEY")
    if not key:
        print("PIXELLAB_API_KEY not set", file=sys.stderr); return 2
    out_dir = Path(args.out_dir)
    prompts = [p for p in PROMPTS if not args.filter or args.filter in p[0]]

    if args.stage in ("base", "all"):
        print(f"== STAGE base: {len(prompts)} sprites -> {out_dir}")
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.parallel) as ex:
            futs = {ex.submit(generate, s, d, sz, key, out_dir): s for s, d, sz in prompts}
            for f in concurrent.futures.as_completed(futs):
                r = f.result()
                print(f"  {r.get('status'):8s} {r.get('slug'):16s} {r.get('error') or r.get('bytes') or r.get('resp') or ''}")

    if args.stage in ("animate", "all"):
        print(f"== STAGE animate: {len(prompts)} sprites x {ACTIONS}")
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.parallel) as ex:
            futs = {ex.submit(animate, s, d, key, out_dir): s for s, d, sz in prompts}
            for f in concurrent.futures.as_completed(futs):
                for r in f.result():
                    print(f"  {r.get('status'):8s} {r.get('slug'):12s} {r.get('action'):6s} {r.get('error') or r.get('frames') or ''}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
