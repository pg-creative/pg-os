"use client";

/**
 * V3Cockpit — "Focal cockpit / command core, no scroll"
 *
 * Layout: A large central WashiPanel holds the clock + greeting.
 * Kitsu's MarvisCorner floats fixed bottom-right as her anchor point.
 * Eight satellite panels radiate outward like a pilot's instrument ring:
 *   TOP-LEFT    : Vitals
 *   TOP-CENTER  : Operator identity pill bar
 *   TOP-RIGHT   : Calendar (next event + count)
 *   LEFT        : Now Playing
 *   RIGHT       : Active Project (HC v1.0)
 *   BOTTOM-LEFT : Inbox count + urgent preview
 *   BOTTOM-CENTER: Capture + New Session CTAs
 *   BOTTOM-RIGHT: Crew (sessions + agents)
 *
 * Kintsugi seam lines radiate from center to each satellite so the
 * whole canvas reads as one painted instrument panel.
 *
 * No scroll — everything visible at 100vh.
 */

import React, { useState, useEffect, useCallback } from "react";
import { MarvisCorner } from "../../../_components/views/cockpit/MarvisCorner";
import { PHASES, Phase, phaseForHour } from "../../../_components/emaki/theme";
import {
  EMAKI_CSS,
  useEmakiVars,
  PaintedBackdrop,
  FoxfireLayer,
  WashiPanel,
  KintsugiSeam,
  GlyphSun,
  GlyphDusk,
  GlyphMoon,
} from "../../../_components/emaki/materials";

/* ── Mock data ── */

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MON_SHORT = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function liveGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 18) return "Good afternoon,";
  return "Good evening,";
}

function liveDateLine() {
  const d = new Date();
  const dayNum = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return `${DOW[d.getDay()]} · ${MON_SHORT[d.getMonth()]} ${d.getDate()} · DAY ${dayNum}`;
}

const VITALS = [
  { val: "84", lbl: "REC", unit: "%", accent: true },
  { val: "62", lbl: "HRV", unit: "ms", accent: false },
  { val: "8.4", lbl: "STR", unit: "/21", accent: false },
  { val: "6.2k", lbl: "STEPS", unit: "", accent: false },
];

const CALENDAR_EVENTS = [
  { time: "09:00", title: "Metrasens GTM sync", duration: "30m" },
  { time: "12:00", title: "HC design review", duration: "1h" },
  { time: "15:30", title: "Coffee · Maya Lin", duration: "45m" },
];

const PROJECT_CHECKS = [
  { done: true, label: "Design system + architecture" },
  { done: true, label: "Supabase + Whoop wiring" },
  { done: true, label: "Vercel deploy · PWA" },
  { done: false, label: "iMessage integration" },
  { done: false, label: "Login + onboarding" },
];

const SESSIONS = [
  { project: "personal-os", running: true, tool: "Edit", ago: "3m" },
  { project: "heros-chronicle", running: false, tool: null, ago: "18m" },
];

const AGENTS = [
  { name: "session-review", ok: true, ago: "1h" },
  { name: "morning-briefing", ok: true, ago: "6h" },
  { name: "weekly-meta-audit", ok: false, ago: "2d" },
];

const INBOX = [
  {
    initials: "ML",
    name: "Maya Lin",
    preview: "HC v2.7 scope — need sign-off today",
    urgent: true,
    ago: "12M",
  },
  {
    initials: "TH",
    name: "Theo H.",
    preview: "Moved our sync, new invite attached",
    urgent: false,
    ago: "48M",
  },
  {
    initials: "EN",
    name: "Eliza N.",
    preview: "Dinner Saturday still on?",
    urgent: false,
    ago: "2H",
  },
];

