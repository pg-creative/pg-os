"use client";

import React from "react";

// ─────────────────────────────────────────────
//  Arm C — "Nioh kodama kitsune" (suits the fox)
//  Misty ink-forest night sky
//  Glass panels: rice-paper shoji over darkness
//  Drifting kodama orbs + foxfire embers in BG
//  Kintsugi-gold hairlines, foxfire amber accent
//  Faint Nioh hero image layered at ~8% opacity
// ─────────────────────────────────────────────

const SHOJI = {
  background: "rgba(32,28,24,0.74)",
  backdropFilter: "blur(16px) saturate(1.2)",
  WebkitBackdropFilter: "blur(16px) saturate(1.2)",
  border: "1px solid rgba(200,160,80,0.22)",
  borderRadius: 2 /* shoji panels have sharper corners */,
} as const;

const FOXFIRE = "#E8A040";
const KINTSUGI = "#C89040";
const FOXFIRE_GLOW = "#FF9030";
const TEXT_PRIMARY = "#F2EAD8";
const TEXT_DIM = "#A08870";
const TEXT_MUTED = "#60503C";
const KODAMA_GREEN = "#90D0A0";
const EMBER_RED = "#E06840";

/* Kodama — floating spirits */
const Kodama = ({ x, y, delay }: { x: number; y: number; delay: number }) => (
  <div
    style={{
      position: "absolute",
      left: `${x}%`,
      top: `${y}%`,
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${KODAMA_GREEN}CC 0%, ${KODAMA_GREEN}22 70%, transparent 100%)`,
      animation: `kodamaDrift ${5 + delay}s ease-in-out ${delay}s infinite`,
      pointerEvents: "none",
    }}
  />
);

/* Foxfire ember */
const Ember = ({ x, y, delay }: { x: number; y: number; delay: number }) => (
  <div
    style={{
      position: "absolute",
      left: `${x}%`,
      top: `${y}%`,
      width: 4,
      height: 4,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${FOXFIRE_GLOW} 0%, transparent 80%)`,
      animation: `emberRise ${4 + delay * 0.8}s ease-in-out ${delay * 0.6}s infinite`,
      pointerEvents: "none",
    }}
  />
);

const NavIconC = ({
  label,
  active,
  glyph,
}: {
  label: string;
  active?: boolean;
  glyph: string;
}) => (
  <div
    title={label}
    style={{
      width: 40,
      height: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 2,
      background: active ? "rgba(200,144,64,0.14)" : "transparent",
      border: active
        ? `1px solid rgba(200,144,64,0.4)`
        : "1px solid transparent",
      color: active ? KINTSUGI : TEXT_MUTED,
      fontSize: 16,
      cursor: "pointer",
      transition: "all 0.18s ease",
      fontFamily: "DM Sans, sans-serif",
    }}
  >
    {glyph}
  </div>
);

const StatusChipC = ({ status }: { status: "green" | "amber" | "red" }) => {
  const map = {
    green: { bg: "rgba(144,208,160,0.14)", color: KODAMA_GREEN, label: "live" },
    amber: { bg: "rgba(232,160,64,0.14)", color: FOXFIRE, label: "active" },
    red: { bg: "rgba(224,104,64,0.14)", color: EMBER_RED, label: "blocked" },
  };
  const s = map[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: 2,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: s.color,
          display: "inline-block",
        }}
      />
      {s.label}
    </span>
  );
};

const ProjectCardC = ({
  name,
  sub,
  ctx,
  tool,
  status,
  note,
}: {
  name: string;
  sub: string;
  ctx: string;
  tool: string;
  status: "green" | "amber" | "red";
  note?: string;
}) => (
  <div
    style={{
      ...SHOJI,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      animation: "panelInC 0.38s cubic-bezier(0.22,1,0.36,1) both",
      /* kintsugi crack-light on top edge */
      boxShadow: `inset 0 1px 0 rgba(200,160,80,0.3)`,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 700,
          fontSize: 15,
          color: TEXT_PRIMARY,
        }}
      >
        {name}
      </span>
      <StatusChipC status={status} />
    </div>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: 12,
          color: TEXT_DIM,
        }}
      >
        {sub}
      </span>
      <span style={{ color: TEXT_MUTED, fontSize: 12 }}>·</span>
      <span
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: 12,
          color: TEXT_DIM,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {ctx}
      </span>
    </div>
    <div
      style={{
        fontFamily: "DM Sans, sans-serif",
        fontSize: 11,
        color: TEXT_MUTED,
        background: "rgba(200,144,64,0.06)",
        border: "1px solid rgba(200,144,64,0.14)",
        borderRadius: 2,
        padding: "4px 10px",
        display: "inline-block",
      }}
    >
      {tool}
    </div>
    {note && (
      <div
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: 12,
          color: EMBER_RED,
          fontStyle: "italic",
        }}
      >
        ⚠ {note}
      </div>
    )}
  </div>
);

