"use client";

/**
 * V5Hybrid — "Focal Cockpit meets Broadsheet Legibility"
 *
 * Top layer: V2's full-width menu bar (5 tabs + kintsugi active underline +
 *   phase toggle at right) with glyph+label tabs and the "PG OS" wordmark.
 *
 * Center: V3's dramatic focal core panel (live clock, greeting, kanji, Kitsu
 *   halo glow) as the undisputed centerpiece, now taller and breathing more.
 *
 * Satellites: V3's 3-col × 3-row instrument grid, but with V2's generous sizing:
 *   - Vital stat values at 22px (V2 cell scale), not 16px
 *   - Calendar event titles at 15px
 *   - Inbox names at 15px
 *   - Project checklist items at 14px
 *   - All labels at 13px, all sub-labels at 11-12px
 *
 * Kitsu reserve: bottom-right grid cell left intentionally clear (ghost panel)
 *   so MarvisCorner can sit there without covering any live content.
 *
 * Kintsugi seams radiate from center to each satellite exactly as in V3.
 * PaintedBackdrop + FoxfireLayer + locked emaki module throughout.
 * No scroll. No new npm deps.
 */

import React, { useState, useEffect } from "react";
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

/* ── Type alias ── */
type TK = (typeof PHASES)["night"];

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
  { val: "84", lbl: "Recovery", unit: "%" },
  { val: "62", lbl: "HRV", unit: "ms" },
  { val: "8.4", lbl: "Strain", unit: "/21" },
  { val: "6,240", lbl: "Steps", unit: "" },
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

const NAV_ITEMS = [
  { label: "Home", glyph: "⌂", active: true },
  { label: "Habits", glyph: "◎", active: false },
  { label: "Projects", glyph: "⬡", active: false },
  { label: "Flow", glyph: "∿", active: false },
  { label: "Claude", glyph: "✦", active: false },
];

/* ── CSS ── */
const EQ_CSS = `
  @keyframes v5-eq {
    from { transform: scaleY(0.25); }
    to   { transform: scaleY(1); }
  }
  @media (prefers-reduced-motion: reduce) { .v5-eq-bar { animation: none !important; } }
`;