/* ── Radial seam SVG — gold lines from center outward ── */
function RadialSeams({
  gold,
  goldBright,
}: {
  gold: string;
  goldBright: string;
}) {
  /* 8 rays, each angled toward a satellite position */
  const rays = [
    { x1: 50, y1: 50, x2: 14, y2: 12 } /* top-left */,
    { x1: 50, y1: 50, x2: 50, y2: 3 } /* top-center */,
    { x1: 50, y1: 50, x2: 86, y2: 12 } /* top-right */,
    { x1: 50, y1: 50, x2: 3, y2: 50 } /* left */,
    { x1: 50, y1: 50, x2: 97, y2: 50 } /* right */,
    { x1: 50, y1: 50, x2: 14, y2: 88 } /* bottom-left */,
    { x1: 50, y1: 50, x2: 50, y2: 97 } /* bottom-center */,
    { x1: 50, y1: 50, x2: 82, y2: 88 } /* bottom-right */,
  ];
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
        overflow: "visible",
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="ray-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={goldBright} stopOpacity="0.65" />
          <stop offset="50%" stopColor={gold} stopOpacity="0.38" />
          <stop offset="100%" stopColor={goldBright} stopOpacity="0" />
        </linearGradient>
      </defs>
      {rays.map((r, i) => (
        <line
          key={i}
          x1={`${r.x1}%`}
          y1={`${r.y1}%`}
          x2={`${r.x2}%`}
          y2={`${r.y2}%`}
          stroke={`url(#ray-grad)`}
          strokeWidth="0.18"
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 1px ${gold}66)`,
          }}
        />
      ))}
    </svg>
  );
}

/* ── Compact satellite label ── */
function SatLabel({
  children,
  gold,
}: {
  children: React.ReactNode;
  gold: string;
}) {
  return (
    <div
      style={{
        fontFamily: "'Noto Serif JP', serif",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: gold,
        marginBottom: 7,
        opacity: 0.85,
      }}
    >
      {children}
    </div>
  );
}

/* ── Compact vitals row ── */
function VitalRow({
  v,
  tk,
}: {
  v: (typeof VITALS)[0];
  tk: ReturnType<
    (typeof PHASES)["night"]["foxfire"] extends string
      ? () => (typeof PHASES)["night"]
      : never
  >;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: (tk as any).textMuted,
          fontWeight: 600,
          letterSpacing: "0.08em",
        }}
      >
        {v.lbl}
      </span>
      <span
        style={{
          fontSize: 17,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: (tk as any).foxfire,
          fontFamily: "'DM Sans', monospace",
        }}
      >
        {v.val}
        <span
          style={{ fontSize: 10, color: (tk as any).textMuted, marginLeft: 1 }}
        >
          {v.unit}
        </span>
      </span>
    </div>
  );
}

/* ── Now Playing EQ bars ── */
const EQ_CSS = `
  @keyframes v3-eq-pulse {
    from { transform: scaleY(0.25); }
    to   { transform: scaleY(1); }
  }
  @media (prefers-reduced-motion: reduce) { .v3-eq-bar { animation: none !important; } }
`;

/* ── Grid layout CSS ── */
const V3_CSS = `
  .v3-root {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    font-family: 'DM Sans', sans-serif;
  }

  /* Top menu bar */
  .v3-topbar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 38px;
    z-index: 40;
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 0;
    border-bottom: 1px solid;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .v3-topbar-wordmark {
    font-family: 'Noto Serif JP', serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    user-select: none;
    margin-right: 18px;
    flex-shrink: 0;
  }
  .v3-topbar-nav {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
  }
  .v3-topbar-item {
    padding: 4px 12px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
    cursor: pointer;
    border: none;
    background: transparent;
    transition: background 0.18s, color 0.18s;
    white-space: nowrap;
  }
  .v3-topbar-item:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }

  /* Main instrument grid — 3 col × 3 row + center */
  .v3-grid {
    position: absolute;
    top: 38px; left: 0; right: 0; bottom: 0;
    display: grid;
    grid-template-columns: 220px 1fr 220px;
    grid-template-rows: 1fr 1fr 1fr;
    gap: 10px;
    padding: 12px 14px 12px 14px;
    z-index: 10;
  }

  /* Center focal core spans all 3 rows of the middle column */
  .v3-core {
    grid-column: 2;
    grid-row: 1 / 4;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  /* Satellite slots */
  .v3-sat-tl { grid-column: 1; grid-row: 1; }
  .v3-sat-l  { grid-column: 1; grid-row: 2; }
  .v3-sat-bl { grid-column: 1; grid-row: 3; }
  .v3-sat-tr { grid-column: 3; grid-row: 1; }
  .v3-sat-r  { grid-column: 3; grid-row: 2; }
  .v3-sat-br { grid-column: 3; grid-row: 3; }

  /* Satellite panels fill their cell fully */
  .v3-sat-tl > div,
  .v3-sat-l > div,
  .v3-sat-bl > div,
  .v3-sat-tr > div,
  .v3-sat-r > div,
  .v3-sat-br > div {
    height: 100%;
    overflow: hidden;
  }

  /* Core clock */
  .v3-clock {
    font-family: 'DM Sans', monospace;
    font-size: clamp(40px, 6vw, 64px);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
    line-height: 1;
    text-align: center;
  }

  /* Core greeting */
  .v3-greeting {
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(14px, 2vw, 20px);
    font-weight: 700;
    margin-top: 8px;
    text-align: center;
  }

  /* Kitsu halo ring around core */
  .v3-core-ring {
    position: absolute;
    inset: -18px;
    border-radius: 50%;
    pointer-events: none;
    z-index: -1;
  }

  /* Progress bar */
  .v3-prog-track {
    height: 3px;
    border-radius: 2px;
    overflow: hidden;
    margin: 6px 0 8px;
  }
  .v3-prog-fill {
    height: 100%;
    border-radius: 2px;
    width: 62%;
  }

  /* Session dot */
  .v3-sess-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* EQ bar */
  .v3-eq-bar {
    width: 3px;
    border-radius: 1.5px;
    transform-origin: bottom;
    animation: v3-eq-pulse var(--v3-eq-dur, 0.9s) ease-in-out infinite alternate;
  }

  @media (max-width: 900px) {
    .v3-grid {
      grid-template-columns: 180px 1fr 180px;
    }
  }
`;

/* ── Phase tokens type helper ── */
type TK = (typeof PHASES)["night"];

/* ── Satellite: Vitals (top-left) ── */
function SatVitals({ tk }: { tk: TK }) {
  return (
    <WashiPanel tk={tk} style={{ height: "100%", padding: "12px 14px" }}>
      <SatLabel gold={tk.gold}>Vitals</SatLabel>
      {VITALS.map((v) => (
        <div
          key={v.lbl}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 5,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: tk.textMuted,
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            {v.lbl}
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: tk.foxfire,
              fontFamily: "'DM Sans', monospace",
            }}
          >
            {v.val}
            <span style={{ fontSize: 10, color: tk.textMuted, marginLeft: 2 }}>
              {v.unit}
            </span>
          </span>
        </div>
      ))}
      <div
        style={{
          marginTop: 8,
          padding: "4px 8px",
          borderRadius: 4,
          background: `${tk.accent}12`,
          border: `1px solid ${tk.accent}20`,
          fontSize: 10,
          color: tk.textMuted,
          letterSpacing: "0.06em",
        }}
      >
        WHOOP LIVE
      </div>
    </WashiPanel>
  );
}

/* ── Satellite: Now Playing (left-mid) ── */
function SatNowPlaying({ tk }: { tk: TK }) {
  return (
    <WashiPanel tk={tk} style={{ height: "100%", padding: "12px 14px" }}>
      <SatLabel gold={tk.gold}>Now Playing</SatLabel>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 5,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${tk.accent}30, ${tk.foxfire}20)`,
            border: `1.5px solid ${tk.panelBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          ♪
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: tk.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            One Summer&apos;s Day
          </div>
          <div style={{ fontSize: 11, color: tk.textMuted, marginTop: 2 }}>
            Joe Hisaishi
          </div>
        </div>
      </div>
      {/* EQ bars */}
      <div
        style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 16 }}
        aria-label="Playing"
      >
        {[0.55, 1, 0.7, 0.88, 0.45, 0.65, 0.8].map((h, i) => (
          <div
            key={i}
            className="v3-eq-bar"
            style={{
              height: 14 * h,
              background: `linear-gradient(180deg, ${tk.foxfireGlow}, ${tk.accent})`,
              ["--v3-eq-dur" as string]: `${0.55 + i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </WashiPanel>
  );
}

/* ── Satellite: Inbox (bottom-left) ── */
function SatInbox({ tk }: { tk: TK }) {
  const urgent = INBOX.filter((m) => m.urgent);
  return (
    <WashiPanel tk={tk} style={{ height: "100%", padding: "12px 14px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <SatLabel gold={tk.gold}>Inbox</SatLabel>
        <span
          style={{
            fontSize: 11,
            color: tk.foxfire,
            fontWeight: 700,
            marginBottom: 7,
          }}
        >
          {INBOX.length} UNREAD
        </span>
      </div>
      {INBOX.slice(0, 3).map((msg, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            paddingBottom: 6,
            borderBottom: i < 2 ? `1px solid ${tk.divider}` : "none",
            marginBottom: i < 2 ? 6 : 0,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              background: `${tk.accent}20`,
              border: `1px solid ${tk.panelBorder}`,
              color: tk.foxfire,
            }}
          >
            {msg.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginBottom: 1,
              }}
            >
              <span
                style={{ fontSize: 12, fontWeight: 600, color: tk.textPrimary }}
              >
                {msg.name}
              </span>
              {msg.urgent && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 4px",
                    borderRadius: 3,
                    background: "rgba(248,113,113,0.15)",
                    border: "1px solid rgba(248,113,113,0.35)",
                    color: "#F87171",
                  }}
                >
                  !
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 11,
                color: tk.textMuted,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {msg.preview}
            </div>
          </div>
        </div>
      ))}
    </WashiPanel>
  );
}

