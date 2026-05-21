"use client";

import React, { useState, useEffect } from "react";
import { MarvisCorner } from "../../_components/views/cockpit/MarvisCorner";
import { PHASES, Phase, phaseForHour } from "../../_components/emaki/theme";
import {
  EMAKI_CSS,
  useEmakiVars,
  PaintedBackdrop,
  FoxfireLayer,
  KintsugiSeam,
  WashiPanel,
  GlyphSun,
  GlyphDusk,
  GlyphMoon,
} from "../../_components/emaki/materials";

/* ─────────────────────────────────────────────────────────────────────────────
   Home tab redesign — Emaki x Laputa direction (COMPOSITIONAL RETHINK v2)
   Full-canvas bento grid. Panels vary in size and character. The kintsugi
   seams thread THROUGH the layout, painting and UI woven as one scene.

   SECTIONS (clean sequential):
     1. Hero / Clock + Greeting      (wide hero, sky-spanning)
     2. Operator Status               (tall left panel)
     3. Vitals                        (tall right panel, 4-stat tower)
     4. Calendar                      (wide, 2-col span)
     5. Active Project                (wide, progress + checklist)
     6. Crew / Sessions + Agents      (medium 2-up)
     7. Inbox                         (medium 2-up)
     8. Now Playing                   (compact, left)
     9. Capture CTA                   (compact, right)
─────────────────────────────────────────────────────────────────────────────── */

/* ── Mock data ── */
const DOW = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];
const MON = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

function liveDatestamp() {
  const d = new Date();
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return `${DOW[d.getDay()]} · ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · DAY ${dayOfYear} OF 365`;
}

function liveGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning,";
  if (h < 18) return "afternoon,";
  return "evening,";
}

const VITALS = [
  { val: "84", lbl: "Recovery", unit: "%", color: "#34D399" },
  { val: "62", lbl: "HRV", unit: "ms", color: "#60A5FA" },
  { val: "8.4", lbl: "Strain", unit: "/21", color: "#F59E0B" },
  { val: "6,240", lbl: "Steps", unit: "", color: "#A78BFA" },
];

const CALENDAR_EVENTS = [
  {
    time: "09:00",
    title: "Metrasens — GTM sync",
    duration: "30m",
    tag: "work",
  },
  { time: "12:00", title: "HC design review", duration: "1h", tag: "project" },
  {
    time: "15:30",
    title: "Coffee · Maya Lin",
    duration: "45m",
    tag: "personal",
  },
];

const PROJECT_CHECKS = [
  { done: true, label: "Design system + 5-tab architecture" },
  { done: true, label: "Supabase + Whoop API wiring" },
  { done: true, label: "Vercel deploy · PWA" },
  { done: false, label: "iMessage integration · chat.db polling" },
  { done: false, label: "Login + onboarding variant selection" },
  { done: false, label: "Rive avatar wiring to UI" },
];

const SESSIONS = [
  {
    project: "personal-os",
    status: "running" as const,
    lastActivity: "3m",
    tool: "Edit",
  },
  {
    project: "heros-chronicle",
    status: "idle" as const,
    lastActivity: "18m",
    tool: null,
  },
];

const AGENTS = [
  { name: "session-review", lastRun: "1h", status: "ok" as const },
  { name: "morning-briefing", lastRun: "6h", status: "ok" as const },
  { name: "weekly-meta-audit", lastRun: "2d", status: "error" as const },
];

const INBOX = [
  {
    initials: "ML",
    name: "Maya Lin",
    preview: "Re: HC v2.7 scope — need your sign-off today",
    time: "12M",
    urgent: true,
  },
  {
    initials: "TH",
    name: "Theo Harris",
    preview: "Moved our sync · new calendar invite attached",
    time: "48M",
    urgent: false,
  },
  {
    initials: "EN",
    name: "Eliza N.",
    preview: "Dinner Saturday still on? Booked a table",
    time: "2H",
    urgent: false,
  },
  {
    initials: "AC",
    name: "Anthropic Labs",
    preview: "Claude Design research preview · welcome packet",
    time: "5H",
    urgent: false,
  },
];

