"use client";

import React from "react";

// ─────────────────────────────────────────────
//  Arm B — "golden-hour" (PG Ghibli taste)
//  Laputa sunset-into-night: deep blue sky warming
//  toward golden-cloud-glow, more romantic/painterly
//  Glass: warmer tint, jewel-tone status chips
//  Accent: luminous golden light-leak top-right corner
// ─────────────────────────────────────────────

const GLASS_B = {
  background: "rgba(28,22,44,0.68)",
  backdropFilter: "blur(20px) saturate(1.6)",
  WebkitBackdropFilter: "blur(20px) saturate(1.6)",
  border: "1px solid rgba(220,168,80,0.2)",
  borderRadius: 12,
} as const;

const GOLD = "#F0C060";
const GOLD_WARM = "#E8944A";
const EMERALD = "#4ADE80";
const CORAL = "#FF8070";
const AMBER_CHIP = "#FBBA42";
const TEXT_PRIMARY = "#F5EDDA";
const TEXT_DIM = "#B09870";
const TEXT_MUTED = "#6B5840";

const NavIconB = ({
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
      borderRadius: 10,
      background: active ? "rgba(240,192,96,0.16)" : "transparent",
      border: active
        ? `1px solid rgba(240,192,96,0.4)`
        : "1px solid transparent",
      color: active ? GOLD : TEXT_MUTED,
      fontSize: 16,
      cursor: "pointer",
      transition: "all 0.18s ease",
      fontFamily: "DM Sans, sans-serif",
    }}
  >
    {glyph}
  </div>
);

const StatusChipB = ({ status }: { status: "green" | "amber" | "red" }) => {
  const map = {
    green: { bg: "rgba(74,222,128,0.14)", color: EMERALD, label: "live" },
    amber: { bg: "rgba(251,186,66,0.14)", color: AMBER_CHIP, label: "active" },
    red: { bg: "rgba(255,128,112,0.14)", color: CORAL, label: "blocked" },
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
        borderRadius: 20,
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

const ProjectCardB = ({
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
      ...GLASS_B,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      animation: "panelInB 0.38s cubic-bezier(0.22,1,0.36,1) both",
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
      <StatusChipB status={status} />
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
        background: "rgba(220,168,80,0.06)",
        border: "1px solid rgba(220,168,80,0.12)",
        borderRadius: 6,
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
          color: CORAL,
          fontStyle: "italic",
        }}
      >
        ⚠ {note}
      </div>
    )}
  </div>
);

const ActivityRowB = ({
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
      borderBottom: "1px solid rgba(220,168,80,0.08)",
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
        color: EMERALD,
        fontVariantNumeric: "tabular-nums",
        fontWeight: 600,
      }}
    >
      {diff}
    </span>
  </div>
);

export default function ObservatoryB() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,wght@1,300;1,400;1,500&display=swap');

        .obs-b-root * { box-sizing: border-box; }

        @keyframes panelInB {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kitsuFloatB {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes goldLeakPulse {
          0%, 100% { opacity: 0.55; }
          50%       { opacity: 0.75; }
        }
        @keyframes cloudDrift {
          0%   { transform: translateX(0) translateY(0); opacity: 0.18; }
          50%  { transform: translateX(12px) translateY(-4px); opacity: 0.28; }
          100% { transform: translateX(0) translateY(0); opacity: 0.18; }
        }
      `}</style>

      <div
        className="obs-b-root"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 1180,
          minHeight: 700,
          margin: "0 auto",
          borderRadius: 16,
          overflow: "hidden",
          fontFamily: "DM Sans, sans-serif",
          /* Ghibli Laputa: deep indigo sky warming up from one side */
          background:
            "radial-gradient(ellipse 80% 60% at 80% 10%, #3B2A18 0%, #1E1630 35%, #0E0D1E 100%)",
          display: "flex",
        }}
      >
        {/* Warm golden light-leak — top-right corner */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(240,160,60,0.38) 0%, rgba(224,100,40,0.12) 50%, transparent 75%)",
            animation: "goldLeakPulse 5s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        {/* Painterly cloud wisps */}
        {[
          { top: "8%", left: "15%", w: 180, h: 40 },
          { top: "18%", left: "50%", w: 220, h: 35 },
          { top: "32%", left: "30%", w: 140, h: 28 },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: c.top,
              left: c.left,
              width: c.w,
              height: c.h,
              borderRadius: 999,
              background: "rgba(240,192,80,0.12)",
              filter: "blur(18px)",
              animation: `cloudDrift ${6 + i * 1.4}s ease-in-out ${i * 1.2}s infinite`,
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Faint star field — fewer, warmer */}
        {[...Array(16)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              borderRadius: "50%",
              background: "#F0C060",
              opacity: 0.18,
              top: `${(i * 43 + 9) % 80}%`,
              left: `${(i * 67 + 5) % 90}%`,
            }}
          />
        ))}

        {/* ── Left nav rail ── */}
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
            borderRight: "1px solid rgba(220,168,80,0.12)",
            background: "rgba(14,13,30,0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: 13,
              color: GOLD,
              letterSpacing: "0.02em",
              marginBottom: 16,
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
              userSelect: "none",
              textShadow: `0 0 12px ${GOLD_WARM}`,
            }}
          >
            PG OS
          </div>

          <NavIconB label="Home" active glyph="⌂" />
          <NavIconB label="Habits" glyph="◎" />
          <NavIconB label="Projects" glyph="⬡" />
          <NavIconB label="Flow" glyph="∿" />
          <NavIconB label="Claude" glyph="✦" />
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
              animation: "panelInB 0.32s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: GOLD_WARM,
                marginBottom: 8,
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
                textShadow: `0 2px 24px rgba(240,160,60,0.2)`,
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
            <ProjectCardB
              name="personal-os"
              sub="cockpit · 2d"
              ctx="48% ctx"
              tool="mcp_claude-in-chrome__browser_batch"
              status="green"
            />
            <ProjectCardB
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
              ...GLASS_B,
              padding: "18px 20px",
              animation:
                "panelInB 0.44s cubic-bezier(0.22,1,0.36,1) 0.06s both",
              marginBottom: 24,
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
            <ActivityRowB
              time="09:58"
              label="legibility foundation shipped"
              diff="+711 −0"
            />
            <ActivityRowB
              time="09:24"
              label="party mode — Kitsu sings first"
              diff="+180 −44"
            />
            <ActivityRowB
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
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_WARM} 100%)`,
              color: "#1A0E06",
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.02em",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              cursor: "pointer",
              animation: "panelInB 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both",
              boxShadow: `0 4px 20px rgba(240,160,60,0.3)`,
            }}
          >
            + New session →
          </button>
        </main>

        {/* ── Kitsu pod ── */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            width: 72,
            height: 72,
            zIndex: 20,
            animation: "kitsuFloatB 4s ease-in-out infinite",
          }}
        >
          {/* Warm halo ring */}
          <div
            style={{
              position: "absolute",
              inset: -6,
              borderRadius: "50%",
              background: "rgba(240,160,60,0.12)",
              border: "1px solid rgba(240,160,60,0.32)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid rgba(240,160,60,0.55)",
              background: "rgba(28,20,10,0.9)",
              boxShadow: `0 0 16px rgba(240,160,60,0.3)`,
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
