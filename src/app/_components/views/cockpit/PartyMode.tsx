"use client";

/**
 * PartyMode — "initialize party mode" 🎉. Heavy confetti + strobing lights +
 * the disco song in a deliberately cheesy old-2009-YouTube frame.
 *
 * Music strategy (hybrid, so it can NEVER show "video unavailable" again):
 *   1. Try a list of embeddable YouTube uploads of the song via the IFrame
 *      Player API. If an upload has embedding disabled (error 101/150) or is
 *      gone (100), auto-advance to the next candidate.
 *   2. If every candidate fails — or the embed is blocked by the origin (some
 *      browsers/dev origins reject all embeds) — fall back to a self-contained
 *      Web Audio disco groove + live audio-reactive equalizer. Zero network,
 *      zero copyright, can't break.
 *
 * Why the hybrid: the original single raw <iframe> pointed at i2FW1WJc0lg,
 * whose uploader disabled embedding — so it rendered YouTube's "Video
 * unavailable / Watch on YouTube" overlay. The IFrame API gives us onError, so
 * we detect that and route around it.
 */

import { useEffect, useRef, useState } from "react";

// Embeddable upload candidates for "Ain't No Stoppin' Us Now", tried in order.
// i2FW1WJc0lg (official audio) is embedding-DISABLED, so it sits last.
const VIDEO_CANDIDATES = [
  "ZEWkZb11pss", // Official Soul Train video
  "lI3voyMmidE", // Official TSOP performance
  "CDNHQd-8QGY", // Top of the Pops 4K
  "VgYczUH-QWQ", // 1979 performance
  "RRQHfA27gb8", // Lyrics
  "i2FW1WJc0lg", // Official audio (embedding disabled — last resort)
];

// ── YouTube IFrame API loader (singleton promise) ───────────────────────────
type YTNamespace = {
  Player: new (
    el: string | HTMLElement,
    opts: Record<string, unknown>,
  ) => unknown;
};
let ytReadyPromise: Promise<YTNamespace> | null = null;
function loadYouTubeAPI(): Promise<YTNamespace> {
  if (ytReadyPromise) return ytReadyPromise;
  ytReadyPromise = new Promise((resolve) => {
    const w = window as unknown as {
      YT?: YTNamespace;
      onYouTubeIframeAPIReady?: () => void;
    };
    if (w.YT && w.YT.Player) return resolve(w.YT);
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (w.YT) resolve(w.YT);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
  return ytReadyPromise;
}

// ── procedural disco engine (fallback) ──────────────────────────────────────
// A2..G4 frequencies (equal temperament, A4=440).
const HZ = {
  G2: 98.0,
  A2: 110.0,
  C3: 130.81,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
};

// 4-bar vamp in A minor: Am · F · C · G.
const BARS = [
  { root: HZ.A2, oct: HZ.A3, stab: [HZ.A3, HZ.C4, HZ.E4] },
  { root: HZ.F3, oct: HZ.F3 * 2, stab: [HZ.F3, HZ.A3, HZ.C4] },
  { root: HZ.C3, oct: HZ.C4, stab: [HZ.C4, HZ.E4, HZ.G4] },
  { root: HZ.G2, oct: HZ.G3, stab: [HZ.G3, HZ.B3, HZ.D4] },
];

class DiscoEngine {
  ctx: AudioContext;
  master: GainNode;
  analyser: AnalyserNode;
  noise: AudioBuffer;
  bpm = 118;
  step = 0;
  bar = 0;
  nextNoteTime = 0;
  timer: number | null = null;

  constructor() {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0;
    const comp = this.ctx.createDynamicsCompressor();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.master.connect(comp);
    comp.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  async start() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
    const now = this.ctx.currentTime;
    this.master.gain.setValueAtTime(0.0001, now);
    this.master.gain.exponentialRampToValueAtTime(0.55, now + 0.4);
    this.nextNoteTime = now + 0.06;
    this.step = 0;
    this.bar = 0;
    this.scheduler();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    try {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      setTimeout(() => this.ctx.close().catch(() => {}), 400);
    } catch {
      /* noop */
    }
  }

  scheduler = () => {
    this.timer = window.setInterval(() => {
      const sixteenth = 60 / this.bpm / 4;
      while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
        this.scheduleStep(this.step, this.bar, this.nextNoteTime);
        this.nextNoteTime += sixteenth;
        this.step++;
        if (this.step > 15) {
          this.step = 0;
          this.bar = (this.bar + 1) % BARS.length;
        }
      }
    }, 25);
  };

  scheduleStep(step: number, bar: number, t: number) {
    const b = BARS[bar];
    if (step % 4 === 0) this.kick(t);
    if (step === 4 || step === 12) this.clap(t);
    if (step % 2 === 0) this.hat(t, step === 14);
    if (step % 2 === 0) this.bass(t, step % 4 === 0 ? b.root : b.oct);
    if (step === 0) this.stab(t, b.stab);
  }

  kick(t: number) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.11);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.18);
  }

  hat(t: number, open: boolean) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7500;
    const g = this.ctx.createGain();
    const dur = open ? 0.13 : 0.035;
    g.gain.setValueAtTime(open ? 0.25 : 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  clap(t: number) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1600;
    bp.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    s.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    s.start(t);
    s.stop(t + 0.16);
  }

  bass(t: number, freq: number) {
    const o = this.ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 480;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.2);
  }

  stab(t: number, freqs: number[]) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + 0.22);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    lp.connect(g);
    g.connect(this.master);
    for (const f of freqs) {
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      const o2 = this.ctx.createOscillator();
      o2.type = "sawtooth";
      o2.detune.value = 8;
      o2.frequency.value = f;
      o.connect(lp);
      o2.connect(lp);
      o.start(t);
      o2.start(t);
      o.stop(t + 0.28);
      o2.stop(t + 0.28);
    }
  }
}