const NAV_ITEMS = [
  { label: "Home", glyph: "⌂", active: true },
  { label: "Habits", glyph: "◎", active: false },
  { label: "Projects", glyph: "⬡", active: false },
  { label: "Flow", glyph: "∿", active: false },
  { label: "Claude", glyph: "✦", active: false },
];

/* ─────────────────────────────────────────────────────────────────────────────
   LOCAL CSS: full-canvas bento grid + panel character classes
─────────────────────────────────────────────────────────────────────────────── */
const LOCAL_CSS = `
  /* ── Root canvas extension: fill the full viewport width ── */
  .el-main {
    max-width: none !important;
    padding: 24px 20px 100px 20px !important;
    width: 100%;
  }

  /* ── Bento grid: 12-column fluid backbone ── */
  .bento {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-auto-rows: auto;
    gap: 10px;
    width: 100%;
  }

  /* Column span helpers */
  .b-12  { grid-column: span 12; }
  .b-8   { grid-column: span 8;  }
  .b-7   { grid-column: span 7;  }
  .b-6   { grid-column: span 6;  }
  .b-5   { grid-column: span 5;  }
  .b-4   { grid-column: span 4;  }
  .b-3   { grid-column: span 3;  }

  /* Row span helpers */
  .br-2  { grid-row: span 2; }

  @media (max-width: 900px) {
    .b-8, .b-7, .b-5 { grid-column: span 12; }
    .b-4  { grid-column: span 6;  }
    .b-3  { grid-column: span 6;  }
    .b-6  { grid-column: span 12; }
    .br-2 { grid-row: span 1; }
  }
  @media (max-width: 600px) {
    .b-12, .b-8, .b-7, .b-6, .b-5, .b-4, .b-3 { grid-column: span 12; }
    .br-2 { grid-row: span 1; }
  }

  /* ── Hero panel: kanji + clock spanning large ── */
  .panel-hero {
    min-height: 148px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  }
  /* Hero: extra painted brushstroke texture top-right */
  .panel-hero::before {
    content: '';
    position: absolute;
    top: -10px; right: -10px;
    width: 160px; height: 160px;
    border-radius: 50%;
    background: radial-gradient(ellipse at 70% 30%, var(--hero-halo-color, rgba(232,168,48,0.10)) 0%, transparent 65%);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Operator panel: tall left ── */
  .panel-operator {
    min-height: 260px;
  }

  /* ── Vitals panel: tower of 4 ── */
  .panel-vitals {
    min-height: 260px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ── Calendar: wide, ink-ruled rows ── */
  .panel-cal {
    min-height: 130px;
  }

  /* ── Project: wide accent panel, kintsugi brushed border ── */
  .panel-project {
    min-height: 180px;
    position: relative;
  }
  /* Extra kintsugi fracture along right edge */
  .panel-project::after {
    content: '' !important;
    position: absolute !important;
    top: 0 !important; bottom: 0 !important; right: 0 !important;
    width: 2px !important;
    background: linear-gradient(180deg, transparent 0%, var(--kintsugi-gold, rgba(200,152,28,0.7)) 30%, var(--kintsugi-bright, rgba(240,192,64,0.9)) 50%, var(--kintsugi-gold, rgba(200,152,28,0.7)) 70%, transparent 100%) !important;
    clip-path: polygon(0% 0%, 100% 4%, 60% 18%, 100% 35%, 40% 52%, 100% 68%, 55% 82%, 100% 96%, 0% 100%) !important;
    pointer-events: none !important;
  }

  /* ── Sessions / inbox: paired compact panels ── */
  .panel-crew {
    min-height: 160px;
  }
  .panel-inbox {
    min-height: 160px;
  }

  /* ── Now playing: cozy small ── */
  .panel-np {
    min-height: 80px;
  }

  /* ── Capture: foxfire-accented action panel ── */
  .panel-capture {
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  /* ── Kintsugi seam row: threads through the bento ── */
  .bento-seam {
    grid-column: 1 / -1;
    padding: 4px 0;
    position: relative;
  }
  /* Seam has a faint vertical "crack" extending up/down to connect to panels above/below */
  .bento-seam::before,
  .bento-seam::after {
    content: '';
    position: absolute;
    left: 50%;
    width: 2px;
    transform: translateX(-50%);
    pointer-events: none;
    opacity: 0.35;
  }
  .bento-seam::before {
    bottom: 100%; height: 8px;
    background: linear-gradient(180deg, transparent, var(--kintsugi-gold, rgba(200,152,28,0.9)));
  }
  .bento-seam::after {
    top: 100%; height: 8px;
    background: linear-gradient(180deg, var(--kintsugi-gold, rgba(200,152,28,0.9)), transparent);
  }

  /* ── Vitals stat cell ── */
  .vital-cell {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
  }
  .vital-cell + .vital-cell {
    border-top: 1px solid;
  }

  /* ── Calendar row ── */
  .cal-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 8px 0;
  }
  .cal-row + .cal-row {
    border-top: 1px solid;
  }

  /* ── Session / agent row ── */
  .crew-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 0;
    font-size: 15px;
    font-weight: 500;
  }
  .crew-row + .crew-row {
    border-top: 1px solid;
  }
  .crew-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ── Inbox row ── */
  .inbox-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 0;
  }
  .inbox-row + .inbox-row {
    border-top: 1px solid;
  }
  .inbox-av {
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    flex-shrink: 0;
  }
  .inbox-urgent {
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.08em;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(248,113,113,0.18);
    border: 1px solid rgba(248,113,113,0.38);
    color: #F87171;
    margin-left: 5px;
    vertical-align: middle;
  }

  /* ── Now playing equalizer ── */
  .np-eq {
    display: flex; align-items: flex-end;
    gap: 3px; height: 16px; flex-shrink: 0;
  }
  .np-bar {
    width: 3px; border-radius: 1.5px;
    animation: np-pulse var(--bar-dur, 0.9s) ease-in-out infinite alternate;
  }
  @keyframes np-pulse {
    from { transform: scaleY(0.3); }
    to   { transform: scaleY(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .np-bar { animation: none; }
  }

  /* ── Progress bar ── */
  .proj-bar-track {
    height: 4px; border-radius: 2px;
    overflow: hidden; margin: 8px 0 12px;
  }
  .proj-bar-fill {
    height: 100%; border-radius: 2px; width: 62%;
  }

  /* ── Operator KV grid ── */
  .op-kv {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 14px;
    margin-top: 10px;
  }
  .op-kv-pair { display: flex; flex-direction: column; gap: 1px; }
  .op-kv-k {
    font-size: 11px; font-weight: 700; letter-spacing: 0.10em;
    text-transform: uppercase;
    font-family: 'Noto Serif JP', serif;
  }
  .op-kv-v { font-size: 15px; font-weight: 600; }

  /* ── Panel character: painted/ink edge variants ── */

  /* Tall panels: extra ink-shadow depth on left */
  .panel-inked-left::before {
    width: 3.5px !important;
    top: 5% !important; height: 90% !important;
  }

  /* Wide accent panel: extra top-edge kintsugi brightness */
  .panel-bold-seam::after {
    height: 2px !important;
    opacity: 1 !important;
  }

  /* Capture panel: foxfire outer glow ring */
  .panel-foxfire-ring {
    position: relative;
  }
  .panel-foxfire-ring::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 9px;
    background: transparent;
    border: 1px solid var(--foxfire-ring, rgba(240,192,96,0.28));
    pointer-events: none;
    z-index: -1;
  }

  /* ── Check rows ── */
  .check-row {
    display: flex; align-items: center; gap: 9px;
    padding: 5px 0; font-size: 15px; font-weight: 500; line-height: 1.4;
  }
  .check-box {
    width: 13px; height: 13px; border-radius: 3px; border: 1.5px solid;
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    font-size: 8px;
  }

  /* ── Avatar row ── */
  .avatar-row {
    display: flex; align-items: center; gap: 12px; margin-bottom: 2px;
  }
  .avatar {
    width: 42px; height: 42px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; font-weight: 800; flex-shrink: 0;
  }
  .online-pip {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.10em;
    padding: 2px 8px; border-radius: 20px;
    margin-top: 7px; margin-bottom: 2px;
  }
  .online-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #34D399; flex-shrink: 0;
  }
`;