const V5_CSS = `
  /* ── Root shell ── */
  .v5-root {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    font-family: 'DM Sans', sans-serif;
    display: flex;
    flex-direction: column;
  }

  /* ── TOP BAR: V2's full-width broadsheet bar ── */
  .v5-topbar {
    position: relative;
    z-index: 40;
    width: 100%;
    height: 52px;
    flex-shrink: 0;
    display: flex;
    align-items: stretch;
    transition: background 0.5s ease, border-color 0.5s ease;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }
  .v5-topbar-wordmark {
    display: flex;
    align-items: center;
    padding: 0 22px 0 20px;
    font-family: 'Noto Serif JP', serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    user-select: none;
    flex-shrink: 0;
    border-right: 1px solid;
    transition: color 0.5s ease, border-color 0.5s ease;
  }
  .v5-topbar-tabs {
    display: flex;
    align-items: stretch;
    flex: 1;
    gap: 0;
  }
  .v5-topbar-tab {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 20px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    cursor: pointer;
    position: relative;
    transition: background 0.18s, color 0.18s;
    white-space: nowrap;
    border: none;
    background: transparent;
  }
  .v5-topbar-tab:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: -2px;
  }
  /* Kintsugi jagged gold underline on active tab (V2 signature) */
  .v5-topbar-tab[aria-pressed="true"]::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 12px;
    right: 12px;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--v5-kintsugi-start, #8c5c08) 20%,
      var(--v5-kintsugi-peak, #b87818) 50%,
      var(--v5-kintsugi-start, #8c5c08) 80%,
      transparent 100%
    );
    clip-path: polygon(
      0% 50%, 5% 0%, 18% 100%, 34% 0%,
      50% 80%, 66% 0%, 82% 100%, 95% 0%, 100% 50%
    );
  }
  .v5-topbar-tab-glyph { font-size: 15px; line-height: 1; }
  .v5-topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
    flex-shrink: 0;
    border-left: 1px solid;
    transition: border-color 0.5s ease;
  }

  /* ── INSTRUMENT GRID ── */
  .v5-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 230px 1fr 230px;
    grid-template-rows: 1fr 1fr 1fr;
    gap: 10px;
    padding: 12px 14px 14px 14px;
    position: relative;
    z-index: 10;
    min-height: 0;
  }

  /* Center focal core spans all 3 rows of the middle column */
  .v5-core {
    grid-column: 2;
    grid-row: 1 / 4;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  /* Satellite slots */
  .v5-sat-tl { grid-column: 1; grid-row: 1; }
  .v5-sat-l  { grid-column: 1; grid-row: 2; }
  .v5-sat-bl { grid-column: 1; grid-row: 3; }
  .v5-sat-tr { grid-column: 3; grid-row: 1; }
  .v5-sat-r  { grid-column: 3; grid-row: 2; }
  /* Bottom-right is Kitsu's reserved zone */
  .v5-sat-br { grid-column: 3; grid-row: 3; }

  /* Every satellite child panel fills the cell */
  .v5-sat-tl > div,
  .v5-sat-l  > div,
  .v5-sat-bl > div,
  .v5-sat-tr > div,
  .v5-sat-r  > div {
    height: 100%;
    overflow: hidden;
  }

  /* ── Focal core clock (V3 drama) ── */
  .v5-clock {
    font-family: 'DM Sans', monospace;
    font-size: clamp(44px, 6vw, 68px);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
    line-height: 1;
    text-align: center;
  }
  .v5-greeting {
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(15px, 2vw, 22px);
    font-weight: 700;
    margin-top: 8px;
    text-align: center;
  }
  .v5-core-ring {
    position: absolute;
    inset: -22px;
    border-radius: 50%;
    pointer-events: none;
    z-index: -1;
  }

  /* ── V2-legibility: generous vital cells ── */
  .v5-vital-cell {
    padding: 10px 12px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .v5-vital-val {
    font-family: 'DM Sans', monospace;
    font-size: 22px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .v5-vital-lbl {
    font-family: 'Noto Serif JP', serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-top: 4px;
  }

  /* ── Progress bar ── */
  .v5-prog-track {
    height: 5px;
    border-radius: 3px;
    overflow: hidden;
    margin: 6px 0 10px;
  }
  .v5-prog-fill {
    height: 100%;
    border-radius: 3px;
    width: 62%;
  }

  /* ── Session dot ── */
  .v5-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ── EQ bar ── */
  .v5-eq-bar {
    width: 3px;
    border-radius: 1.5px;
    transform-origin: bottom;
    animation: v5-eq var(--v5-eq-dur, 0.9s) ease-in-out infinite alternate;
  }

  /* ── Band section label (V2 style) ── */
  .v5-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-family: 'Noto Serif JP', serif;
    margin-bottom: 10px;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  @media (max-width: 960px) {
    .v5-grid {
      grid-template-columns: 190px 1fr 190px;
    }
  }
  @media (max-width: 700px) {
    .v5-topbar-tab-glyph-label { display: none; }
  }
`;

/* ── Radial seam lines from center to each satellite ── */
function RadialSeams({
  gold,
  goldBright,
}: {
  gold: string;
  goldBright: string;
}) {
  const rays = [
    { x1: 50, y1: 50, x2: 14, y2: 12 },
    { x1: 50, y1: 50, x2: 50, y2: 3 },
    { x1: 50, y1: 50, x2: 86, y2: 12 },
    { x1: 50, y1: 50, x2: 3, y2: 50 },
    { x1: 50, y1: 50, x2: 97, y2: 50 },
    { x1: 50, y1: 50, x2: 14, y2: 88 },
    { x1: 50, y1: 50, x2: 50, y2: 97 },
    { x1: 50, y1: 50, x2: 82, y2: 88 },
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
        <linearGradient id="v5-ray-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={goldBright} stopOpacity="0.60" />
          <stop offset="50%" stopColor={gold} stopOpacity="0.32" />
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
          stroke={`url(#v5-ray-grad)`}
          strokeWidth="0.18"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 1px ${gold}66)` }}
        />
      ))}
    </svg>
  );
}

/* ── Satellite panel label (compact serif header) ── */
function SatLabel({
  children,
  gold,
  right,
}: {
  children: React.ReactNode;
  gold: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="v5-label" style={{ color: gold }}>
      <span>{children}</span>
      {right && (
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
          }}
        >
          {right}
        </span>
      )}
    </div>
  );
}

/* ── Satellite: Vitals (top-left) — V2 generous cell sizing ── */
function SatVitals({ tk }: { tk: TK }) {
  return (
    <WashiPanel tk={tk} style={{ height: "100%", padding: "14px 14px" }}>
      <SatLabel
        gold={tk.gold}
        right={<span style={{ color: tk.textMuted }}>WHOOP LIVE</span>}
      >
        Vitals
      </SatLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {VITALS.map((v) => (
          <div
            key={v.lbl}
            className="v5-vital-cell"
            style={{
              background: `${tk.accent}0a`,
              border: `1px solid ${tk.panelBorder}`,
            }}
          >
            <div className="v5-vital-val" style={{ color: tk.foxfire }}>
              {v.val}
              <span
                style={{ fontSize: 11, color: tk.textMuted, marginLeft: 2 }}
              >
                {v.unit}
              </span>
            </div>
            <div className="v5-vital-lbl" style={{ color: tk.textMuted }}>
              {v.lbl}
            </div>
          </div>
        ))}
      </div>
    </WashiPanel>
  );
}

/* ── Satellite: Now Playing (left-mid) ── */
function SatNowPlaying({ tk }: { tk: TK }) {
  return (
    <WashiPanel tk={tk} style={{ height: "100%", padding: "14px 14px" }}>
      <SatLabel gold={tk.gold}>Now Playing</SatLabel>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${tk.accent}30, ${tk.foxfire}20)`,
            border: `1.5px solid ${tk.panelBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          ♪
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: tk.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            One Summer&apos;s Day
          </div>
          <div style={{ fontSize: 13, color: tk.textMuted, marginTop: 2 }}>
            Joe Hisaishi
          </div>
        </div>
      </div>
      <div
        style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 18 }}
        aria-label="Playing"
      >
        {[0.55, 1, 0.7, 0.88, 0.45, 0.65, 0.8].map((h, i) => (
          <div
            key={i}
            className="v5-eq-bar"
            style={{
              height: 16 * h,
              background: `linear-gradient(180deg, ${tk.foxfireGlow}, ${tk.accent})`,
              ["--v5-eq-dur" as string]: `${0.55 + i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </WashiPanel>
  );
}

