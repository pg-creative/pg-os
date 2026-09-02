"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Backdrop Lab — why the Emaki sky doesn't feel animated, and what fixes it.
 *
 * GHOSTED (what ships today)   EmakiBackdrop stacks tk.backdropImg three times at
 *                              0.06–0.2 opacity and moves the copies at different
 *                              speeds. That is a double-image smear, not parallax.
 *
 * MULTIPLANE (proposed)        Separated planes at different depths, drifting at
 *                              different rates. This is the multiplane camera the
 *                              Ghibli look comes from: artwork on sheets of glass at
 *                              different distances. The RATIO between rates is the
 *                              depth cue; opacity cannot fake it.
 *
 * The sky plate is the real /art/tabs/<tab>-<phase>.webp. The far/mid/near planes are
 * PROCEDURAL STAND-INS — the paintings don't exist yet. Judge the motion, not the art.
 *
 * Also demonstrates the veil change: a vignette darkens edges and corners where type
 * lives instead of draining colour from the middle, which lets the veil sit near 22%
 * instead of the 38/55% in tabBackdrops.ts, and the pinks come back.
 */

type Mode = "ghost" | "plane";
type Phase = "day" | "twilight" | "night";

const PHASES: { id: Phase; label: string; scrim: string; petals: [string, string] }[] = [
  { id: "day", label: "Day", scrim: "#ECE2CE", petals: ["#E8C9A0", "#F6E3C2"] },
  { id: "twilight", label: "Twilight", scrim: "#241D3A", petals: ["#E0A0D0", "#F6CCE2"] },
  { id: "night", label: "Night", scrim: "#0A0806", petals: ["#E8A840", "#FFD08A"] },
];

/** Procedural silhouette plane. Replaced by real alpha art once generated. */
function silhouette(seed: number, hue: string, alpha: number, peaks: number): string {
  const w = 1600, h = 900;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  let s = seed;
  const rnd = () => ((s = s * 1103515245 + 12345) >>> 16) / 65536;
  g.globalAlpha = alpha;
  for (let i = 0; i < peaks; i++) {
    const cx = rnd() * w, cy = h * (0.3 + rnd() * 0.34);
    const rw = w * (0.07 + rnd() * 0.14), rh = rw * (0.3 + rnd() * 0.33);
    const grd = g.createLinearGradient(0, cy - rh, 0, cy + rh * 2.6);
    grd.addColorStop(0, hue); grd.addColorStop(1, "rgba(20,12,34,0)");
    g.fillStyle = grd;
    g.beginPath(); g.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx - rw, cy); g.lineTo(cx + rw, cy);
    g.lineTo(cx + rw * 0.24, cy + rh * (1.7 + rnd() * 1.1));
    g.lineTo(cx - rw * 0.3, cy + rh * 1.4);
    g.closePath(); g.fill();
  }
  return c.toDataURL("image/png");
}