/* ── Satellite: Calendar (top-right) ── */
function SatCalendar({ tk }: { tk: TK }) {
  return (
    <WashiPanel tk={tk} style={{ height: "100%", padding: "12px 14px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <SatLabel gold={tk.gold}>Today</SatLabel>
        <span
          style={{
            fontSize: 10,
            color: tk.textMuted,
            fontWeight: 600,
            letterSpacing: "0.06em",
            marginBottom: 7,
          }}
        >
          {CALENDAR_EVENTS.length} EVENTS
        </span>
      </div>
      {CALENDAR_EVENTS.map((ev, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            paddingBottom: 6,
            borderBottom:
              i < CALENDAR_EVENTS.length - 1
                ? `1px solid ${tk.divider}`
                : "none",
            marginBottom: i < CALENDAR_EVENTS.length - 1 ? 6 : 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: tk.textMuted,
              fontVariantNumeric: "tabular-nums",
              fontFamily: "'DM Sans', monospace",
              flexShrink: 0,
              minWidth: 34,
            }}
          >
            {ev.time}
          </span>
          <span
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 500,
              color: tk.textSub,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {ev.title}
          </span>
          <span style={{ fontSize: 10, color: tk.textMuted, flexShrink: 0 }}>
            {ev.duration}
          </span>
        </div>
      ))}
    </WashiPanel>
  );
}