/* ── Satellite: Inbox (bottom-left) ── */
function SatInbox({ tk }: { tk: TK }) {
  return (
    <WashiPanel tk={tk} style={{ height: "100%", padding: "14px 14px" }}>
      <SatLabel
        gold={tk.gold}
        right={<span style={{ color: tk.foxfire }}>{INBOX.length} UNREAD</span>}
      >
        Inbox
      </SatLabel>
      {INBOX.slice(0, 3).map((msg, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            paddingBottom: 7,
            borderBottom: i < 2 ? `1px solid ${tk.divider}` : "none",
            marginBottom: i < 2 ? 7 : 0,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
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
                gap: 5,
                marginBottom: 2,
              }}
            >
              <span
                style={{ fontSize: 15, fontWeight: 600, color: tk.textPrimary }}
              >
                {msg.name}
              </span>
              {msg.urgent && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
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
                fontSize: 12,
                color: tk.textMuted,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {msg.preview}
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              color: tk.textMuted,
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {msg.ago}
          </span>
        </div>
      ))}
    </WashiPanel>
  );
}

/* ── Satellite: Calendar (top-right) ── */
function SatCalendar({ tk }: { tk: TK }) {
  return (
    <WashiPanel tk={tk} style={{ height: "100%", padding: "14px 14px" }}>
      <SatLabel
        gold={tk.gold}
        right={
          <span style={{ color: tk.textMuted }}>
            {CALENDAR_EVENTS.length} EVENTS
          </span>
        }
      >
        Today
      </SatLabel>
      {CALENDAR_EVENTS.map((ev, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            padding: "7px 0",
            borderBottom:
              i < CALENDAR_EVENTS.length - 1
                ? `1px solid ${tk.divider}`
                : "none",
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: tk.textMuted,
              fontVariantNumeric: "tabular-nums",
              fontFamily: "'DM Sans', monospace",
              flexShrink: 0,
              minWidth: 38,
            }}
          >
            {ev.time}
          </span>
          <span
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: 500,
              color: tk.textSub,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {ev.title}
          </span>
          <span style={{ fontSize: 12, color: tk.textMuted, flexShrink: 0 }}>
            {ev.duration}
          </span>
        </div>
      ))}
    </WashiPanel>
  );
}

