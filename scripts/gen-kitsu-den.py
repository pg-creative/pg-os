#!/usr/bin/env python3
"""
Generate Kitsu's painted den backdrop in 3 phases (day / twilight / night) via
the Legnext / Midjourney proxy, save the first upscaled quadrant to
public/kitsu/den-<phase>.png, then optimize to WebP (~150-200KB each).

The den is a small kitsune fox-spirit nook (shoji screens, foxfire lanterns,
fox masks, scrolls, a tea set) painted in the locked PG OS aesthetic (Ghibli
cel + golden hour + foxfire). 9:16 vertical aspect so it tiles nicely behind
the MarvisCorner panel on phone and desktop.

Reuses the same Legnext patterns as scripts/gen-tab-art.py (browser UA + x-api-key
+ POST diffusion + GET job poll). Run:
    python3 scripts/gen-kitsu-den.py
"""
import os, json, time, urllib.request, pathlib, shutil, subprocess

KEY = os.environ["LEGNEXT_API_KEY"]
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
H = {
    "User-Agent": UA,
    "Content-Type": "application/json",
    "Accept": "application/json",
    "x-api-key": KEY,
}
OUT = pathlib.Path("public/kitsu")
OUT.mkdir(parents=True, exist_ok=True)

SCENE = (
    "intimate kitsune fox spirit den interior, small wooden shrine nook with "
    "floating foxfire lanterns, paper shoji screens, ornate carved fox masks "
    "on shelves, ancient scrolls and a small tea set, cozy reading corner with "
    "embroidered cushions, deep warm indigo and ember gold palette, magical "
    "floating sparkles, Spirited Away meets Howl's Moving Castle atmosphere"
)

PHASES = {
    "day": "luminous morning sunlight through shoji screens, soft pastel warmth, open and airy, daytime",
    "twilight": "violet dusk light, lanterns just beginning to glow, drifting sakura petals, warm amber edges",
    "night": "deep foxfire spirit-night, golden ember lanterns floating, ink-blue shadows, moonlight",
}


def prompt(phase: str) -> str:
    return (
        f"Studio Ghibli anime cel animation style, {SCENE}, {PHASES[phase]}, "
        f"painted Japanese emaki picture-scroll aesthetic, cozy and mysterious, "
        f"anime background art, no text --v 7 --ar 16:9"
    )


def submit(text: str) -> str:
    body = json.dumps({"text": text, "model": "midjourney", "task_type": "imagine"}).encode()
    req = urllib.request.Request(
        "https://api.legnext.ai/api/v1/diffusion", data=body, headers=H, method="POST"
    )
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode()).get("job_id")


def poll(jid: str) -> dict:
    req = urllib.request.Request(f"https://api.legnext.ai/api/v1/job/{jid}", headers=H)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode())


def download(url: str, dest: pathlib.Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())


def optimize(png_path: pathlib.Path) -> pathlib.Path:
    """PNG (~2MB) -> WebP q80 (~180KB). Requires cwebp (brew install webp)."""
    webp = png_path.with_suffix(".webp")
    if not shutil.which("cwebp"):
        print(f"  cwebp not found; keeping PNG {png_path.name}", flush=True)
        return png_path
    try:
        subprocess.run(
            ["cwebp", "-q", "80", "-quiet", str(png_path), "-o", str(webp)], check=True
        )
        png_path.unlink(missing_ok=True)
        print(f"  webp {webp.name} ({webp.stat().st_size // 1024}KB)", flush=True)
        return webp
    except Exception as e:
        print(f"  webp FAIL {png_path.name}: {e}", flush=True)
        return png_path


jobs: dict[str, str] = {}
for phase in PHASES:
    try:
        jid = submit(prompt(phase))
        jobs[phase] = jid
        print(f"submit den-{phase} -> {jid}", flush=True)
        time.sleep(2)
    except Exception as e:
        print(f"submit FAIL den-{phase}: {e}", flush=True)

pending = dict(jobs)
deadline = time.time() + 60 * 20
done: dict[str, str] = {}
while pending and time.time() < deadline:
    time.sleep(15)
    for phase, jid in list(pending.items()):
        try:
            d = poll(jid)
        except Exception as e:
            print(f"poll err {phase}: {e}", flush=True)
            continue
        st = d.get("status")
        if st == "completed":
            urls = (d.get("output") or {}).get("image_urls") or []
            if urls:
                dest = OUT / f"den-{phase}.png"
                try:
                    download(urls[0], dest)
                    final = optimize(dest)
                    done[phase] = str(final)
                    print(f"DONE den-{phase} -> {final}", flush=True)
                except Exception as e:
                    print(f"dl err {phase}: {e}", flush=True)
            pending.pop(phase, None)
        elif st in ("failed", "error"):
            print(f"GEN FAIL {phase}: {json.dumps(d.get('error'))[:160]}", flush=True)
            pending.pop(phase, None)

print(
    f"\n=== {len(done)}/{len(jobs)} generated. Missing: "
    f"{[p for p in jobs if p not in done]} ===",
    flush=True,
)
