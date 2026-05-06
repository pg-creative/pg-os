"use client";

import { useState } from "react";

/**
 * Evening Ceremony Lab — 3 aesthetic variants of the 21:00 bookend ritual.
 *
 * EV1 LANTERN GLOW       Ghibli twilight, glowing lanterns, golden hour warmth
 * EV2 RPG STATUS PANEL   JRPG end-of-day stats, jewel tones, hex accents
 * EV3 INK SCROLL         Falsifier — calligraphy paper + single brushstroke
 *
 * Each variant renders Step 0 (Day in Review) at full-screen size. PG picks
 * one and we apply it to the real /evening flow + fix the hydration bug.
 */

type VariantId = "ev1" | "ev2" | "ev3";
const ID_ORDER: VariantId[] = ["ev1", "ev2", "ev3"];
const VARIANTS: Record<VariantId, { name: string; tagline: string; tradeoffs: string }> = {
  ev1: {
    name: "Lantern Glow",
    tagline: "Ghibli twilight · floating lanterns · cream warmth",
    tradeoffs:
      "Fully on-DNA — Ghibli warmth + golden hour + cream parchment. The 6 ceremony steps are 6 lanterns being lit in sequence, so progression has a tactile metaphor. Most permission-feel: 'you're closing the day, not closing a task.'",
  },
  ev2: {
    name: "RPG Status Panel",
    tagline: "JRPG end-screen · jewel tones · stat bars",
    tradeoffs:
      "JRPG end-of-mission energy. Day in Review = 'mission report' with the day's ships as quest entries. Jewel-tone accents (emerald + amber + ruby), hex-bordered tier badges. Best fit if you want the ceremony to feel like *progress*, not *settling*.",
  },
  ev3: {
    name: "Ink Scroll",
    tagline: "Falsifier · paper + single brushstroke · stillness",
    tradeoffs:
      "Anti-ceremony. Almost-bare paper texture, one brushstroke per step, single red seal at the close. Bets that the right register is FURTHER toward minimalism — that the pale-cream you hated wasn't wrong in *direction*, just wrong in *execution*. If this wins, the rebuild is 'less but better' not 'more Ghibli'.",
  },
};

export default function EveningLabPage() {
  const [active, setActive] = useState<VariantId>("ev1");
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070811",
        color: "#dfe9f3",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "24px 18px 60px",
      }}
    >
      <style>{`
        @keyframes ev-lantern-drift {
          0%, 100% { transform: translateY(0) rotate(-0.5deg); }
          50%      { transform: translateY(-4px) rotate(0.5deg); }
        }
        @keyframes ev-particle {
          0%   { transform: translateY(0); opacity: 0; }
          15%  { opacity: 0.8; }
          85%  { opacity: 0.6; }
          100% { transform: translateY(-220px); opacity: 0; }
        }
        @keyframes ev-glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 8px currentColor); }
          50%      { filter: drop-shadow(0 0 18px currentColor); }
        }
        @keyframes ev-stat-fill {
          from { width: 0; }
          to   { width: var(--ev-fill, 60%); }
        }
        @keyframes ev-ink-stroke {
          from { stroke-dashoffset: 280; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes ev-seal-stamp {
          0%   { transform: scale(2.4) rotate(-12deg); opacity: 0; }
          80%  { transform: scale(1.05) rotate(-3deg); opacity: 1; }
          100% { transform: scale(1) rotate(-3deg); opacity: 1; }
        }
      `}</style>

      <header style={{ maxWidth: 880, margin: "0 auto 24px" }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a4b4cf", marginBottom: 8 }}>
          // EVENING LAB · 21:00 BOOKEND
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 34, lineHeight: 1.15, margin: 0, color: "#f3e8d3" }}>
          How should the day end?
        </h1>
      </header>

      <div style={{ maxWidth: 880, margin: "0 auto 28px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {ID_ORDER.map((id) => {
          const v = VARIANTS[id];
          const sel = active === id;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              style={{
                background: sel ? "rgba(229,179,116,0.12)" : "rgba(255,255,255,0.03)",
                border: sel ? "1px solid rgba(229,179,116,0.7)" : "1px solid rgba(255,255,255,0.08)",
                color: sel ? "#f3e8d3" : "#a4b4cf",
                padding: "14px 12px",
                borderRadius: 12,
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: 18,
                fontWeight: 500,
                textAlign: "left",
                cursor: "pointer",
                transition: "all 200ms ease-out",
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "normal", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: sel ? "#e5b374" : "#7a8aa8", marginBottom: 4 }}>
                {id.toUpperCase()}
              </div>
              {v.name}
            </button>
          );
        })}
      </div>

      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        {active === "ev1" && <Lantern />}
        {active === "ev2" && <RPGPanel />}
        {active === "ev3" && <InkScroll />}
        <p style={{ marginTop: 18, fontSize: 14, lineHeight: 1.6, color: "#c4d0e2", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
          {VARIANTS[active].tradeoffs}
        </p>
      </section>
    </main>
  );
}