/* ── Satellite: Active Project (right-mid) ── */
function SatProject({ tk }: { tk: TK }) {
  const done = PROJECT_CHECKS.filter((c) => c.done).length;
  return (
    <WashiPanel tk={tk} style={{ height: "100%", padding: "12px 14px" }}>
      <SatLabel gold={tk.gold}>Active Project</SatLabel>
      <div
        style={{
          fontFamily: "'Noto Serif JP', serif",
          fontSize: 13,
          fontWeight: 700,
          color: tk.textPrimary,
          marginBottom: 2,
        }}
      >
        Hero&apos;s Chronicle · <em style={{ color: tk.foxfire }}>v1.0</em>
      </div>
      <div
        style={{
          fontSize: 10,
          color: tk.textMuted,
          letterSpacing: "0.07em",
          marginBottom: 6,
        }}
      >
        DUE OCT 2
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: tk.textMuted,
          marginBottom: 4,
        }}
      >
        <span>PROGRESS</span>
        <span style={{ color: tk.foxfire, fontWeight: 700 }}>62%</span>
      </div>
      <div className="v3-prog-track" style={{ background: `${tk.accent}14` }}>
        <div
          className="v3-prog-fill"
          style={{
            background: `linear-gradient(90deg, ${tk.foxfireGlow}, ${tk.accent})`,
            boxShadow: `0 0 5px ${tk.orbGlow}`,
          }}
        />
      </div>
      {PROJECT_CHECKS.slice(0, 5).map((c, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            paddingBottom: 4,
            fontSize: 12,
            fontWeight: c.done ? 400 : 500,
            color: c.done ? tk.textMuted : tk.textSub,
          }}
        >
          <div
            style={{
              width: 11,
              height: 11,
              borderRadius: 2,
              border: `1.5px solid ${c.done ? tk.accentDim : tk.panelBorder}`,
              background: c.done ? `${tk.accent}20` : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
              color: tk.foxfire,
              flexShrink: 0,
            }}
          >
            {c.done && "✓"}
          </div>
          <span
            style={{
              textDecoration: c.done ? "line-through" : "none",
              opacity: c.done ? 0.55 : 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.label}
          </span>
        </div>
      ))}
    </WashiPanel>
  );
}