const ActivityRowC = ({
  time,
  label,
  diff,
}: {
  time: string;
  label: string;
  diff: string;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "8px 0",
      borderBottom: "1px solid rgba(200,144,64,0.1)",
    }}
  >
    <span
      style={{
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12,
        color: TEXT_MUTED,
        fontVariantNumeric: "tabular-nums",
        minWidth: 38,
      }}
    >
      {time}
    </span>
    <span
      style={{
        fontFamily: "DM Sans, sans-serif",
        fontSize: 13,
        color: TEXT_DIM,
        flex: 1,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontFamily: "DM Sans, sans-serif",
        fontSize: 11,
        color: KODAMA_GREEN,
        fontVariantNumeric: "tabular-nums",
        fontWeight: 600,
      }}
    >
      {diff}
    </span>
  </div>
);

export default function ObservatoryC() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,wght@1,300;1,400;1,500&display=swap');

        .obs-c-root * { box-sizing: border-box; }

        @keyframes panelInC {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kitsuFloatC {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes kodamaDrift {
          0%   { transform: translateY(0) scale(1); opacity: 0.5; }
          33%  { transform: translateY(-14px) scale(1.15); opacity: 0.9; }
          66%  { transform: translateY(-8px) scale(0.9); opacity: 0.6; }
          100% { transform: translateY(0) scale(1); opacity: 0.5; }
        }
        @keyframes emberRise {
          0%   { transform: translateY(0) scale(1); opacity: 0.8; }
          80%  { transform: translateY(-40px) scale(0.4); opacity: 0.1; }
          100% { transform: translateY(-44px) scale(0); opacity: 0; }
        }
        @keyframes mistPulse {
          0%, 100% { opacity: 0.06; }
          50%       { opacity: 0.12; }
        }
      `}</style>

      <div
        className="obs-c-root"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 1180,
          minHeight: 700,
          margin: "0 auto",
          borderRadius: 4,
          overflow: "hidden",
          fontFamily: "DM Sans, sans-serif",
          /* ink-forest night — deep charcoal with forest-green undertones */
          background:
            "radial-gradient(ellipse 100% 80% at 40% 60%, #141C14 0%, #0C1008 50%, #080808 100%)",
          display: "flex",
        }}
      >
        {/* Nioh hero image — very faint, left side */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/agent-office/pixel/marvis-kitsune.png"
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 60,
            bottom: 0,
            height: "70%",
            width: "auto",
            opacity: 0.04,
            filter: "grayscale(1) blur(2px)",
            pointerEvents: "none",
            zIndex: 1,
            objectFit: "contain",
            objectPosition: "bottom right",
          }}
        />

        {/* Misty ink wash layers */}
        {[
          { top: "20%", left: "10%", w: 300, h: 120 },
          { top: "50%", left: "40%", w: 400, h: 100 },
          { top: "70%", left: "5%", w: 250, h: 80 },
        ].map((m, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: m.top,
              left: m.left,
              width: m.w,
              height: m.h,
              background: "rgba(120,160,120,0.08)",
              filter: "blur(32px)",
              borderRadius: "50%",
              animation: `mistPulse ${7 + i * 1.3}s ease-in-out ${i * 1.5}s infinite`,
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Kodama orbs */}
        {[
          { x: 20, y: 15, delay: 0 },
          { x: 65, y: 8, delay: 1.2 },
          { x: 80, y: 40, delay: 0.6 },
          { x: 35, y: 55, delay: 2.1 },
          { x: 55, y: 25, delay: 1.7 },
          { x: 12, y: 70, delay: 0.9 },
        ].map((k, i) => (
          <Kodama key={i} x={k.x} y={k.y} delay={k.delay} />
        ))}

        {/* Foxfire embers */}
        {[
          { x: 40, y: 80, delay: 0 },
          { x: 58, y: 85, delay: 0.8 },
          { x: 30, y: 90, delay: 1.6 },
          { x: 70, y: 78, delay: 2.4 },
          { x: 50, y: 88, delay: 1.0 },
        ].map((e, i) => (
          <Ember key={i} x={e.x} y={e.y} delay={e.delay} />
        ))}

        {/* ── Left nav rail — shoji wood-frame feel ── */}
        <nav
          style={{
            width: 48,
            minHeight: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 20,
            paddingBottom: 20,
            gap: 8,
            borderRight: "1px solid rgba(200,160,80,0.18)",
            background: "rgba(8,10,8,0.65)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            flexShrink: 0,
            zIndex: 10,
            /* kintsugi hairline glow on the right border */
            boxShadow: "1px 0 0 rgba(200,160,80,0.08)",
          }}
        >
          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: 13,
              color: FOXFIRE,
              letterSpacing: "0.02em",
              marginBottom: 16,
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
              userSelect: "none",
              textShadow: `0 0 10px ${FOXFIRE_GLOW}55`,
            }}
          >
            PG OS
          </div>

          <NavIconC label="Home" active glyph="⌂" />
          <NavIconC label="Habits" glyph="◎" />
          <NavIconC label="Projects" glyph="⬡" />
          <NavIconC label="Flow" glyph="∿" />
          <NavIconC label="Claude" glyph="✦" />
        </nav>

        {/* ── Main canvas ── */}
        <main
          style={{
            flex: 1,
            padding: "32px 28px 100px 28px",
            overflowY: "auto",
            position: "relative",
            zIndex: 5,
          }}
        >
          {/* Hero */}
          <div
            style={{
              marginBottom: 32,
              animation: "panelInC 0.32s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: FOXFIRE,
                marginBottom: 8,
                textShadow: `0 0 8px ${FOXFIRE_GLOW}44`,
              }}
            >
              Late night · Kitsu is watching the fleet
            </p>
            <h1
              style={{
                fontFamily: "Fraunces, serif",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 36,
                lineHeight: 1.15,
                color: TEXT_PRIMARY,
                margin: "0 0 12px 0",
              }}
            >
              The observatory never sleeps.
            </h1>
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 14,
                lineHeight: 1.7,
                color: TEXT_DIM,
                maxWidth: 560,
                margin: 0,
              }}
            >
              Three sessions live, one waiting on your call. The night is quiet
              — a good time to ship the thing you keep circling.
            </p>
          </div>

          {/* Project cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <ProjectCardC
              name="personal-os"
              sub="cockpit · 2d"
              ctx="48% ctx"
              tool="mcp_claude-in-chrome__browser_batch"
              status="green"
            />
            <ProjectCardC
              name="metrasens"
              sub="signal-hub · 4d"
              ctx="—"
              tool="MRE bucket — UPGRADE or CURRENT?"
              status="red"
              note="UPGRADE or CURRENT?"
            />
          </div>

          {/* Activity stream */}
          <div
            style={{
              ...SHOJI,
              padding: "18px 20px",
              animation:
                "panelInC 0.44s cubic-bezier(0.22,1,0.36,1) 0.06s both",
              marginBottom: 24,
              boxShadow: `inset 0 1px 0 rgba(200,160,80,0.25)`,
            }}
          >
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: TEXT_MUTED,
                margin: "0 0 12px 0",
              }}
            >
              Recent activity
            </p>
            <ActivityRowC
              time="09:58"
              label="legibility foundation shipped"
              diff="+711 −0"
            />
            <ActivityRowC
              time="09:24"
              label="party mode — Kitsu sings first"
              diff="+180 −44"
            />
            <ActivityRowC
              time="08:51"
              label="fox head reframed"
              diff="+12 −9"
            />
          </div>

          {/* CTA */}
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "transparent",
              color: FOXFIRE,
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.06em",
              border: `1px solid rgba(200,144,64,0.4)`,
              borderRadius: 2,
              padding: "10px 20px",
              cursor: "pointer",
              animation: "panelInC 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both",
              boxShadow: `0 0 12px rgba(232,160,64,0.12), inset 0 1px 0 rgba(200,160,80,0.2)`,
              textTransform: "uppercase",
            }}
          >
            + New session →
          </button>
        </main>

        {/* ── Kitsu pod — foxfire shrine feel ── */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            width: 72,
            height: 72,
            zIndex: 20,
            animation: "kitsuFloatC 4s ease-in-out infinite",
          }}
        >
          {/* Foxfire halo — triple-ring shrine */}
          <div
            style={{
              position: "absolute",
              inset: -10,
              borderRadius: "50%",
              border: "1px solid rgba(232,160,64,0.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: -6,
              borderRadius: "50%",
              background: "rgba(232,160,64,0.07)",
              border: "1px solid rgba(232,160,64,0.25)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid rgba(200,144,64,0.55)",
              background: "rgba(12,10,8,0.92)",
              boxShadow: `0 0 20px rgba(232,160,64,0.25), inset 0 0 8px rgba(232,160,64,0.1)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/agent-office/pixel/marvis-kitsune.png"
              alt="Kitsu"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
