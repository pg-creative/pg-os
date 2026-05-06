"use client";

import { useEffect, useState } from "react";

/**
 * Arcade Pomodoro Lab — three live variants of a retro-arcade Pomodoro
 * widget for the Bridge status rail. PG picks one, it replaces BrickBuilder.
 *
 * V1 DONKEY KONG       NES Mario-with-hammer, brick stack grows below
 * V2 TETRIS TOWER      Game Boy DMG palette, falling bricks lock into a stack
 * V3 ARCADE ATTRACT    Falsifier — no character, just a 7-seg LED + INSERT COIN
 */

type VariantId = "v1" | "v2" | "v3";
const ID_ORDER: VariantId[] = ["v1", "v2", "v3"];

const VARIANTS: Record<VariantId, { name: string; tagline: string; tradeoffs: string }> = {
  v1: {
    name: "Donkey Kong Construction",
    tagline: "NES · Mario w/ hammer · brick stack",
    tradeoffs:
      "Most character. The hammer-and-lay walk cycle is the marquee animation. NES palette feels deliberately playful — least 'productive grown-up app', most 'arcade you fed quarters into'.",
  },
  v2: {
    name: "Tetris Tower",
    tagline: "Game Boy DMG · falling bricks · chibi base",
    tradeoffs:
      "Most mechanically satisfying. Each pomodoro = a brick falls and locks. The 4-shade green is restful for long focus sessions. Quieter than V1 but still feels like a game.",
  },
  v3: {
    name: "Arcade Attract Mode",
    tagline: "Falsifier · 7-seg LED · INSERT COIN",
    tradeoffs:
      "Anti-character. Bets that focus needs FEWER stimuli, not more. Reads as a Galaga cabinet between players — high-arousal urgency aesthetics turned into ambient calm. If this wins, it means you don't actually want a dancing guy, you want the cabinet itself.",
  },
};