/* ── Satellite: Crew / Sessions + Agents (bottom-right) ── */
function SatCrew({ tk }: { tk: TK }) {
  const liveCount = SESSIONS.filter((s) => s.running).length;
  return (
    <WashiPanel tk={tk} style={{ height: "100%", padding: "12px 14px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <SatLabel gold={tk.gold}>Crew</SatLabel>
        <span
          style={{
            fontSize: 11,
            color: "#34D399",
            fontWeight: 700,
            marginBottom: 7,
          }}
        >
          {liveCount} LIVE
        </span>
      </div>
      {SESSIONS.map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            paddingBottom: 5,
            borderBottom: `1px solid ${tk.divider}`,
            marginBottom: 5,
          }}
        >
          <div
            className="v3-sess-dot"
            style={{
              background: s.running ? "#34D399" : tk.textMuted,
              boxShadow: s.running ? "0 0 5px #34D39966" : "none",
            }}
          />
          <span
            style={{
              flex: 1,
              fontSize: 11,
              color: tk.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {s.project}
          </span>
          {s.tool && (
            <span
              style={{
                fontSize: 10,
                padding: "1px 5px",
                borderRadius: 3,
                background: `${tk.accent}14`,
                border: `1px solid ${tk.accent}24`,
                color: tk.textMuted,
              }}
            >
              {s.tool}
            </span>
          )}
          <span style={{ fontSize: 10, color: tk.textMuted, flexShrink: 0 }}>
            {s.ago}
          </span>
        </div>
      ))}
      {AGENTS.slice(0, 2).map((a, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            paddingBottom: i < 1 ? 5 : 0,
            borderBottom: i < 1 ? `1px solid ${tk.divider}` : "none",
            marginBottom: i < 1 ? 5 : 0,
          }}
        >
          <div
            className="v3-sess-dot"
            style={{
              background: a.ok ? tk.foxfire : "#F87171",
              boxShadow: a.ok
                ? `0 0 4px ${tk.orbGlow}`
                : "0 0 4px rgba(248,113,113,0.4)",
            }}
          />
          <span
            style={{
              flex: 1,
              fontSize: 10,
              color: a.ok ? tk.textSub : "#F87171",
              fontFamily: "'DM Sans', monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {a.name}
          </span>
          <span style={{ fontSize: 10, color: tk.textMuted, flexShrink: 0 }}>
            {a.ago}
          </span>
        </div>
      ))}
    </WashiPanel>
  );
}