/* ── Satellite: Active Project (right-mid) ── */
function SatProject({ tk }: { tk: TK }) {
  return (
    <WashiPanel tk={tk} style={{ height: "100%", padding: "14px 14px" }}>
      <SatLabel
        gold={tk.gold}
        right={<span style={{ color: tk.foxfire }}>62%</span>}
      >
        Active Project
      </SatLabel>
      <div
        style={{
          fontFamily: "'Noto Serif JP', serif",
          fontSize: 15,
          fontWeight: 700,
          color: tk.textPrimary,
          marginBottom: 2,
        }}
      >
        Hero&apos;s Chronicle · <em style={{ color: tk.foxfire }}>v1.0</em>
      </div>
      <div
        style={{
          fontSize: 11,
          color: tk.textMuted,
          letterSpacing: "0.07em",
          marginBottom: 8,
        }}
      >
        DUE OCT 2
      </div>
      <div className="v5-prog-track" style={{ background: `${tk.accent}14` }}>
        <div
          className="v5-prog-fill"
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
            gap: 8,
            paddingBottom: 4,
            fontSize: 14,
            fontWeight: c.done ? 400 : 500,
            color: c.done ? tk.textMuted : tk.textSub,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
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

/* ── Satellite: Crew / Sessions + Agents (left-bottom) ── */
function SatCrew({ tk }: { tk: TK }) {
  const liveCount = SESSIONS.filter((s) => s.running).length;
  return (
    <WashiPanel tk={tk} style={{ height: "100%", padding: "14px 14px" }}>
      <SatLabel
        gold={tk.gold}
        right={<span style={{ color: "#34D399" }}>{liveCount} LIVE</span>}
      >
        Crew
      </SatLabel>
      {SESSIONS.map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingBottom: 6,
            borderBottom: `1px solid ${tk.divider}`,
            marginBottom: 6,
          }}
        >
          <div
            className="v5-dot"
            style={{
              background: s.running ? "#34D399" : tk.textMuted,
              boxShadow: s.running ? "0 0 5px #34D39966" : "none",
            }}
          />
          <span
            style={{
              flex: 1,
              fontSize: 14,
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
                fontSize: 11,
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
          <span style={{ fontSize: 11, color: tk.textMuted, flexShrink: 0 }}>
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
            gap: 8,
            paddingBottom: i < 1 ? 6 : 0,
            borderBottom: i < 1 ? `1px solid ${tk.divider}` : "none",
            marginBottom: i < 1 ? 6 : 0,
          }}
        >
          <div
            className="v5-dot"
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
              fontSize: 12,
              color: a.ok ? tk.textSub : "#F87171",
              fontFamily: "'DM Sans', monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {a.name}
          </span>
          <span style={{ fontSize: 11, color: tk.textMuted, flexShrink: 0 }}>
            {a.ago}
          </span>
        </div>
      ))}
    </WashiPanel>
  );
}