export default function PomodoroLabPage() {
  const [active, setActive] = useState<VariantId>("v1");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#dfe9f3",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "24px 18px 80px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&family=Silkscreen:wght@400;700&display=swap');
        @keyframes lab-scanlines {
          0% { background-position-y: 0; }
          100% { background-position-y: 4px; }
        }
        @keyframes lab-blink { 50% { opacity: 0.2; } }
        @keyframes lab-mario-walk {
          0%   { transform: translateY(0) rotate(0deg); }
          25%  { transform: translateY(-2px) rotate(0deg); }
          50%  { transform: translateY(0) rotate(0deg); }
          75%  { transform: translateY(-1px) rotate(0deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes lab-hammer {
          0%, 70% { transform: rotate(0deg); }
          80%     { transform: rotate(-65deg); }
          100%    { transform: rotate(0deg); }
        }
        @keyframes lab-brick-place {
          from { transform: translateY(-30px) scale(1.1); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes lab-tetris-fall {
          0%   { transform: translateY(-110px); opacity: 0.9; }
          85%  { transform: translateY(0); opacity: 1; }
          90%  { transform: translateY(-3px); }
          100% { transform: translateY(0); }
        }
        @keyframes lab-chibi-idle {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-2px); }
        }
        @keyframes lab-led-glow {
          0%, 100% { text-shadow: 0 0 6px currentColor, 0 0 14px currentColor; }
          50%      { text-shadow: 0 0 4px currentColor, 0 0 8px currentColor; }
        }
        @keyframes lab-marquee {
          from { background-position-x: 0; }
          to   { background-position-x: 24px; }
        }
        .lab-scanlines {
          position: absolute; inset: 0; pointer-events: none;
          background: repeating-linear-gradient(0deg,
            rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px,
            transparent 1px, transparent 3px);
          animation: lab-scanlines 8s linear infinite;
          mix-blend-mode: multiply;
        }
        .lab-crt-frame {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          box-shadow:
            inset 0 0 28px rgba(0,0,0,0.55),
            0 12px 40px -10px rgba(0,0,0,0.65);
        }
        .pixel-rendered { image-rendering: pixelated; image-rendering: -moz-crisp-edges; }
      `}</style>

      <header style={{ maxWidth: 880, margin: "0 auto 28px" }}>
        <p
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#e5b374",
            marginBottom: 12,
          }}
        >
          // POMODORO LAB · ARCADE
        </p>
        <h1
          style={{
            fontFamily: "'Press Start 2P', 'VT323', monospace",
            fontSize: 22,
            lineHeight: 1.4,
            margin: 0,
            color: "#f3e8d3",
            letterSpacing: "0.04em",
          }}
        >
          PICK YOUR ARCADE.
        </h1>
        <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.55, color: "#c4d0e2", maxWidth: 600 }}>
          Tap a variant. The widget below renders at roughly the size it&rsquo;ll
          live in the Bridge status rail (~320×320). Each variant has its own
          dancing-guy / brick-laying / arcade vibe.
        </p>
      </header>

      {/* Variant selector */}
      <div
        style={{
          maxWidth: 880,
          margin: "0 auto 32px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        {ID_ORDER.map((id) => {
          const v = VARIANTS[id];
          const selected = active === id;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              style={{
                background: selected ? "rgba(255, 220, 160, 0.12)" : "rgba(255,255,255,0.03)",
                border: selected
                  ? "1px solid rgba(229, 179, 116, 0.7)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: selected ? "#f3e8d3" : "#a4b4cf",
                padding: "14px 12px",
                borderRadius: 12,
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 9,
                lineHeight: 1.5,
                textAlign: "left",
                cursor: "pointer",
                transition: "all 200ms ease-out",
              }}
            >
              <div style={{ color: selected ? "#e5b374" : "#7a8aa8", marginBottom: 6 }}>
                {id.toUpperCase()}
              </div>
              {v.name}
            </button>
          );
        })}
      </div>

      {/* Hero — selected variant in Bridge-widget-sized frame */}
      <section
        style={{
          maxWidth: 880,
          margin: "0 auto 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        {active === "v1" && <VariantDonkeyKong />}
        {active === "v2" && <VariantTetris />}
        {active === "v3" && <VariantAttract />}

        <div style={{ textAlign: "center", maxWidth: 560 }}>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: "#f3e8d3", margin: 0 }}>
            {VARIANTS[active].name}
          </h2>
          <p style={{ fontFamily: "'VT323', monospace", fontSize: 18, color: "#e5b374", margin: "6px 0 14px", letterSpacing: "0.04em" }}>
            {VARIANTS[active].tagline}
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#c4d0e2", margin: 0 }}>
            {VARIANTS[active].tradeoffs}
          </p>
        </div>
      </section>

      {/* Side-by-side grid for direct comparison */}
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h3
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#a4b4cf",
            marginBottom: 16,
            fontWeight: 400,
          }}
        >
          // ALL THREE · ACTUAL WIDGET SIZE
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22, justifyItems: "center" }}>
          <div onClick={() => setActive("v1")} style={{ cursor: "pointer" }}><VariantDonkeyKong small /></div>
          <div onClick={() => setActive("v2")} style={{ cursor: "pointer" }}><VariantTetris small /></div>
          <div onClick={() => setActive("v3")} style={{ cursor: "pointer" }}><VariantAttract small /></div>
        </div>
      </section>
    </main>
  );
}

/* ─────────────────────────── V1 — DONKEY KONG ────────────────────────── */

function VariantDonkeyKong({ small = false }: { small?: boolean }) {
  const w = small ? 320 : 380;
  const h = small ? 320 : 380;
  return (
    <div
      className="lab-crt-frame"
      style={{
        width: w,
        height: h,
        background: "linear-gradient(180deg, #5C94FC 0%, #5C94FC 55%, #2a2440 55%, #16101e 100%)",
        fontFamily: "'Press Start 2P', monospace",
        color: "#fff",
        position: "relative",
      }}
    >
      {/* Sky particles (NES stars) */}
      <Star x={40} y={50} />
      <Star x={220} y={28} />
      <Star x={290} y={70} />
      <Star x={140} y={92} />

      {/* Header — game title bar */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 12,
          right: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 9,
          letterSpacing: "0.08em",
        }}
      >
        <span style={{ color: "#fcd400" }}>1UP</span>
        <span style={{ color: "#fff" }}>WORK</span>
        <span style={{ color: "#e5375f" }}>HI 247</span>
      </div>

      {/* Timer countdown */}
      <div
        style={{
          position: "absolute",
          top: 38,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 38,
          color: "#fcd400",
          textShadow: "0 0 0 currentColor, 4px 4px 0 #000",
          letterSpacing: "0.08em",
        }}
      >
        24:35
      </div>

      {/* Girders + Mario + bricks scene */}
      <div style={{ position: "absolute", top: 145, left: 0, right: 0, bottom: 38 }}>
        {/* Steel girder */}
        <div
          style={{
            position: "absolute",
            top: 110,
            left: 0,
            right: 0,
            height: 14,
            background: "repeating-linear-gradient(90deg, #d23232 0 14px, #fff 14px 16px, #d23232 16px 30px)",
            borderTop: "2px solid #fff",
            borderBottom: "2px solid #000",
          }}
        />
        {/* Brick stack — left side */}
        <div style={{ position: "absolute", bottom: 0, left: 16, display: "flex", flexDirection: "column-reverse", gap: 0 }}>
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} style={{ display: "flex", gap: 0 }}>
              {Array.from({ length: 4 }).map((_, c) => (
                <Brick key={c} delay={row * 0.4 + c * 0.1} />
              ))}
            </div>
          ))}
        </div>

        {/* Mario character */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: "55%",
            transform: "translateX(-50%)",
            animation: "lab-mario-walk 700ms steps(4) infinite",
          }}
        >
          <Mario />
        </div>
      </div>

      {/* Footer status bar */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 12,
          right: 12,
          fontSize: 8,
          color: "#9bbc0f",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>BRICKS: 23</span>
        <span style={{ color: "#fcd400" }}>STAGE 1</span>
        <span>★ ★ ★</span>
      </div>

      <div className="lab-scanlines" />
    </div>
  );
}

function Star({ x, y }: { x: number; y: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 6,
        height: 6,
        background: "#fff",
        boxShadow:
          "-3px 0 0 #fff, 3px 0 0 #fff, 0 -3px 0 #fff, 0 3px 0 #fff",
        opacity: 0.7,
      }}
    />
  );
}

function Brick({ delay = 0 }: { delay?: number }) {
  return (
    <div
      style={{
        width: 22,
        height: 12,
        background: "#d23232",
        border: "1px solid #6a1a1a",
        boxShadow: "inset -2px -2px 0 rgba(0,0,0,0.4), inset 2px 2px 0 rgba(255,255,255,0.18)",
        animation: `lab-brick-place 420ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both`,
      }}
    />
  );
}

function Mario() {
  // 16-color SVG sprite — chunky pixel Mario w/ hammer
  // Approx 32x40 px at 2x scale = 64x80 visible
  const px = 4;
  const draw = (grid: string[]) => {
    const out: React.ReactNode[] = [];
    grid.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const color = COLORS[ch];
        if (!color) return;
        out.push(
          <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={color} />,
        );
      });
    });
    return out;
  };

  // Color map: . = transparent, R = red, B = blue (overalls), F = flesh,
  // K = black outline, W = white (eye), Y = yellow buttons, H = hammer head, S = stick
  const COLORS: Record<string, string | undefined> = {
    ".": undefined,
    R: "#d23232",
    B: "#3050d0",
    F: "#fcb888",
    K: "#000000",
    W: "#ffffff",
    Y: "#fcd400",
    H: "#9b9b9b",
    S: "#a05a2c",
  };

  // 14 wide x 16 tall body sprite, hammer rendered separately so we can rotate it
  const body = [
    "....KKKKKK....",
    "...KRRRRRRK...",
    "...RRRRRRRR...",
    "..KFFKFFFK....",
    "..KFKFFKFK....",
    "..KFFFFFFFK...",
    "..KKFFFFFKK...",
    "....KKKKK.....",
    "..KKBBYBBKK...",
    ".KRRRBYBRRRK..",
    ".KRRRBBBRRRK..",
    ".KRRRRRRRRKK..",
    ".KKBBBKBBBK...",
    "..KKBBKBBK....",
    "...KKK.KKK....",
    "...KKK.KKK....",
  ];

  return (
    <svg width={14 * px} height={16 * px + 18} viewBox={`0 0 ${14 * px} ${16 * px + 18}`} style={{ overflow: "visible" }}>
      {/* Hammer — pivots from shoulder, animates */}
      <g
        style={{
          transformOrigin: `${4 * px}px ${9 * px}px`,
          animation: "lab-hammer 1100ms cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
      >
        <rect x={2 * px} y={1 * px} width={px} height={8 * px} fill={COLORS.S} stroke="#000" strokeWidth="1" />
        <rect x={0} y={0} width={5 * px} height={3 * px} fill={COLORS.H} stroke="#000" strokeWidth="1" />
      </g>
      {draw(body)}
    </svg>
  );
}

/* ─────────────────────────── V2 — TETRIS TOWER ───────────────────────── */

function VariantTetris({ small = false }: { small?: boolean }) {
  const w = small ? 320 : 380;
  const h = small ? 320 : 380;
  // Game Boy DMG palette
  const DARKEST = "#0F380F";
  const DARK = "#306230";
  const LIGHT = "#8BAC0F";
  const LIGHTEST = "#9BBC0F";
  return (
    <div
      className="lab-crt-frame"
      style={{
        width: w,
        height: h,
        background: LIGHTEST,
        fontFamily: "'VT323', monospace",
        color: DARKEST,
        position: "relative",
        border: `4px solid ${DARKEST}`,
      }}
    >
      {/* Game Boy header */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 26,
          background: DARK,
          color: LIGHTEST,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          fontFamily: "'Silkscreen', monospace",
          fontSize: 11,
          letterSpacing: "0.1em",
        }}
      >
        <span>POMO.GB</span>
        <span>SCORE 0023</span>
      </div>

      {/* Timer LCD */}
      <div
        style={{
          position: "absolute",
          top: 38,
          left: 16,
          right: 16,
          padding: 8,
          background: LIGHT,
          border: `2px solid ${DARKEST}`,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 11, color: DARKEST, fontFamily: "'Silkscreen', monospace", letterSpacing: "0.1em" }}>
          TIME LEFT
        </div>
        <div
          style={{
            fontSize: 36,
            color: DARKEST,
            fontFamily: "'VT323', monospace",
            letterSpacing: "0.06em",
            lineHeight: 1,
            marginTop: 4,
          }}
        >
          24:35
        </div>
      </div>

      {/* Tetris well */}
      <div
        style={{
          position: "absolute",
          top: 116,
          left: "50%",
          transform: "translateX(-50%)",
          width: 110,
          height: 150,
          background: LIGHT,
          border: `2px solid ${DARKEST}`,
          overflow: "hidden",
        }}
      >
        {/* Falling brick — animated */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 28,
            width: 54,
            height: 18,
            background: DARK,
            border: `2px solid ${DARKEST}`,
            animation: "lab-tetris-fall 2.2s cubic-bezier(0.55, 0, 0.4, 1) infinite",
          }}
        />
        {/* Locked stack at bottom */}
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            style={{
              position: "absolute",
              bottom: row * 20 + 4,
              left: 4,
              right: 4,
              height: 18,
              background: row === 0 ? DARKEST : DARK,
              border: `1px solid ${DARKEST}`,
            }}
          />
        ))}
      </div>

      {/* Chibi at base */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          animation: "lab-chibi-idle 1.8s ease-in-out infinite",
        }}
      >
        <Chibi />
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 22,
          background: DARK,
          color: LIGHTEST,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          fontFamily: "'Silkscreen', monospace",
          fontSize: 10,
          letterSpacing: "0.1em",
        }}
      >
        <span>LV.1</span>
        <span>♥ ♥ ♥</span>
        <span>NEXT▾</span>
      </div>

      <div className="lab-scanlines" />
    </div>
  );
}

function Chibi() {
  const px = 4;
  const COLORS: Record<string, string | undefined> = {
    ".": undefined,
    K: "#0F380F",
    F: "#9BBC0F",
    M: "#306230",
  };
  const draw = (grid: string[]) => {
    const out: React.ReactNode[] = [];
    grid.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const color = COLORS[ch];
        if (!color) return;
        out.push(<rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={color} />);
      });
    });
    return out;
  };
  const body = [
    "..KKK..",
    ".KFFFK.",
    ".KFKFK.",
    ".KFFFK.",
    "..KKK..",
    ".KMMMK.",
    "KMMMMMK",
    "KMMMMMK",
    ".KMMMK.",
    "..K.K..",
  ];
  return (
    <svg width={7 * px} height={10 * px} viewBox={`0 0 ${7 * px} ${10 * px}`}>
      {draw(body)}
    </svg>
  );
}

/* ─────────────────────────── V3 — ARCADE ATTRACT ─────────────────────── */

function VariantAttract({ small = false }: { small?: boolean }) {
  const w = small ? 320 : 380;
  const h = small ? 320 : 380;

  return (
    <div
      className="lab-crt-frame"
      style={{
        width: w,
        height: h,
        background: "#000",
        fontFamily: "'VT323', monospace",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* CRT vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* Top marquee */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 10,
          color: "#ff2d6f",
          letterSpacing: "0.16em",
          animation: "lab-led-glow 1.4s ease-in-out infinite",
          textShadow: "0 0 8px #ff2d6f",
        }}
      >
        ★ POMO ARCADE ★
      </div>

      {/* 7-segment LED countdown */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "'VT323', monospace",
          fontSize: 84,
          color: "#00ffd4",
          letterSpacing: "0.12em",
          lineHeight: 1,
          animation: "lab-led-glow 1.6s ease-in-out infinite",
          textShadow: "0 0 12px #00ffd4, 0 0 28px #00ffd4",
        }}
      >
        24:35
      </div>

      <div
        style={{
          position: "absolute",
          top: 166,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "'VT323', monospace",
          fontSize: 18,
          color: "#fcd400",
          letterSpacing: "0.16em",
        }}
      >
        - WORK CYCLE -
      </div>

      {/* Insert coin blink */}
      <div
        style={{
          position: "absolute",
          bottom: 88,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 11,
          color: "#fff",
          letterSpacing: "0.16em",
          animation: "lab-blink 1s steps(2) infinite",
        }}
      >
        INSERT COIN
      </div>

      {/* Score panel */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 0,
          right: 0,
          padding: "0 16px",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          color: "#fff",
          letterSpacing: "0.12em",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <div>
          <div style={{ color: "#9aa8c0" }}>SCORE</div>
          <div style={{ color: "#00ffd4", fontSize: 14, marginTop: 4 }}>002300</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#9aa8c0" }}>HI-SCORE</div>
          <div style={{ color: "#fcd400", fontSize: 14, marginTop: 4 }}>024700</div>
        </div>
      </div>

      <div className="lab-scanlines" />
    </div>
  );
}