/* ── Operator pill strip (top-center, above core) ── */
function OperatorStrip({ tk }: { tk: TK }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {[
        { k: "OPERATOR", v: "Patrick Smith" },
        { k: "FOCUS", v: "Deep Work" },
        { k: "RANK", v: "A · Tier III" },
        { k: "STREAK", v: "29 Days" },
      ].map((kv) => (
        <div
          key={kv.k}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 20,
            background: `${tk.accent}10`,
            border: `1px solid ${tk.panelBorder}`,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: tk.textMuted,
              fontWeight: 700,
              letterSpacing: "0.10em",
              fontFamily: "'Noto Serif JP', serif",
            }}
          >
            {kv.k}
          </span>
          <span
            style={{ fontSize: 12, color: tk.textPrimary, fontWeight: 600 }}
          >
            {kv.v}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Bottom-center: Capture + New Session CTAs ── */
function SatCTAs({ tk }: { tk: TK }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
      }}
    >
      <button
        type="button"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          borderRadius: 6,
          padding: "9px 22px",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.05em",
          cursor: "pointer",
          border: `1px solid ${tk.ctaBorder}`,
          background: tk.ctaBg,
          color: tk.ctaText,
          transition: "filter 0.2s",
        }}
        onMouseOver={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.filter =
            "brightness(1.10)")
        }
        onMouseOut={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.filter = "none")
        }
      >
        + Capture
      </button>
      <button
        type="button"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          borderRadius: 6,
          padding: "7px 18px",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer",
          border: `1px solid ${tk.divider}`,
          background: "transparent",
          color: tk.textMuted,
          transition: "filter 0.2s",
        }}
        onMouseOver={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.filter =
            "brightness(1.10)")
        }
        onMouseOut={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.filter = "none")
        }
      >
        New session →
      </button>
    </div>
  );
}

/* ── NAV ITEMS ── */
const NAV_ITEMS = [
  { label: "Home", active: true },
  { label: "Habits", active: false },
  { label: "Projects", active: false },
  { label: "Flow", active: false },
  { label: "Claude", active: false },
];

/* ─────────────────────────────────────────────────────────────────────────
   V3Cockpit
───────────────────────────────────────────────────────────────────────── */

