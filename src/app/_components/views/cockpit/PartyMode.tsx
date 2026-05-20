"use client";

/**
 * PartyMode — "initialize party mode" 🎉. Heavy confetti + strobing lights +
 * the disco song playing FLAWLESSLY from a locally-hosted audio file.
 *
 * Why a local <audio> file and not a YouTube embed: embeds depend on each
 * uploader granting embed permission (the official audio has it OFF → "Video
 * unavailable"), plus autoplay/ad/buffering quirks. None of that is in our
 * control, so it can't be flawless. A native <audio> element playing a file we
 * host has no embed permission, no buffering, no ads — it just plays, offline,
 * instantly, every time. The audio is routed through a Web Audio AnalyserNode
 * so the equalizer reacts to the REAL track.
 *
 * Drop your own song at /public/audio/party.mp3 (or .m4a/.ogg/.wav) and it
 * plays automatically. Until then it plays the bundled house-band loop
 * (party-default.mp3). The bundled default is the only file we can ship — the
 * commercial recording is copyrighted, so PG supplies that himself.
 */

import { useEffect, useRef, useState } from "react";

// Tried in order; first that loads wins. The bundled default is always present.
const AUDIO_SOURCES = [
  "/audio/party.mp3",
  "/audio/party.m4a",
  "/audio/party.ogg",
  "/audio/party.wav",
  "/audio/party-default.mp3",
];

// The fox announces party mode, THEN the song starts (so he isn't drowned out).
const INTRO_LINE = "Initializing party mode. Hold onto something.";

// Random hype the fox drops over the song; the music ducks while he talks.
const HYPE_LINES = [
  "Woo!",
  "Oh yeah!",
  "Party mode! We love party mode!",
  "Foxy lady!",
  "Turn it up!",
  "This is my jam!",
  "Yip yip yip!",
  "Shake those tails!",
  "Ain't no stoppin' us now!",
  "Let's go!",
  "Disco fox in the house!",
  "Feel that groove!",
];