/* ── Operator identity strip (renders inside focal core, above clock) ── */
function OperatorStrip({ tk }: { tk: TK }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        flexWrap: "wrap",
        marginBottom: 10,
        width: "100%",
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
            style={{ fontSize: 13, color: tk.textPrimary, fontWeight: 600 }}
          >
            {kv.v}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── CTAs row below focal core ── */
function CTARow({ tk }: { tk: TK }) {
  return (
    <div
      style={{
        width: "100%",
        marginTop: 12,
        display: "flex",
        gap: 10,
        justifyContent: "center",
      }}
    >
      <button
        type="button"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          borderRadius: 6,
          padding: "10px 24px",
          fontSize: 15,
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
          padding: "9px 18px",
          fontSize: 14,
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

/* ── Kitsu reserved zone (bottom-right satellite) ── */
function KitsuZone({ tk }: { tk: TK }) {
  return (
    <div
      style={{
        height: "100%",
        borderRadius: 8,
        border: `1px dashed ${tk.panelBorder}`,
        background: `${tk.panelBg}`,
        opacity: 0.35,
        /* intentionally ghost-transparent to let Kitsu overlay without collision */
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V5Hybrid
───────────────────────────────────────────────────────────────────────── */

export default function V5Hybrid() {
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

  const kintsugiVars = {
    "--v5-kintsugi-start": tk.gold,
    "--v5-kintsugi-peak": tk.goldBright,
  } as React.CSSProperties;

  return (
    <>
      <style>{EMAKI_CSS}</style>
      <style>{V5_CSS}</style>
      <style>{EQ_CSS}</style>

      <div
        className="v5-root"
        style={{
          background: tk.bg,
          transition: "background 0.6s ease",
          ["--hero-halo" as string]: tk.heroHalo,
          ["--panel-blur" as string]: phase === "day" ? "none" : "blur(10px)",
          ...kintsugiVars,
        }}
      >
        {/* World painting layers */}
        <PaintedBackdrop phase={phase} />
        <FoxfireLayer phase={phase} />

        {/* Radial kintsugi seam lines from center to each satellite */}
        <RadialSeams gold={tk.gold} goldBright={tk.goldBright} />

        {/* ── TOP BAR (V2 full-width broadsheet style) ── */}
        <nav
          className="v5-topbar"
          aria-label="Primary navigation"
          style={{
            background: tk.railBg,
            borderBottom: `1px solid ${tk.railBorder}`,
          }}
        >
          {/* Wordmark */}
          <div
            className="v5-topbar-wordmark"
            style={{ color: tk.goldBright, borderColor: tk.railBorder }}
          >
            PG OS
          </div>

          {/* Glyph + label tabs */}
          <div className="v5-topbar-tabs" role="tablist">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                className="v5-topbar-tab"
                role="tab"
                tabIndex={0}
                aria-pressed={item.active}
                aria-selected={item.active}
                type="button"
                style={{
                  background: item.active ? tk.pillActive : "transparent",
                  color: item.active ? tk.foxfire : tk.textMuted,
                }}
              >
                <span className="v5-topbar-tab-glyph">{item.glyph}</span>
                <span className="v5-topbar-tab-glyph-label">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Phase toggle — lives in right actions zone of the topbar */}
          <div
            className="v5-topbar-actions"
            style={{ borderColor: tk.railBorder }}
          >
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
                    padding: "4px 9px",
                    fontSize: 12,
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
          </div>
        </nav>

        {/* ── INSTRUMENT GRID (V3 layout, V2 legibility) ── */}
        <div className="v5-grid">
          {/* LEFT COLUMN */}
          <div className="v5-sat-tl">
            <SatVitals tk={tk} />
          </div>
          <div className="v5-sat-l">
            <SatNowPlaying tk={tk} />
          </div>
          <div className="v5-sat-bl">
            <SatInbox tk={tk} />
          </div>

          {/* CENTER: focal core (V3 drama) */}
          <div className="v5-core">
            {/* Kitsu foxfire halo behind the core */}
            <div
              className="v5-core-ring"
              style={{
                background: `radial-gradient(ellipse at 50% 50%, ${tk.foxfireGlow}18 0%, ${tk.orbGlow}10 40%, transparent 70%)`,
                boxShadow: `0 0 70px ${tk.foxfireGlow}22`,
                borderRadius: "50%",
              }}
            />

            {/* Operator identity pills above core */}
            <OperatorStrip tk={tk} />

            {/* Main focal panel */}
            <WashiPanel
              tk={tk}
              style={{
                width: "100%",
                padding: "30px 32px",
                textAlign: "center",
                position: "relative",
                border: `1.5px solid ${tk.panelInkBorder}`,
                boxShadow: `0 0 40px ${tk.foxfireGlow}18, inset 0 0 0 1px ${tk.panelInkBorder}33`,
              }}
            >
              {/* Phase eyebrow */}
              <div
                style={{
                  fontSize: 12,
                  color: tk.eyebrowText,
                  fontWeight: 600,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                  textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                }}
              >
                {tk.eyebrowLabel}
              </div>

              {/* Live clock */}
              <div
                className="v5-clock"
                style={{
                  color: tk.foxfire,
                  textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                }}
              >
                {clockStr}
              </div>

              {/* Greeting */}
              <div
                className="v5-greeting"
                style={{
                  color: tk.textPrimary,
                  textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                }}
              >
                {greeting} Patrick.
              </div>

              {/* Date */}
              <div
                style={{
                  fontSize: 13,
                  color: tk.textMuted,
                  marginTop: 6,
                  letterSpacing: "0.06em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {dateLine}
              </div>

              {/* Kintsugi gold divider */}
              <div style={{ marginTop: 18, marginBottom: 14 }}>
                <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />
              </div>

              {/* Kanji + motto */}
              <div
                style={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontSize: "clamp(20px, 3vw, 28px)",
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
                  fontSize: 14,
                  color: tk.accent,
                  marginTop: 5,
                  textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                }}
              >
                {tk.subtitle}
              </div>

              {/* Kitsu at the helm label */}
              <div
                style={{
                  marginTop: 18,
                  fontSize: 11,
                  color: tk.textMuted,
                  letterSpacing: "0.14em",
                  fontWeight: 600,
                  opacity: 0.7,
                }}
              >
                KITSU AT THE HELM
              </div>
            </WashiPanel>

            {/* CTAs below core */}
            <CTARow tk={tk} />
          </div>

          {/* RIGHT COLUMN */}
          <div className="v5-sat-tr">
            <SatCalendar tk={tk} />
          </div>
          <div className="v5-sat-r">
            <SatProject tk={tk} />
          </div>
          {/* Bottom-right: reserved clear zone for Kitsu / MarvisCorner */}
          <div className="v5-sat-br">
            <KitsuZone tk={tk} />
          </div>
        </div>

        {/* Kitsu — anchored bottom-right, sits over the reserved ghost cell */}
        <MarvisCorner modelUrl="/live2d/fox/standard_fox.model3.json" />
      </div>
    </>
  );
}