type Phase = "youtube" | "disco";

export function PartyMode({
  active,
  onClose,
}: {
  active: boolean;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eqRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("youtube");

  // confetti
  useEffect(() => {
    if (!active) return;
    const c = canvasRef.current;
    if (!c) return;
    const x = c.getContext("2d");
    if (!x) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const colors = [
      "#D6A367",
      "#E8B4A8",
      "#7C9A6E",
      "#5B7BA1",
      "#B8536F",
      "#FDEFD2",
      "#FFD23F",
      "#06D6A0",
    ];
    const bits = Array.from({ length: 480 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * -c.height,
      r: 5 + Math.random() * 10,
      vy: 2.5 + Math.random() * 5,
      vx: -3 + Math.random() * 6,
      col: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 6,
      vr: -0.3 + Math.random() * 0.6,
    }));
    let raf = 0;
    const draw = () => {
      x.clearRect(0, 0, c.width, c.height);
      for (const b of bits) {
        b.y += b.vy;
        b.x += b.vx;
        b.rot += b.vr;
        if (b.y > c.height + 12) {
          b.y = -12;
          b.x = Math.random() * c.width;
        }
        x.save();
        x.translate(b.x, b.y);
        x.rotate(b.rot);
        x.fillStyle = b.col;
        x.fillRect(-b.r / 2, -b.r / 2, b.r, b.r * 1.5);
        x.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [active]);

  // YouTube: try candidates in order, advance on error, fall back to disco.
  useEffect(() => {
    if (!active || phase !== "youtube") return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let player: any = null;
    let idx = 0;
    let watchdog: number | null = null;

    const fallToDisco = () => {
      if (cancelled) return;
      try {
        player?.destroy?.();
      } catch {
        /* noop */
      }
      setPhase("disco");
    };

    const tryNext = (YT: YTNamespace) => {
      if (cancelled) return;
      if (idx >= VIDEO_CANDIDATES.length) return fallToDisco();
      const id = VIDEO_CANDIDATES[idx];
      const host = document.getElementById("party-yt-host");
      if (!host) return;
      host.innerHTML = '<div id="party-yt"></div>';
      if (watchdog) clearTimeout(watchdog);
      // If neither onReady nor onError fires, the embed is silently stuck
      // (origin-blocked) — advance after a beat.
      watchdog = window.setTimeout(() => {
        idx++;
        tryNext(YT);
      }, 4500);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      player = new (YT.Player as any)("party-yt", {
        videoId: id,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e: { target: { playVideo: () => void } }) => {
            if (cancelled) return;
            if (watchdog) clearTimeout(watchdog);
            try {
              e.target.playVideo();
            } catch {
              /* noop */
            }
          },
          onError: () => {
            if (cancelled) return;
            if (watchdog) clearTimeout(watchdog);
            idx++;
            tryNext(YT);
          },
        },
      });
    };

    loadYouTubeAPI().then((YT) => {
      if (!cancelled) tryNext(YT);
    });

    return () => {
      cancelled = true;
      if (watchdog) clearTimeout(watchdog);
      try {
        player?.destroy?.();
      } catch {
        /* noop */
      }
    };
  }, [active, phase]);

  // disco fallback engine + audio-reactive equalizer
  useEffect(() => {
    if (!active || phase !== "disco") return;
    let raf = 0;
    let engine: DiscoEngine | null = null;
    try {
      engine = new DiscoEngine();
      engine.start();
    } catch (e) {
      console.error("[PartyMode] audio engine failed:", e);
    }

    const eq = eqRef.current;
    const ex = eq?.getContext("2d") ?? null;
    const bins = engine
      ? new Uint8Array(engine.analyser.frequencyBinCount)
      : null;
    const drawEq = () => {
      if (eq && ex && engine && bins) {
        engine.analyser.getByteFrequencyData(bins);
        ex.clearRect(0, 0, eq.width, eq.height);
        const n = 32;
        const bw = eq.width / n;
        for (let i = 0; i < n; i++) {
          const v = bins[i] / 255;
          const h = Math.max(2, v * eq.height);
          const hue = ((i / n) * 300 + Date.now() / 20) % 360;
          ex.fillStyle = `hsl(${hue},85%,${40 + v * 25}%)`;
          ex.fillRect(i * bw + 1, eq.height - h, bw - 2, h);
        }
      }
      raf = requestAnimationFrame(drawEq);
    };
    drawEq();

    return () => {
      cancelAnimationFrame(raf);
      engine?.stop();
    };
  }, [active, phase]);

  // reset to youtube-first whenever a fresh party starts
  useEffect(() => {
    if (active) setPhase("youtube");
  }, [active]);

  if (!active) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes partyhue { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
        @keyframes partypulse { from{opacity:.3} to{opacity:.9} }
        @keyframes ballspin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes marquee { from{transform:translateX(100%)} to{transform:translateX(-100%)} }
        .party-strobe {
          position:absolute; inset:0; mix-blend-mode:screen;
          background:
            radial-gradient(circle at 15% 25%, rgba(214,163,103,.6), transparent 40%),
            radial-gradient(circle at 85% 60%, rgba(184,83,111,.6), transparent 40%),
            radial-gradient(circle at 50% 88%, rgba(91,123,161,.6), transparent 40%),
            radial-gradient(circle at 70% 15%, rgba(124,154,110,.55), transparent 38%),
            radial-gradient(circle at 30% 70%, rgba(255,210,63,.5), transparent 38%);
          animation: partyhue 3s linear infinite, partypulse .45s ease-in-out infinite alternate;
        }
        .yt-logo { font-family: Arial, sans-serif; font-weight:bold; font-size:22px; }
        .yt-logo b { background:#cc181e; color:#fff; padding:1px 6px; border-radius:5px; }
      `}</style>
      <div className="party-strobe" />
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      <div
        style={{
          position: "absolute",
          top: 18,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: '"Iowan Old Style",Palatino,Georgia,serif',
          fontSize: 56,
          fontWeight: 600,
          color: "#FDEFD2",
          textShadow: "0 2px 26px rgba(214,163,103,.95)",
        }}
      >
        ✨ PARTY MODE ✨
      </div>

      {/* cheesy old-2009-YouTube player */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 600,
          background: "#f9f9f9",
          border: "1px solid #ccc",
          borderRadius: 4,
          boxShadow: "0 20px 60px rgba(0,0,0,.6)",
          pointerEvents: "auto",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderBottom: "1px solid #e3e3e3",
            background: "#fff",
          }}
        >
          <span className="yt-logo">
            You<b>Tube</b>
          </span>
          <div
            style={{
              flex: 1,
              border: "1px solid #ccc",
              borderRadius: 2,
              padding: "3px 6px",
              color: "#999",
              fontSize: 12,
              background: "#fff",
            }}
          >
            aint no stoppin us now
          </div>
          <span style={{ fontSize: 11, color: "#2793e6" }}>Sign In</span>
        </div>

        {/* player surface: real YouTube while phase==youtube, disco viz on fallback */}
        <div
          style={{
            background:
              phase === "disco"
                ? "radial-gradient(circle at 50% 22%, #2a2640, #0b0a14 70%)"
                : "#000",
            aspectRatio: "16/9",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {phase === "youtube" ? (
            <div
              id="party-yt-host"
              style={{ position: "absolute", inset: 0 }}
            />
          ) : (
            <>
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 40,
                  animation: "ballspin 4s linear infinite",
                  filter: "drop-shadow(0 0 14px rgba(255,210,63,.8))",
                }}
              >
                🪩
              </div>
              <canvas
                ref={eqRef}
                width={560}
                height={150}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  height: "62%",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 6,
                  left: 0,
                  right: 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    color: "#FFD23F",
                    fontFamily: "ui-monospace,monospace",
                    fontSize: 12,
                    letterSpacing: ".15em",
                    animation: "marquee 9s linear infinite",
                  }}
                >
                  ♪ NOW PLAYING — MARVIS DISCO ENGINE · embed blocked, so we
                  brought our own band · live 118 BPM ♪
                </span>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "8px 12px", color: "#333" }}>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1a1a" }}>
            Ain&apos;t No Stoppin&apos; Us Now (1979) [HQ] 🕺
          </div>
          <div style={{ fontSize: 11, color: "#666", margin: "3px 0 8px" }}>
            👁 2,153,089 views · ★★★★★ · Uploaded May 20, 2009 by{" "}
            <span style={{ color: "#2793e6" }}>MarvisDiscoVEVO</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 12,
              color: "#555",
              borderTop: "1px solid #eee",
              paddingTop: 8,
            }}
          >
            <span>👍 12,043</span>
            <span>👎 87</span>
            <span>💬 Comments (411)</span>
            <span>⤴ Share</span>
            <span
              style={{
                marginLeft: "auto",
                background: "#cc181e",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: 2,
                fontWeight: "bold",
              }}
            >
              Subscribe
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        style={{
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "auto",
          background: "#13110D",
          border: "1px solid #D6A367",
          color: "#D6A367",
          borderRadius: 8,
          padding: "10px 24px",
          cursor: "pointer",
          fontFamily: "ui-monospace,monospace",
          fontSize: 12,
          letterSpacing: ".08em",
          textTransform: "uppercase",
        }}
      >
        end party
      </button>
    </div>
  );
}