export default function V3Cockpit() {
  const [phase, setPhase] = useState<Phase>("night");
  const [clockStr, setClockStr] = useState("00:00:00");
  const [dateLine, setDateLine] = useState("");
  const [greeting, setGreeting] = useState("Good evening,");
  const tk = PHASES[phase];

  useEmakiVars(phase);

  useEffect(() => {
    setPhase(phaseForHour(new Date().getHours()));
  }, []);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setClockStr(`${h}:${m}:${s}`);
      setDateLine(liveDateLine());
      setGreeting(liveGreeting());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <style>{EMAKI_CSS}</style>
      <style>{V3_CSS}</style>
      <style>{EQ_CSS}</style>

      <div
        className="v3-root"
        style={{
          background: tk.bg,
          transition: "background 0.6s ease",
          ["--hero-halo" as string]: tk.heroHalo,
          ["--panel-blur" as string]: phase === "day" ? "none" : "blur(10px)",
        }}
      >
        {/* World painting */}
        <PaintedBackdrop phase={phase} />
        <FoxfireLayer phase={phase} />

        {/* Radial seam lines from center to each satellite */}
        <RadialSeams gold={tk.gold} goldBright={tk.goldBright} />

        {/* Top menu bar */}
        <header
          className="v3-topbar"
          style={{
            background: tk.railBg,
            borderColor: tk.railBorder,
          }}
        >
          <div className="v3-topbar-wordmark" style={{ color: tk.goldBright }}>
            PG OS
          </div>
          <nav className="v3-topbar-nav" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                className="v3-topbar-item"
                type="button"
                aria-current={item.active ? "page" : undefined}
                style={{
                  background: item.active ? tk.pillActive : "transparent",
                  color: item.active ? tk.pillTextActive : tk.pillTextInactive,
                  border: item.active
                    ? `1px solid ${tk.accentDim}`
                    : "1px solid transparent",
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Phase toggle in topbar right */}
          <div
            style={{
              display: "flex",
              gap: 2,
              borderRadius: 6,
              border: `1px solid ${tk.divider}`,
              padding: "2px",
              background: tk.toggleBg,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            {(["day", "twilight", "night"] as Phase[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPhase(p)}
                aria-pressed={phase === p}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                  border: "none",
                  background:
                    phase === p ? PHASES[p].pillActive : "transparent",
                  color:
                    phase === p
                      ? PHASES[p].pillTextActive
                      : tk.pillTextInactive,
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                  transition: "background 0.18s, color 0.18s",
                }}
              >
                {p === "day" ? (
                  <GlyphSun
                    color={
                      phase === p
                        ? PHASES[p].pillTextActive
                        : tk.pillTextInactive
                    }
                  />
                ) : p === "twilight" ? (
                  <GlyphDusk
                    color={
                      phase === p
                        ? PHASES[p].pillTextActive
                        : tk.pillTextInactive
                    }
                  />
                ) : (
                  <GlyphMoon
                    color={
                      phase === p
                        ? PHASES[p].pillTextActive
                        : tk.pillTextInactive
                    }
                  />
                )}
                {PHASES[p].phaseName}
              </button>
            ))}
          </div>
        </header>

        {/* Instrument grid */}
        <div className="v3-grid">
          {/* LEFT COLUMN */}
          <div className="v3-sat-tl">
            <SatVitals tk={tk} />
          </div>
          <div className="v3-sat-l">
            <SatNowPlaying tk={tk} />
          </div>
          <div className="v3-sat-bl">
            <SatInbox tk={tk} />
          </div>

          {/* CENTER: focal core */}
          <div className="v3-core">
            {/* Kitsu glow halo — soft radial gradient behind the core panel */}
            <div
              className="v3-core-ring"
              style={{
                background: `radial-gradient(ellipse at 50% 50%, ${tk.foxfireGlow}18 0%, ${tk.orbGlow}10 40%, transparent 70%)`,
                boxShadow: `0 0 60px ${tk.foxfireGlow}22`,
                borderRadius: "50%",
              }}
            />

            {/* Operator strip above core */}
            <div style={{ width: "100%", marginBottom: 10 }}>
              <OperatorStrip tk={tk} />
            </div>

            <WashiPanel
              tk={tk}
              style={{
                width: "100%",
                padding: "28px 32px",
                textAlign: "center",
                position: "relative",
                border: `1.5px solid ${tk.panelInkBorder}`,
                boxShadow: `0 0 32px ${tk.foxfireGlow}18, inset 0 0 0 1px ${tk.panelInkBorder}33`,
              }}
            >
              {/* Phase eyebrow label */}
              <div
                style={{
                  fontSize: 11,
                  color: tk.eyebrowText,
                  fontWeight: 600,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                  textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                }}
              >
                {tk.eyebrowLabel}
              </div>

              {/* Live clock */}
              <div
                className="v3-clock"
                style={{
                  color: tk.foxfire,
                  textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                }}
              >
                {clockStr}
              </div>

              {/* Greeting */}
              <div
                className="v3-greeting"
                style={{
                  color: tk.textPrimary,
                  textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                }}
              >
                {greeting} Patrick.
              </div>

              {/* Date line */}
              <div
                style={{
                  fontSize: 12,
                  color: tk.textMuted,
                  marginTop: 6,
                  letterSpacing: "0.06em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {dateLine}
              </div>

              {/* Kintsugi separator */}
              <div style={{ marginTop: 16, marginBottom: 12 }}>
                <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />
              </div>

              {/* Kanji + subtitle — Kitsu's phase motto */}
              <div
                style={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontSize: "clamp(18px, 3vw, 26px)",
                  fontWeight: 700,
                  color: tk.textPrimary,
                  textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                }}
              >
                {tk.kanji}
              </div>
              <div
                style={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontSize: 13,
                  color: tk.accent,
                  marginTop: 4,
                  textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                }}
              >
                {tk.subtitle}
              </div>

              {/* Kitsu anchor indicator — a subtle fox silhouette text mark */}
              <div
                style={{
                  marginTop: 16,
                  fontSize: 10,
                  color: tk.textMuted,
                  letterSpacing: "0.14em",
                  fontWeight: 600,
                  opacity: 0.7,
                }}
              >
                KITSU AT THE HELM
              </div>
            </WashiPanel>

            {/* CTA row below core */}
            <div style={{ width: "100%", marginTop: 10 }}>
              <SatCTAs tk={tk} />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="v3-sat-tr">
            <SatCalendar tk={tk} />
          </div>
          <div className="v3-sat-r">
            <SatProject tk={tk} />
          </div>
          <div className="v3-sat-br">
            <SatCrew tk={tk} />
          </div>
        </div>

        {/* Kitsu — MarvisCorner anchored bottom-right */}
        <MarvisCorner modelUrl="/live2d/fox/standard_fox.model3.json" />
      </div>
    </>
  );
}