/* ─────────────────────── EV1 — LANTERN GLOW ──────────────────────────── */
function Lantern() {
  return (
    <div
      style={{
        position: "relative",
        background:
          "radial-gradient(60% 60% at 50% 30%, rgba(255,170,90,0.10) 0%, transparent 70%)," +
          "linear-gradient(180deg, #1a2240 0%, #0c1228 65%, #050813 100%)",
        borderRadius: 20,
        minHeight: 720,
        padding: "44px 28px 52px",
        overflow: "hidden",
        textAlign: "center",
        color: "#f3e8d3",
        fontFamily: "'Cormorant Garamond', serif",
        boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)",
      }}
    >
      {/* Floating particles */}
      {[
        { left: "12%", delay: 0, dur: 9 },
        { left: "28%", delay: 2.4, dur: 11 },
        { left: "62%", delay: 1.2, dur: 8 },
        { left: "78%", delay: 4.5, dur: 12 },
        { left: "42%", delay: 6, dur: 10 },
      ].map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            bottom: 0,
            left: p.left,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "#fcd47a",
            boxShadow: "0 0 12px #fcd47a",
            animation: `ev-particle ${p.dur}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* 6 lanterns — first one lit */}
      <div style={{ display: "flex", justifyContent: "center", gap: 22, marginBottom: 36 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <LanternIcon key={i} lit={i === 0} delay={i * 0.3} />
        ))}
      </div>

      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e5b374", marginBottom: 14 }}>
        — DAY 125 · STEP ONE OF SIX —
      </p>

      <h1
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 46,
          lineHeight: 1.1,
          margin: "0 0 22px",
          color: "#f3e8d3",
        }}
      >
        The day in <span style={{ color: "#fcd47a" }}>review</span>.
      </h1>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
        {[
          "Shipped V1 Donkey Kong Construction to the Bridge",
          "Mobile touch hardening + pre-hydration palette fix",
          "Sent PG OS install link via Telegram",
        ].map((s, i) => (
          <li
            key={i}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(252, 212, 122, 0.05)",
              border: "1px solid rgba(252, 212, 122, 0.16)",
              fontSize: 16,
              lineHeight: 1.5,
              fontStyle: "italic",
              color: "#f3e8d3",
            }}
          >
            <span style={{ color: "#fcd47a", marginRight: 10 }}>✦</span>{s}
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button
          style={{
            background: "linear-gradient(180deg, #fcd47a 0%, #e5a85a 100%)",
            color: "#1a1208",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            padding: "14px 22px",
            border: "1px solid #c79248",
            borderRadius: 6,
            cursor: "pointer",
            minHeight: 48,
            boxShadow: "0 4px 14px -4px rgba(252,212,122,0.5)",
          }}
        >
          ✦ Light the next lantern
        </button>
      </div>
    </div>
  );
}

function LanternIcon({ lit, delay }: { lit: boolean; delay: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: 28,
        height: 38,
        animation: lit ? `ev-lantern-drift 4s ease-in-out infinite` : "none",
        animationDelay: `${delay}s`,
        opacity: lit ? 1 : 0.25,
        color: "#fcd47a",
      }}
    >
      {/* String */}
      <div style={{ position: "absolute", top: 0, left: "50%", width: 1, height: 8, background: "currentColor", transform: "translateX(-50%)" }} />
      {/* Body */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 0,
          right: 0,
          height: 22,
          background: lit ? "radial-gradient(circle at 50% 50%, #fff5d4 0%, #fcd47a 50%, #c79248 100%)" : "#3a4561",
          borderRadius: "50% 50% 35% 35%",
          border: "1px solid currentColor",
          animation: lit ? `ev-glow-pulse 3s ease-in-out infinite` : "none",
        }}
      />
      {/* Tassel */}
      <div style={{ position: "absolute", bottom: 0, left: "50%", width: 4, height: 6, background: "currentColor", transform: "translateX(-50%)", borderRadius: "0 0 4px 4px" }} />
    </div>
  );
}

/* ─────────────────────── EV2 — RPG STATUS PANEL ──────────────────────── */
function RPGPanel() {
  return (
    <div
      style={{
        position: "relative",
        background: "linear-gradient(135deg, #0e1428 0%, #1a2042 100%)",
        borderRadius: 16,
        minHeight: 720,
        padding: "32px 26px 36px",
        color: "#dfe9f3",
        fontFamily: "'Cormorant Garamond', serif",
        boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)",
        border: "1px solid rgba(229, 179, 116, 0.2)",
      }}
    >
      {/* Hex background pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='35' viewBox='0 0 40 35'><polygon points='20,2 38,12 38,28 20,38 2,28 2,12' fill='none' stroke='%23e5b374' stroke-width='0.5'/></svg>\")",
          pointerEvents: "none",
        }}
      />

      {/* Top bar — quest name + day */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}>
        <span style={{ color: "#5cb37a" }}>▰ MISSION REPORT</span>
        <span style={{ color: "#a4b4cf" }}>DAY 125</span>
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 38,
          lineHeight: 1.05,
          margin: "0 0 4px",
          color: "#f3e8d3",
        }}
      >
        The day&rsquo;s ledger.
      </h1>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "#e5b374", margin: "0 0 26px" }}>
        ▸ STAGE 1 OF 6 · DAY IN REVIEW
      </p>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
        <Stat label="SHIPS" value="3" color="#5cb37a" fill={75} />
        <Stat label="STREAK" value="0" color="#e5b374" fill={0} />
        <Stat label="VEL" value="0.5" color="#9b6fc2" fill={45} />
      </div>

      {/* Tier hex badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: "rgba(229,179,116,0.06)", border: "1px solid rgba(229,179,116,0.3)", borderRadius: 10, marginBottom: 22 }}>
        <div style={{ position: "relative", width: 56, height: 60, color: "#e5b374" }}>
          <svg viewBox="0 0 60 64" width="56" height="60" style={{ filter: "drop-shadow(0 0 14px currentColor)" }}>
            <polygon points="30,3 56,18 56,46 30,61 4,46 4,18" fill="rgba(229,179,116,0.12)" stroke="currentColor" strokeWidth="2" />
            <text x="30" y="42" textAnchor="middle" fontFamily="Cormorant Garamond" fontStyle="italic" fontSize="28" fontWeight="500" fill="currentColor">F</text>
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.16em", color: "#7a8aa8" }}>TIER FLOOR</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 22, color: "#f3e8d3", marginTop: 2 }}>
            <span style={{ color: "#e5b374" }}>F</span> &middot; <span style={{ fontSize: 16, color: "#a4b4cf" }}>25 XP earned</span>
          </div>
        </div>
      </div>

      {/* Quest log entries */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "#7a8aa8", margin: "0 0 12px" }}>
          QUEST LOG · TODAY
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { tag: "FEAT", text: "Donkey Kong Construction shipped to Bridge", color: "#5cb37a" },
            { tag: "FIX", text: "Mobile touch hardening + SSR palette fix", color: "#9b6fc2" },
            { tag: "SEND", text: "PG OS install link via Telegram", color: "#e5b374" },
          ].map((q, i) => (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderLeft: `3px solid ${q.color}`, borderRadius: 4 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.12em", color: q.color, minWidth: 38 }}>{q.tag}</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: "#f3e8d3" }}>{q.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        style={{
          width: "100%",
          background: "linear-gradient(180deg, #2c4a8a 0%, #1d3464 100%)",
          color: "#f3e8d3",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "16px",
          border: "1px solid #4f78c2",
          borderRadius: 6,
          cursor: "pointer",
          minHeight: 48,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 14px -4px rgba(79,120,194,0.4)",
        }}
      >
        ▸ NEXT STAGE — TIER CHECK
      </button>
    </div>
  );
}

function Stat({ label, value, color, fill }: { label: string; value: string; color: string; fill: number }) {
  return (
    <div style={{ padding: "12px 12px", background: "rgba(255,255,255,0.03)", border: `1px solid ${color}30`, borderRadius: 6 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.16em", color: "#7a8aa8" }}>{label}</div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 24, color, lineHeight: 1, margin: "4px 0 6px" }}>{value}</div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            background: color,
            // @ts-expect-error custom CSS prop
            "--ev-fill": `${fill}%`,
            animation: "ev-stat-fill 1s ease-out 0.2s both",
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────── EV3 — INK SCROLL (FALSIFIER) ────────────────── */
function InkScroll() {
  return (
    <div
      style={{
        position: "relative",
        background:
          "radial-gradient(120% 80% at 50% 30%, #f6efde 0%, #ead8b3 75%, #d8c08c 100%)",
        borderRadius: 4,
        minHeight: 720,
        padding: "70px 40px 60px",
        color: "#1a120a",
        fontFamily: "'Cormorant Garamond', serif",
        boxShadow:
          "0 24px 60px -20px rgba(0,0,0,0.5)," +
          "inset 0 0 60px rgba(180, 140, 80, 0.18)",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Paper texture noise (CSS-generated) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          mixBlendMode: "multiply",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0.18 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          pointerEvents: "none",
        }}
      />

      {/* Step indicator — kanji-style */}
      <div style={{ position: "absolute", top: 24, left: 0, right: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.3em", color: "#7a5a30" }}>
        — ONE OF SIX —
      </div>

      {/* Brushstroke SVG */}
      <svg viewBox="0 0 280 60" width="100%" height="60" style={{ marginBottom: 18, marginTop: 30, maxWidth: 280, display: "block", marginInline: "auto" }}>
        <path
          d="M 10 30 Q 60 12, 140 28 T 270 32"
          stroke="#1a120a"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="280"
          style={{ animation: "ev-ink-stroke 1.4s cubic-bezier(0.4, 0, 0.6, 1) both" }}
        />
      </svg>

      <h1
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 44,
          lineHeight: 1.1,
          margin: "0 0 12px",
          color: "#1a120a",
        }}
      >
        The day in <span style={{ borderBottom: "2px solid #b54a32", paddingBottom: 2 }}>review</span>.
      </h1>

      <p style={{ fontSize: 18, lineHeight: 1.7, fontStyle: "italic", color: "#3a2818", margin: "0 auto 36px", maxWidth: 380 }}>
        Three things, set down before sleep.
      </p>

      <ol style={{ listStyle: "none", padding: 0, margin: "0 0 50px", display: "flex", flexDirection: "column", gap: 18, textAlign: "left", maxWidth: 380, marginInline: "auto" }}>
        {[
          "Donkey Kong Construction shipped to the Bridge.",
          "Mobile touch hardening, palette stops flashing.",
          "PG OS lives on PG's iPhone Home Screen.",
        ].map((s, i) => (
          <li key={i} style={{ display: "flex", gap: 14, fontSize: 18, lineHeight: 1.5, color: "#3a2818", fontStyle: "italic" }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: "#b54a32", fontSize: 22, fontWeight: 500, lineHeight: 1.1, minWidth: 18 }}>
              {["一", "二", "三"][i]}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>

      {/* Red seal */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          right: 40,
          width: 56,
          height: 56,
          background: "#b54a32",
          color: "#f6efde",
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
          fontSize: 14,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          textAlign: "center",
          lineHeight: 1.1,
          transform: "rotate(-3deg)",
          animation: "ev-seal-stamp 800ms cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s both",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        PG<br/>OS
      </div>

      <button
        style={{
          background: "transparent",
          color: "#1a120a",
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
          fontSize: 18,
          padding: "10px 18px",
          border: "1px solid #1a120a",
          borderRadius: 2,
          cursor: "pointer",
          minHeight: 44,
          letterSpacing: "0.03em",
        }}
      >
        — continue —
      </button>
    </div>
  );
}