export function PartyMode({
  active,
  onClose,
  speak,
}: {
  active: boolean;
  onClose: () => void;
  speak?: (text: string) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eqRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // a MediaElementSource can be created only ONCE per element — keep refs.
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const srcNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [trackLabel, setTrackLabel] = useState("loading…");

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

  // audio playback (local file) + audio-reactive equalizer
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let disposed = false;

    // pick the first source that loads, walking the candidate list on error
    const audio = new Audio();
    audio.loop = true;
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audioRef.current = audio;
    let srcIdx = 0;

    const setLabel = (src: string) =>
      setTrackLabel(
        src.includes("party-default")
          ? "KITSU HOUSE BAND — drop /audio/party.mp3 to set your own"
          : "your track",
      );

    const tryLoad = () => {
      if (disposed || srcIdx >= AUDIO_SOURCES.length) return;
      audio.src = AUDIO_SOURCES[srcIdx];
      audio.load();
    };
    audio.addEventListener("error", () => {
      srcIdx++;
      if (srcIdx < AUDIO_SOURCES.length) tryLoad();
    });
    audio.addEventListener("canplay", () => {
      if (disposed) return;
      setLabel(AUDIO_SOURCES[srcIdx]);
    });

    // ── Choreography: the fox says the intro line FIRST, THEN the song starts,
    // then he drops hype lines over the track (music ducked so he's audible). ──
    let introDone = false;
    let hypeTimer: number | null = null;

    // Play the song element DIRECTLY (autoplay policy only — not routed through
    // Web Audio, so a suspended AudioContext can't mute it). Gated on the intro.
    const playSong = () => {
      if (!introDone) return;
      audio.play().catch(() => {
        /* autoplay blocked — a gesture (below) will start it on first interaction */
      });
    };

    // The equalizer analyser is attached lazily and ONLY once a gesture has the
    // context actually running — so attaching it (which reroutes the element)
    // can never silence the song.
    const attachAnalyser = async () => {
      if (srcNodeRef.current) return; // a source node can be made only once
      try {
        if (!ctxRef.current) {
          const AC =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          ctxRef.current = new AC();
        }
        const ctx = ctxRef.current;
        if (ctx.state === "suspended") await ctx.resume();
        if (ctx.state !== "running") return; // wait for a real gesture
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        const node = ctx.createMediaElementSource(audio);
        node.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;
        srcNodeRef.current = node;
      } catch (e) {
        console.error("[PartyMode] analyser attach failed:", e);
      }
    };

    // Drop a random hype line every 12–20s, ducking the music while he talks.
    const scheduleHype = () => {
      if (disposed || !speak) return;
      const say = speak; // capture so TS keeps the narrowing in the callback
      hypeTimer = window.setTimeout(
        async () => {
          if (disposed) return;
          const line =
            HYPE_LINES[Math.floor(Math.random() * HYPE_LINES.length)];
          const prevVol = audio.volume;
          audio.volume = 0.22; // duck so the fox cuts through
          try {
            await say(line);
          } catch {
            /* noop */
          }
          if (!disposed) audio.volume = prevVol || 1;
          scheduleHype();
        },
        12000 + Math.random() * 8000,
      );
    };

    // Fox announces party mode, THEN the song + hype loop kick in.
    const startParty = async () => {
      if (speak) {
        try {
          await speak(INTRO_LINE);
        } catch {
          /* noop */
        }
      }
      introDone = true;
      if (disposed) return;
      playSong();
      scheduleHype();
    };

    const onGesture = () => {
      playSong();
      attachAnalyser();
    };
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    audio.addEventListener("canplay", () => {
      if (introDone) playSong();
    });

    tryLoad();
    attachAnalyser(); // best-effort viz within the trigger's activation window
    startParty(); // speak intro → start song → hype loop

    // equalizer draw loop
    const eq = eqRef.current;
    const ex = eq?.getContext("2d") ?? null;
    let bins: Uint8Array | null = null;
    const drawEq = () => {
      const analyser = analyserRef.current;
      if (eq && ex && analyser) {
        if (!bins || bins.length !== analyser.frequencyBinCount)
          bins = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(bins);
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
      disposed = true;
      cancelAnimationFrame(raf);
      if (hypeTimer) clearTimeout(hypeTimer);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      try {
        audio.pause();
        audio.src = "";
      } catch {
        /* noop */
      }
      // Note: we intentionally do NOT close the AudioContext or disconnect the
      // MediaElementSource — a source node can't be recreated for the same
      // element, and the element is discarded here anyway. Suspend to free the
      // device until the next party.
      try {
        ctxRef.current?.suspend();
      } catch {
        /* noop */
      }
      ctxRef.current = null;
      analyserRef.current = null;
      srcNodeRef.current = null;
      audioRef.current = null;
    };
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

      {/* cheesy old-2009-YouTube frame (audio plays from a local file) */}
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

        {/* player surface: disco ball + live equalizer reacting to the real audio */}
        <div
          style={{
            background:
              "radial-gradient(circle at 50% 22%, #2a2640, #0b0a14 70%)",
            aspectRatio: "16/9",
            position: "relative",
            overflow: "hidden",
          }}
        >
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
              ♪ NOW PLAYING — {trackLabel} ♪
            </span>
          </div>
        </div>

        <div style={{ padding: "8px 12px", color: "#333" }}>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1a1a" }}>
            Ain&apos;t No Stoppin&apos; Us Now (1979) [HQ] 🕺
          </div>
          <div style={{ fontSize: 11, color: "#666", margin: "3px 0 8px" }}>
            👁 2,153,089 views · ★★★★★ · Uploaded May 20, 2009 by{" "}
            <span style={{ color: "#2793e6" }}>KitsuDiscoVEVO</span>
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
