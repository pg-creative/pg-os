"use client";

import React from "react";

// ─────────────────────────────────────────────
//  Arm A — "as conceived" (neutral midnight sky)
//  bg: radial #0C1220→#1A2540 (ink midnight)
//  glass: rgba(20,32,55,0.72) blur + 1px rgba(100,140,200,0.18)
//  accent: golden #F5B942
//  text: #E8EFF8
// ─────────────────────────────────────────────

const GLASS = {
  background: "rgba(20,32,55,0.72)",
  backdropFilter: "blur(18px) saturate(1.4)",
  WebkitBackdropFilter: "blur(18px) saturate(1.4)",
  border: "1px solid rgba(100,140,200,0.18)",
  borderRadius: "12px",
} as const;

const ACCENT = "#F5B942";
const TEXT_PRIMARY = "#E8EFF8";
const TEXT_DIM = "#7A93B8";
const TEXT_MUTED = "#4A6080";
const BG_CHIP_GREEN = "rgba(52,211,153,0.15)";
const BG_CHIP_AMBER = "rgba(245,185,66,0.15)";
const BG_CHIP_RED = "rgba(248,113,113,0.15)";

const NavIcon = ({
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
      background: active ? "rgba(245,185,66,0.18)" : "transparent",
      border: active
        ? `1px solid rgba(245,185,66,0.35)`
        : "1px solid transparent",
      color: active ? ACCENT : TEXT_MUTED,
      fontSize: 16,
      cursor: "pointer",
      transition: "all 0.18s ease",
      fontFamily: "DM Sans, sans-serif",
      fontWeight: active ? 600 : 400,
    }}
  >
    {glyph}
  </div>
);

const StatusChip = ({ status }: { status: "green" | "amber" | "red" }) => {
  const map = {
    green: { bg: BG_CHIP_GREEN, color: "#34D399", label: "live" },
    amber: { bg: BG_CHIP_AMBER, color: ACCENT, label: "active" },
    red: { bg: BG_CHIP_RED, color: "#F87171", label: "blocked" },
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

const ProjectCard = ({
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
      ...GLASS,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      animation: "panelIn 0.38s cubic-bezier(0.22,1,0.36,1) both",
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
      <StatusChip status={status} />
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
        background: "rgba(100,140,200,0.07)",
        border: "1px solid rgba(100,140,200,0.1)",
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
          color: "#F87171",
          fontStyle: "italic",
        }}
      >
        ⚠ {note}
      </div>
    )}
  </div>
);

const ActivityRow = ({
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
      borderBottom: "1px solid rgba(100,140,200,0.08)",
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
        color: "#34D399",
        fontVariantNumeric: "tabular-nums",
        fontWeight: 600,
      }}
    >
      {diff}
    </span>
  </div>
);

export default function ObservatoryA() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,wght@1,300;1,400;1,500&display=swap');

        .obs-a-root * { box-sizing: border-box; }

        @keyframes panelIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kitsuFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.9; }
        }
      `}</style>

      <div
        className="obs-a-root"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 1180,
          minHeight: 700,
          margin: "0 auto",
          borderRadius: 16,
          overflow: "hidden",
          fontFamily: "DM Sans, sans-serif",
          background:
            "radial-gradient(ellipse 120% 90% at 60% 30%, #1A2540 0%, #0C1220 100%)",
          display: "flex",
        }}
      >
        {/* Star field */}
        {[...Array(28)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: i % 5 === 0 ? 2 : 1,
              height: i % 5 === 0 ? 2 : 1,
              borderRadius: "50%",
              background: "#E8EFF8",
              opacity: 0.25,
              top: `${(i * 37 + 11) % 95}%`,
              left: `${(i * 53 + 7) % 95}%`,
              animation: `starTwinkle ${2.5 + (i % 4) * 0.7}s ease-in-out ${(i * 0.3) % 2}s infinite`,
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
            borderRight: "1px solid rgba(100,140,200,0.1)",
            background: "rgba(12,18,32,0.6)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: 13,
              color: ACCENT,
              letterSpacing: "0.02em",
              marginBottom: 16,
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
              userSelect: "none",
            }}
          >
            PG OS
          </div>

          <NavIcon label="Home" active glyph="⌂" />
          <NavIcon label="Habits" glyph="◎" />
          <NavIcon label="Projects" glyph="⬡" />
          <NavIcon label="Flow" glyph="∿" />
          <NavIcon label="Claude" glyph="✦" />
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
              animation: "panelIn 0.32s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: ACCENT,
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
            <ProjectCard
              name="personal-os"
              sub="cockpit · 2d"
              ctx="48% ctx"
              tool="mcp_claude-in-chrome__browser_batch"
              status="green"
            />
            <ProjectCard
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
              ...GLASS,
              padding: "18px 20px",
              animation: "panelIn 0.44s cubic-bezier(0.22,1,0.36,1) 0.06s both",
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
            <ActivityRow
              time="09:58"
              label="legibility foundation shipped"
              diff="+711 −0"
            />
            <ActivityRow
              time="09:24"
              label="party mode — Kitsu sings first"
              diff="+180 −44"
            />
            <ActivityRow time="08:51" label="fox head reframed" diff="+12 −9" />
          </div>

          {/* CTA */}
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: ACCENT,
              color: "#0C1220",
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.02em",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              cursor: "pointer",
              animation: "panelIn 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both",
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
            animation: "kitsuFloat 4s ease-in-out infinite",
          }}
        >
          {/* Frosted halo ring */}
          <div
            style={{
              position: "absolute",
              inset: -6,
              borderRadius: "50%",
              background: "rgba(245,185,66,0.08)",
              border: "1px solid rgba(245,185,66,0.22)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />
          {/* Avatar frame */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid rgba(245,185,66,0.4)",
              background: "rgba(20,32,55,0.9)",
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
