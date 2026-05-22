#!/usr/bin/env python3
"""
Bespoke per-tab Emaki x Laputa backdrop generator (Legnext / Midjourney proxy).

Generates one painted scene per tab in all 3 phases (day/twilight/night) and saves
the first upscaled quadrant to public/art/tabs/<tab>-<phase>.png. Wire via tabBackdrops.ts.

Run:  LEGNEXT_API_KEY must be set (it is, via ~/.zshenv).  python3 scripts/gen-tab-art.py
"""
import os, json, time, urllib.request, urllib.error, pathlib, shutil, subprocess

KEY = os.environ["LEGNEXT_API_KEY"]
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
H = {"User-Agent": UA, "Content-Type": "application/json", "Accept": "application/json", "x-api-key": KEY}
OUT = pathlib.Path("public/art/tabs"); OUT.mkdir(parents=True, exist_ok=True)

# Distinct painted scene per tab (the bespoke part). Kept in the Emaki x Laputa world.
SCENES = {
    "home":     "a serene torii gate over still water with floating sky-islands and distant Laputa castle",
    "cockpit":  "the helm of a wooden airship observatory among clouds, brass instruments and a great wheel",
    "habits":   "a tranquil shrine garden with stone stepping paths, koi pond and a small red torii",
    "projects": "a craftsman's floating workshop with hanging tools, blueprints and glowing forge among clouds",
    "flow":     "a winding river and waterfall cascading between floating sky-islands",
    "claude":   "a scholar's tall library tower of glowing tomes and ancient scrolls among clouds",
    "stack":    "a quiet armory and forge of fine tools and artifacts on a floating island",
    "timeline": "a long unfurling painted emaki scroll flowing like a river of time across the sky",
    "brain":    "a vast floating archive of glowing knowledge orbs and ancient scrolls among clouds",
}
# Phase grading modifiers (matches the locked 3-phase palette).
PHASES = {
    "day":      "luminous powder-blue Laputa sky, bright golden hour light, open and airy",
    "twilight": "cherry-blossom dusk, drifting sakura petals, indigo and rose sky, warm amber edges",
    "night":    "foxfire spirit-night, deep warm ink sky, golden embers and floating lanterns, moonlit",
}
def prompt(scene, phase):
    return (f"Studio Ghibli anime cel animation style, {scene}, {PHASES[phase]}, "
            f"painted Japanese emaki picture-scroll aesthetic, magical floating particles, "
            f"cinematic wide establishing shot, no text --v 7 --ar 16:9")

def submit(text):
    body = json.dumps({"text": text, "model": "midjourney", "task_type": "imagine"}).encode()
    req = urllib.request.Request("https://api.legnext.ai/api/v1/diffusion", data=body, headers=H, method="POST")
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode()).get("job_id")

def poll(jid):
    req = urllib.request.Request(f"https://api.legnext.ai/api/v1/job/{jid}", headers=H)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode())

def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())

def optimize(png_path):
    """Re-encode the downloaded PNG (~2MB) to WebP q80 (~180KB) — what the app
    actually serves (tabBackdrops.ts -> .webp) — then drop the heavy PNG.
    Requires cwebp (brew install webp). 27 imgs: ~46MB PNG -> ~4.8MB WebP."""
    webp = png_path.with_suffix(".webp")
    if not shutil.which("cwebp"):
        print(f"  cwebp not found; keeping PNG {png_path.name} (run: brew install webp)", flush=True)
        return png_path
    try:
        subprocess.run(["cwebp", "-q", "80", "-quiet", str(png_path), "-o", str(webp)], check=True)
        png_path.unlink(missing_ok=True)
        print(f"  webp {webp.name} ({webp.stat().st_size // 1024}KB)", flush=True)
        return webp
    except Exception as e:
        print(f"  webp FAIL {png_path.name}: {e}", flush=True)
        return png_path

# Submit all
jobs = {}  # (tab,phase) -> job_id
for tab, scene in SCENES.items():
    for phase in PHASES:
        try:
            jid = submit(prompt(scene, phase))
            jobs[(tab, phase)] = jid
            print(f"submit {tab}-{phase} -> {jid}", flush=True)
            time.sleep(2)
        except Exception as e:
            print(f"submit FAIL {tab}-{phase}: {e}", flush=True)

# Poll + download
pending = dict(jobs)
deadline = time.time() + 60 * 25
done = {}
while pending and time.time() < deadline:
    time.sleep(15)
    for key, jid in list(pending.items()):
        try:
            d = poll(jid)
        except Exception as e:
            print(f"poll err {key}: {e}", flush=True); continue
        st = d.get("status")
        if st == "completed":
            urls = (d.get("output") or {}).get("image_urls") or []
            if urls:
                dest = OUT / f"{key[0]}-{key[1]}.png"
                try:
                    download(urls[0], dest)
                    final = optimize(dest)
                    done[key] = str(final)
                    print(f"DONE {key[0]}-{key[1]} -> {final}", flush=True)
                except Exception as e:
                    print(f"dl err {key}: {e}", flush=True)
            pending.pop(key, None)
        elif st in ("failed", "error"):
            print(f"GEN FAIL {key}: {json.dumps(d.get('error'))[:160]}", flush=True)
            pending.pop(key, None)

print(f"\n=== {len(done)}/{len(jobs)} generated. Missing: {[f'{k[0]}-{k[1]}' for k in jobs if k not in done]} ===", flush=True)