export default function BackdropLab() {
  const [mode, setMode] = useState<Mode>("plane");
  const [phase, setPhase] = useState<Phase>("twilight");
  const [veil, setVeil] = useState(22);
  const [vignette, setVignette] = useState(true);
  const [sep, setSep] = useState(100);
  const [count, setCount] = useState(40);
  const [gusts, setGusts] = useState(true);
  const [pointer, setPointer] = useState(true);
  const [fps, setFps] = useState(0);

  const stage = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const planes = useRef<(HTMLDivElement | null)[]>([]);
  const [art, setArt] = useState<{ far: string; mid: string; near: string } | null>(null);

  useEffect(() => {
    setArt({
      far: silhouette(7, "rgba(132,100,164,0.60)", 0.55, 7),
      mid: silhouette(41, "rgba(92,60,124,0.84)", 0.8, 4),
      near: silhouette(93, "rgba(42,24,64,0.94)", 0.92, 3),
    });
  }, []);

  useEffect(() => {
    const el = stage.current, canvas = cv.current;
    if (!el || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let tx = 0, ty = 0, px = 0, py = 0;
    const move = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      tx = ((e.clientX - b.left) / b.width - 0.5) * 2;
      ty = ((e.clientY - b.top) / b.height - 0.5) * 2;
    };
    const leave = () => { tx = 0; ty = 0; };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);

    let dots: { x: number; y: number; z: number; r: number; vr: number; sw: number }[] = [];
    const dpr = () => Math.min(devicePixelRatio || 1, 2);
    const resize = () => {
      const b = el.getBoundingClientRect(), d = dpr();
      canvas.width = b.width * d; canvas.height = b.height * d;
      canvas.style.width = `${b.width}px`; canvas.style.height = `${b.height}px`;
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        z: 0.4 + Math.random() * 0.9, r: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.022, sw: Math.random() * Math.PI * 2,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(el);

    const cols = PHASES.find((p) => p.id === phase)!.petals;
    let raf = 0, t = 0, last = performance.now(), fr = 0, acc = 0;

    const frame = (now: number) => {
      const dt = Math.min(now - last, 50); last = now;
      if (!reduced) t += dt;
      fr++; acc += dt;
      if (acc > 500) { setFps(Math.round(fr / (acc / 1000))); fr = 0; acc = 0; }

      px += ((pointer && !reduced ? tx : 0) - px) * 0.05;
      py += ((pointer && !reduced ? ty : 0) - py) * 0.05;
      const drift = t * 0.00006, S = sep / 100;
      const depths = [0.06, 0.24, 0.52, 1.0];
      depths.forEach((d, i) => {
        const n = planes.current[i]; if (!n) return;
        const amp = (4 + d * 54) * S, pk = 3 + d * 41;
        const br = i === 2 && !reduced ? 1 + Math.sin(t * 0.00009) * 0.018 : 1;
        n.style.transform =
          `translate3d(${(Math.sin(drift + d * 1.5) * amp - px * pk).toFixed(2)}px,` +
          `${(Math.cos(drift * 0.8 + d * 1.5) * amp * 0.32 - py * pk * 0.55).toFixed(2)}px,0)` +
          (br !== 1 ? ` scale(${br.toFixed(4)})` : "");
      });

      const { width: w, height: h } = canvas, d = dpr();
      ctx.clearRect(0, 0, w, h);
      const g = gusts && !reduced ? 0.45 + Math.pow(Math.sin(t * 0.00021), 4) * 2.1 : 1;
      for (const p of dots) {
        if (!reduced) {
          p.sw += 0.012 * g; p.r += p.vr * g;
          p.y += (0.22 + p.z * 0.42) * g * (dt / 16);
          p.x += (Math.sin(p.sw) * 0.8 + 0.4) * g * p.z * (dt / 16);
          if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
          if (p.x > w + 20) p.x = -20;
        }
        const s = (3.2 + p.z * 5.4) * d;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = 0.26 + p.z * 0.44;
        ctx.fillStyle = p.z > 1 ? cols[1] : cols[0];
        ctx.beginPath(); ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(s, -s * 0.3, 0, s);
        ctx.quadraticCurveTo(-s, -s * 0.3, 0, -s);
        ctx.fill(); ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [phase, sep, count, gusts, pointer]);

  const ph = PHASES.find((p) => p.id === phase)!;
  const sky = `/art/tabs/home-${phase}.webp`;
  const v = veil / 100;
  const rgb = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  };
  const veilBg = vignette
    ? `radial-gradient(120% 92% at 50% 45%,
        rgba(${rgb(ph.scrim)},${(v * 0.28).toFixed(3)}) 0%,
        rgba(${rgb(ph.scrim)},${(v * 0.72).toFixed(3)}) 52%,
        rgba(${rgb(ph.scrim)},${(v * 1.55).toFixed(3)}) 100%)`
    : `linear-gradient(180deg, rgba(${rgb(ph.scrim)},${(v + 0.08).toFixed(3)}) 0%,
        rgba(${rgb(ph.scrim)},${v.toFixed(3)}) 100%)`;

  const layerSrc = mode === "ghost"
    ? [sky, sky, sky, sky]
    : [sky, art?.far ?? "", art?.mid ?? "", art?.near ?? ""];
  const layerOp = mode === "ghost" ? [1, 0.2, 0.2, 0.1] : [1, 1, 1, 1];
  const layerBlend = mode === "ghost" ? "screen" : "normal";

  return (
    <div className="bl">
      <style>{`
        .bl{padding:24px 28px 60px;max-width:1400px;margin:0 auto;position:relative;z-index:2}
        .bl h1{font-size:28px;margin:0 0 6px;letter-spacing:-.01em}
        .bl .sub{color:var(--ink-soft,#8a8378);max-width:74ch;margin:0 0 22px;font-size:14px;line-height:1.55}
        .bl-grid{display:grid;grid-template-columns:230px minmax(0,1fr);gap:22px;align-items:start}
        @media(max-width:900px){.bl-grid{grid-template-columns:1fr}}
        .bl-ctl{display:flex;flex-direction:column;gap:16px;position:sticky;top:16px}
        .bl-g{display:flex;flex-direction:column;gap:7px}
        .bl-l{font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;opacity:.6}
        .bl-seg{display:flex;border:1px solid rgba(128,128,128,.3);border-radius:7px;overflow:hidden}
        .bl-seg button{flex:1;background:transparent;border:0;padding:7px 4px;font:inherit;
          font-size:12.5px;cursor:pointer;color:inherit;opacity:.65;border-right:1px solid rgba(128,128,128,.22)}
        .bl-seg button:last-child{border-right:0}
        .bl-seg button[data-on="1"]{background:rgba(140,92,8,.16);opacity:1;font-weight:600}
        .bl-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;gap:8px}
        .bl-row input[type=range]{width:100%}
        .bl-stage{position:relative;height:560px;border-radius:14px;overflow:hidden;
          border:1px solid rgba(128,128,128,.28);background:#241D3A;isolation:isolate}
        .bl-plane{position:absolute;inset:-8%;background-size:cover;background-position:center;
          will-change:transform;transform:translate3d(0,0,0)}
        .bl-veil,.bl-cv{position:absolute;inset:0;pointer-events:none}
        .bl-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
          width:min(420px,80%);padding:20px 22px;border-radius:14px;
          background:rgba(36,29,58,.72);backdrop-filter:blur(22px) saturate(1.3);
          -webkit-backdrop-filter:blur(22px) saturate(1.3);
          border:1px solid rgba(224,160,208,.3);box-shadow:0 20px 60px -20px rgba(0,0,0,.6)}
        .bl-panel h3{margin:0;font-size:19px;color:#FBEEF2}
        .bl-panel p{margin:6px 0 0;font-size:13.5px;color:#D9BBD0;line-height:1.5}
        .bl-fps{position:absolute;right:11px;bottom:10px;font-size:10.5px;font-family:ui-monospace,monospace;
          color:#C8A9C0;background:rgba(20,14,30,.62);padding:3px 8px;border-radius:5px}
        .bl-note{margin-top:18px;font-size:13px;line-height:1.6;opacity:.78;max-width:80ch}
        .bl-note code{font-size:12px;padding:1px 5px;border-radius:4px;background:rgba(128,128,128,.14)}
      `}</style>

      <h1>Backdrop Lab</h1>
      <p className="sub">
        Ghosted is what <code>EmakiBackdrop</code> ships today: the same image three times at
        0.06–0.2 opacity. Multiplane separates the planes so they move at different rates, which is
        the actual depth cue. Sky plate is your real art; far/mid/near are procedural stand-ins.
      </p>

      <div className="bl-grid">
        <aside className="bl-ctl">
          <div className="bl-g">
            <span className="bl-l">Approach</span>
            <div className="bl-seg">
              {(["ghost", "plane"] as Mode[]).map((m) => (
                <button key={m} data-on={mode === m ? 1 : 0} onClick={() => setMode(m)}>
                  {m === "ghost" ? "Ghosted" : "Multiplane"}
                </button>
              ))}
            </div>
          </div>
          <div className="bl-g">
            <span className="bl-l">Phase</span>
            <div className="bl-seg">
              {PHASES.map((p) => (
                <button key={p.id} data-on={phase === p.id ? 1 : 0} onClick={() => setPhase(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bl-g">
            <span className="bl-l">Veil {veil}%</span>
            <input type="range" min={0} max={70} value={veil}
              onChange={(e) => setVeil(+e.target.value)} />
            <label className="bl-row">Vignette
              <input type="checkbox" checked={vignette} onChange={(e) => setVignette(e.target.checked)} />
            </label>
          </div>
          <div className="bl-g">
            <span className="bl-l">Separation {sep}%</span>
            <input type="range" min={0} max={300} value={sep} onChange={(e) => setSep(+e.target.value)} />
            <label className="bl-row">Follow pointer
              <input type="checkbox" checked={pointer} onChange={(e) => setPointer(e.target.checked)} />
            </label>
          </div>
          <div className="bl-g">
            <span className="bl-l">Blossoms {count}</span>
            <input type="range" min={0} max={120} value={count} onChange={(e) => setCount(+e.target.value)} />
            <label className="bl-row">Gusts
              <input type="checkbox" checked={gusts} onChange={(e) => setGusts(e.target.checked)} />
            </label>
          </div>
        </aside>

        <div>
          <div className="bl-stage" ref={stage}>
            {layerSrc.map((src, i) => (
              <div key={i} ref={(n) => { planes.current[i] = n; }} className="bl-plane"
                style={{ backgroundImage: src ? `url("${src}")` : undefined,
                         opacity: layerOp[i], mixBlendMode: i === 0 ? "normal" : (layerBlend as never) }} />
            ))}
            <div className="bl-veil" style={{ background: veilBg }} />
            <canvas className="bl-cv" ref={cv} />
            <div className="bl-panel">
              <h3>Good evening, PG</h3>
              <p>Three agents idle. Nothing needs you right now.</p>
            </div>
            <div className="bl-fps">{fps} fps</div>
          </div>
          <p className="bl-note">
            Current shipped veil is <code>0.38</code> prominent / <code>0.55</code> subtle
            (<code>EmakiBackdrop.tsx</code>). The vignette holds legibility at the edges where the
            chrome sits, so the veil can drop to ~22% and the colour comes back. Panels keep carrying
            the text. Everything here is GPU-composited transform plus one canvas: no video, no shader.
          </p>
        </div>
      </div>
    </div>
  );
}