/* ── Painting connective tissue: inter-panel KintsugiSeam variants ── */

/** A thin gold filament crossing the full bento row between row-groups */
function BentoSeam({ gold, goldBright }: { gold: string; goldBright: string }) {
  return (
    <div className="bento-seam">
      <KintsugiSeam gold={gold} goldBright={goldBright} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page component
─────────────────────────────────────────────────────────────────────────────── */

export default function HomeEmaki() {
  const [phase, setPhase] = useState<Phase>("night");
  const [clockStr, setClockStr] = useState("");
  const [datestamp, setDatestamp] = useState("");
  const [greeting, setGreeting] = useState("");
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
      setDatestamp(liveDatestamp());
      setGreeting(liveGreeting());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* CSS vars for the seam connectors via inline style on root */
  const bentoVars = {
    ["--kintsugi-gold" as string]: tk.gold + "aa",
    ["--kintsugi-bright" as string]: tk.goldBright + "cc",
    ["--foxfire-ring" as string]: tk.foxfire + "38",
    ["--hero-halo-color" as string]: tk.foxfire + "18",
  } as React.CSSProperties;

  return (
    <>
      <style>{EMAKI_CSS}</style>
      <style>{LOCAL_CSS}</style>

      <div
        className="el-root"
        style={{
          background: tk.bg,
          transition: "background 0.6s ease",
          ["--hero-halo" as string]: tk.heroHalo,
          ["--panel-blur" as string]: phase === "day" ? "none" : "blur(10px)",
        }}
      >
        {/* World painting layers */}
        <PaintedBackdrop phase={phase} />

        {/* Drifting orbs + petals */}
        <FoxfireLayer phase={phase} />

        {/* Left nav rail */}
        <nav
          className="el-rail"
          aria-label="Primary navigation"
          style={{
            background: tk.railBg,
            borderRight: `1px solid ${tk.railBorder}`,
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <div className="el-wordmark" style={{ color: tk.goldBright }}>
            PG OS
          </div>
          <div className="el-nav-items">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className="el-nav-item"
                role="button"
                tabIndex={0}
                title={item.label}
                aria-pressed={item.active}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    e.currentTarget.click();
                }}
                style={{
                  background: item.active ? tk.pillActive : "transparent",
                  border: item.active
                    ? `1px solid ${tk.accentDim}`
                    : "1px solid transparent",
                  position: "relative",
                }}
              >
                {item.active && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: 22,
                      borderRadius: "0 2px 2px 0",
                      background: `linear-gradient(180deg, ${tk.foxfireGlow}, ${tk.accent})`,
                      boxShadow: `0 0 8px ${tk.orbGlow}`,
                    }}
                  />
                )}
                <span
                  className="el-nav-glyph"
                  style={{ color: item.active ? tk.foxfire : tk.textMuted }}
                >
                  {item.glyph}
                </span>
                <span
                  className="el-nav-label"
                  style={{ color: item.active ? tk.accent : tk.textMuted }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </nav>

        {/* ── MAIN CANVAS ── */}
        <main className="el-main" style={bentoVars}>
          {/* Eyebrow + kanji above grid */}
          <p
            className="el-eyebrow"
            style={{ color: tk.eyebrowText, marginBottom: 8 }}
          >
            {tk.eyebrowLabel}
          </p>

          <div className="bento">
            {/* ══════════════════════════════════════════════════════════════
                ROW 1: Hero wide (8 cols) + Vitals tower (4 cols, 2 rows tall)
            ══════════════════════════════════════════════════════════════ */}

            {/* 1. Hero / Greeting — wide */}
            <WashiPanel
              tk={tk}
              className="b-8 panel-hero panel-bold-seam"
              style={{ minHeight: 148 }}
            >
              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div>
                    <h1
                      className="el-h1-kanji"
                      style={{
                        color: tk.textPrimary,
                        fontSize: "clamp(22px, 3.5vw, 38px)",
                        marginBottom: 2,
                      }}
                    >
                      {tk.kanji}
                    </h1>
                    <p
                      className="el-h1-sub"
                      style={{ color: tk.accent, margin: 0 }}
                    >
                      {tk.subtitle}
                    </p>
                  </div>
                  {/* Clock */}
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "'DM Sans', monospace",
                        fontSize: "clamp(26px, 4.5vw, 44px)",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        color: tk.foxfire,
                        textShadow:
                          tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                        lineHeight: 1,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {clockStr || "00:00:00"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: tk.textMuted,
                        marginTop: 3,
                        letterSpacing: "0.05em",
                      }}
                    >
                      UTC -05:00 · CDT · LOCAL TIME
                    </div>
                  </div>
                </div>
                {/* Greeting + datestamp */}
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: `1px solid ${tk.divider}`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Noto Serif JP', serif",
                      fontSize: 18,
                      fontWeight: 700,
                      color: tk.textPrimary,
                      textShadow:
                        tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                    }}
                  >
                    Good {greeting} Patrick.
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: tk.textMuted,
                      marginTop: 3,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {datestamp}
                  </div>
                </div>
              </div>
            </WashiPanel>

            {/* 3. Vitals — tall right column, spans 2 rows */}
            <WashiPanel
              tk={tk}
              inkColor={tk.foxfire}
              className="b-4 br-2 panel-vitals panel-inked-left"
            >
              <div className="el-panel-label" style={{ color: tk.gold }}>
                03 // VITALS
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                }}
              >
                {VITALS.map((v) => (
                  <div
                    key={v.lbl}
                    className="vital-cell"
                    style={{ borderColor: tk.divider }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: tk.textSub,
                      }}
                    >
                      {v.lbl}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: v.color,
                          fontFamily: "'DM Sans', monospace",
                          textShadow:
                            phase !== "day"
                              ? `0 0 10px ${v.color}55`
                              : undefined,
                        }}
                      >
                        {v.val}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: tk.textMuted,
                          marginLeft: 2,
                        }}
                      >
                        {v.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 10,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: `${tk.accent}10`,
                  border: `1px solid ${tk.accent}22`,
                  fontSize: 12,
                  color: tk.textMuted,
                  letterSpacing: "0.04em",
                }}
              >
                WHOOP · LIVE · PING 18MS
              </div>
            </WashiPanel>

            {/* ══════════════════════════════════════════════════════════════
                ROW 2: Operator (8 cols, same row as vitals row-2)
            ══════════════════════════════════════════════════════════════ */}

            {/* 2. Operator — spans 8 cols, paired with vitals row-2 */}
            <WashiPanel tk={tk} className="b-8 panel-operator panel-inked-left">
              <div className="el-panel-label" style={{ color: tk.gold }}>
                01 // OPERATOR
              </div>
              <div className="avatar-row">
                <div
                  className="avatar"
                  style={{
                    background: `linear-gradient(135deg, ${tk.accent}30, ${tk.gold}20)`,
                    border: `1.5px solid ${tk.panelInkBorder}`,
                    color: tk.foxfire,
                  }}
                >
                  PG
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Noto Serif JP', serif",
                      fontSize: 19,
                      fontWeight: 700,
                      lineHeight: 1.15,
                      color: tk.textPrimary,
                    }}
                  >
                    Patrick <em>Smith</em>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginTop: 2,
                      color: tk.textMuted,
                    }}
                  >
                    GTM ENGINEER · CHICAGO
                  </div>
                </div>
              </div>
              <div
                className="online-pip"
                style={{
                  background: "rgba(52,211,153,0.12)",
                  border: "1px solid rgba(52,211,153,0.28)",
                  color: "#34D399",
                }}
              >
                <span className="online-dot" />
                ONLINE
              </div>
              <div className="op-kv">
                {[
                  { k: "FOCUS", v: "DEEP WORK" },
                  { k: "STATUS", v: "DND" },
                  { k: "RANK", v: "A · TIER III" },
                  { k: "STREAK", v: "29 DAYS" },
                ].map((kv) => (
                  <div key={kv.k} className="op-kv-pair">
                    <span className="op-kv-k" style={{ color: tk.textMuted }}>
                      {kv.k}
                    </span>
                    <span className="op-kv-v" style={{ color: tk.textPrimary }}>
                      {kv.v}
                    </span>
                  </div>
                ))}
              </div>
            </WashiPanel>

            {/* ══════════════════════════════════════════════════════════════
                SEAM between operator row and calendar row
            ══════════════════════════════════════════════════════════════ */}
            <BentoSeam gold={tk.gold} goldBright={tk.goldBright} />

            {/* ══════════════════════════════════════════════════════════════
                ROW 3: Calendar (7 cols) + Active Project (5 cols)
            ══════════════════════════════════════════════════════════════ */}

            {/* 4. Calendar */}
            <WashiPanel tk={tk} className="b-7 panel-cal">
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div
                  className="el-panel-label"
                  style={{ color: tk.gold, marginBottom: 0 }}
                >
                  04 // CALENDAR
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: tk.textMuted,
                    fontFamily: "'Noto Serif JP', serif",
                  }}
                >
                  {new Date()
                    .toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                    .toUpperCase()}
                </span>
              </div>
              {CALENDAR_EVENTS.map((ev, i) => (
                <div
                  key={i}
                  className="cal-row"
                  style={{ borderColor: tk.divider }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontVariantNumeric: "tabular-nums",
                      fontFamily: "'DM Sans', monospace",
                      minWidth: 38,
                      flexShrink: 0,
                      color: tk.textMuted,
                    }}
                  >
                    {ev.time}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: 500,
                      lineHeight: 1.4,
                      color: tk.textSub,
                    }}
                  >
                    {ev.title}
                  </span>
                  <span
                    style={{ fontSize: 12, flexShrink: 0, color: tk.textMuted }}
                  >
                    {ev.duration}
                  </span>
                </div>
              ))}
            </WashiPanel>

            {/* 5. Active Project */}
            <WashiPanel
              tk={tk}
              inkColor={tk.accent}
              className="b-5 panel-project"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 8,
                }}
              >
                <div
                  className="el-panel-label"
                  style={{ color: tk.gold, marginBottom: 0 }}
                >
                  05 // PROJECT
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: tk.accent,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                  }}
                >
                  DUE OCT 2
                </span>
              </div>
              <div
                style={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontSize: 17,
                  fontWeight: 700,
                  color: tk.textPrimary,
                  marginBottom: 1,
                }}
              >
                {"Hero's Chronicle · "}
                <em style={{ color: tk.foxfire }}>v1.0</em>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: tk.textMuted,
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                {"PG'S 30TH · LIFE GAMIFICATION APP"}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontSize: 12,
                  color: tk.textMuted,
                  marginBottom: 2,
                }}
              >
                <span>PROGRESS</span>
                <span
                  style={{
                    color: tk.foxfire,
                    fontWeight: 700,
                    fontSize: 15,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  62%
                </span>
              </div>
              <div
                className="proj-bar-track"
                style={{ background: `${tk.accent}14` }}
              >
                <div
                  className="proj-bar-fill"
                  style={{
                    background: `linear-gradient(90deg, ${tk.foxfireGlow}, ${tk.accent})`,
                    boxShadow: `0 0 6px ${tk.orbGlow}`,
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {PROJECT_CHECKS.slice(0, 4).map((c, i) => (
                  <div
                    key={i}
                    className="check-row"
                    style={{ color: c.done ? tk.textMuted : tk.textSub }}
                  >
                    <div
                      className="check-box"
                      style={{
                        borderColor: c.done ? tk.accentDim : tk.panelBorder,
                        background: c.done ? `${tk.accent}20` : "transparent",
                        color: tk.foxfire,
                      }}
                    >
                      {c.done && "✓"}
                    </div>
                    <span
                      style={{
                        textDecoration: c.done ? "line-through" : "none",
                        opacity: c.done ? 0.55 : 1,
                        fontWeight: c.done ? 400 : 500,
                        fontSize: 14,
                      }}
                    >
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </WashiPanel>

            {/* ══════════════════════════════════════════════════════════════
                SEAM between calendar row and crew/inbox row
            ══════════════════════════════════════════════════════════════ */}
            <BentoSeam gold={tk.gold} goldBright={tk.goldBright} />

            {/* ══════════════════════════════════════════════════════════════
                ROW 4: Crew (6 cols) + Inbox (6 cols)
            ══════════════════════════════════════════════════════════════ */}

            {/* 6. Crew / Sessions + Agents */}
            <WashiPanel tk={tk} className="b-6 panel-crew">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 12,
                }}
              >
                <div
                  className="el-panel-label"
                  style={{ color: tk.gold, marginBottom: 0 }}
                >
                  06 // CREW
                </div>
                <span
                  style={{ fontSize: 12, color: "#34D399", fontWeight: 700 }}
                >
                  {SESSIONS.filter((s) => s.status === "running").length}
                  &#x25CF; LIVE
                </span>
              </div>
              {SESSIONS.map((s, i) => (
                <div
                  key={i}
                  className="crew-row"
                  style={{ borderColor: tk.divider }}
                >
                  <div
                    className="crew-dot"
                    style={{
                      background:
                        s.status === "running" ? "#34D399" : tk.textMuted,
                      boxShadow:
                        s.status === "running" ? "0 0 6px #34D39966" : "none",
                    }}
                  />
                  <span style={{ flex: 1, color: tk.textPrimary }}>
                    ⏵ {s.project}
                  </span>
                  {s.tool && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: `${tk.accent}14`,
                        border: `1px solid ${tk.accent}24`,
                        color: tk.textMuted,
                        fontFamily: "'DM Sans', monospace",
                      }}
                    >
                      {s.tool}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 12,
                      fontVariantNumeric: "tabular-nums",
                      color: tk.textMuted,
                    }}
                  >
                    {s.lastActivity}
                  </span>
                </div>
              ))}
              <div style={{ height: 8 }} />
              {AGENTS.map((a, i) => (
                <div
                  key={i}
                  className="crew-row"
                  style={{ borderColor: tk.divider }}
                >
                  <div
                    className="crew-dot"
                    style={{
                      background: a.status === "ok" ? tk.foxfire : "#F87171",
                      boxShadow:
                        a.status === "ok"
                          ? `0 0 5px ${tk.orbGlow}`
                          : "0 0 5px rgba(248,113,113,0.4)",
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      color: a.status === "ok" ? tk.textSub : "#F87171",
                      fontFamily: "'DM Sans', monospace",
                      fontSize: 13,
                    }}
                  >
                    {a.name}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontVariantNumeric: "tabular-nums",
                      color: tk.textMuted,
                    }}
                  >
                    {a.lastRun}
                  </span>
                </div>
              ))}
            </WashiPanel>

            {/* 7. Inbox */}
            <WashiPanel
              tk={tk}
              inkColor={tk.accent}
              className="b-6 panel-inbox"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 12,
                }}
              >
                <div
                  className="el-panel-label"
                  style={{ color: tk.gold, marginBottom: 0 }}
                >
                  07 // INBOX
                </div>
                <span
                  style={{ fontSize: 12, color: tk.foxfire, fontWeight: 700 }}
                >
                  4 UNREAD
                </span>
              </div>
              {INBOX.map((msg, i) => (
                <div
                  key={i}
                  className="inbox-row"
                  style={{ borderColor: tk.divider }}
                >
                  <div
                    className="inbox-av"
                    style={{
                      background: `${tk.accent}20`,
                      border: `1.5px solid ${tk.panelBorder}`,
                      color: tk.foxfire,
                    }}
                  >
                    {msg.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: tk.textPrimary,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {msg.name}
                      {msg.urgent && (
                        <span className="inbox-urgent">URGENT</span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 400,
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
                      fontSize: 12,
                      color: tk.textMuted,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {msg.time}
                  </span>
                </div>
              ))}
            </WashiPanel>

            {/* ══════════════════════════════════════════════════════════════
                SEAM between inbox row and bottom row
            ══════════════════════════════════════════════════════════════ */}
            <BentoSeam gold={tk.gold} goldBright={tk.goldBright} />

            {/* ══════════════════════════════════════════════════════════════
                ROW 5: Now Playing (4 cols) + Capture CTA (4 cols) + Remaining checks (4 cols)
            ══════════════════════════════════════════════════════════════ */}

            {/* 8. Now Playing */}
            <WashiPanel tk={tk} className="b-4 panel-np">
              <div
                className="el-panel-label"
                style={{ color: tk.gold, marginBottom: 10 }}
              >
                08 // NOW PLAYING
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 6,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `linear-gradient(135deg, ${tk.accent}30, ${tk.foxfire}20)`,
                    border: `1.5px solid ${tk.panelBorder}`,
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
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: tk.textPrimary,
                    }}
                  >
                    One Summer&apos;s Day
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      marginTop: 2,
                      color: tk.textMuted,
                    }}
                  >
                    Joe Hisaishi
                  </div>
                </div>
                <div className="np-eq" aria-label="Now playing">
                  {[0.6, 1, 0.75, 0.9, 0.5].map((h, i) => (
                    <div
                      key={i}
                      className="np-bar"
                      style={{
                        height: 16 * h,
                        background: `linear-gradient(180deg, ${tk.foxfireGlow}, ${tk.accent})`,
                        ["--bar-dur" as string]: `${0.6 + i * 0.12}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </WashiPanel>

            {/* 9. Capture CTA */}
            <WashiPanel
              tk={tk}
              inkColor={tk.foxfire}
              className="b-4 panel-capture panel-foxfire-ring"
              style={{
                border: `1px solid ${tk.panelBorder}`,
                boxShadow:
                  phase !== "day"
                    ? `0 0 18px ${tk.orbGlow}, inset 0 0 0 0.5px ${tk.panelInkBorder}33`
                    : undefined,
              }}
            >
              <button
                className="el-cta"
                type="button"
                style={{
                  background: tk.ctaBg,
                  borderColor: tk.ctaBorder,
                  color: tk.ctaText,
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                + Capture
              </button>
              <button
                className="el-cta"
                type="button"
                style={{
                  background: "transparent",
                  borderColor: tk.divider,
                  color: tk.textMuted,
                  fontSize: 14,
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                New session →
              </button>
            </WashiPanel>

            {/* Remaining project checks (overflow from project panel) */}
            <WashiPanel tk={tk} className="b-4">
              <div className="el-panel-label" style={{ color: tk.gold }}>
                UPCOMING
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {PROJECT_CHECKS.slice(3).map((c, i) => (
                  <div
                    key={i}
                    className="check-row"
                    style={{ color: c.done ? tk.textMuted : tk.textSub }}
                  >
                    <div
                      className="check-box"
                      style={{
                        borderColor: c.done ? tk.accentDim : tk.panelBorder,
                        background: c.done ? `${tk.accent}20` : "transparent",
                        color: tk.foxfire,
                      }}
                    >
                      {c.done && "✓"}
                    </div>
                    <span
                      style={{
                        textDecoration: c.done ? "line-through" : "none",
                        opacity: c.done ? 0.55 : 1,
                        fontWeight: c.done ? 400 : 500,
                        fontSize: 14,
                      }}
                    >
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </WashiPanel>
          </div>
          {/* /bento */}

          <div style={{ height: 60 }} />
        </main>

        {/* Phase toggle */}
        <div
          className="el-toggle"
          style={{
            background: tk.toggleBg,
            borderColor: tk.divider,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {(["day", "twilight", "night"] as Phase[]).map((p) => (
            <button
              key={p}
              className="el-toggle-btn"
              type="button"
              onClick={() => setPhase(p)}
              aria-pressed={phase === p}
              style={{
                background: phase === p ? PHASES[p].pillActive : "transparent",
                color:
                  phase === p ? PHASES[p].pillTextActive : tk.pillTextInactive,
              }}
            >
              {p === "day" ? (
                <GlyphSun
                  color={
                    phase === p ? PHASES[p].pillTextActive : tk.pillTextInactive
                  }
                />
              ) : p === "twilight" ? (
                <GlyphDusk
                  color={
                    phase === p ? PHASES[p].pillTextActive : tk.pillTextInactive
                  }
                />
              ) : (
                <GlyphMoon
                  color={
                    phase === p ? PHASES[p].pillTextActive : tk.pillTextInactive
                  }
                />
              )}
              {PHASES[p].phaseName}
            </button>
          ))}
        </div>

        {/* Kitsu */}
        <MarvisCorner modelUrl="/live2d/fox/standard_fox.model3.json" />
      </div>
    </>
  );
}
