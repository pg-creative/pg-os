"use client";

/**
 * V4 Editorial — "Inhabit the Painting"
 *
 * A vertical emaki scroll. The painted world is the dominant surface.
 * Content arrives as sparse, atmospheric ink-insets as you scroll down:
 * generous breathing room between stations, one idea at a time.
 * This is the FALSIFIER variant: deliberately the opposite of a dense dashboard.
 *
 * Scroll stations (top to bottom):
 *   0. Painted opening — kanji title, clock, greeting centered on the sky
 *   1. [seam] Operator — slim horizontal card, left-rail portrait style
 *   2. [vast painted gap with foxfire orbs]
 *   3. [seam] Vitals — four glanceable numbers, nothing more
 *   4. [vast painted gap]
 *   5. [seam] Calendar — 3 events, clean time-slot typography
 *   6. [vast painted gap]
 *   7. [seam] Active Project (HC v1.0) — progress + 3 checklist lines
 *   8. [vast painted gap]
 *   9. [seam] Crew + Now Playing — two slim inline items
 *  10. [vast painted gap]
 *  11. [seam] Inbox + Capture — 3 messages + CTA, final station
 *
 * Navigation: a single ultra-slim vertical strip on the far left, barely visible.
 * Phase toggle: top-right as always.
 */

import React, { useState, useEffect, useRef } from "react";
import { PHASES, Phase, phaseForHour } from "../../../_components/emaki/theme";
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
} from "../../../_components/emaki/materials";
import { MarvisCorner } from "../../../_components/views/cockpit/MarvisCorner";

/* ── Mock data (same as reference page) ── */

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
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

const VITALS = [
  { val: "84", lbl: "Recovery", unit: "%" },
  { val: "62", lbl: "HRV", unit: "ms" },
  { val: "8.4", lbl: "Strain", unit: "/21" },
  { val: "6,240", lbl: "Steps", unit: "" },
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
];

const AGENTS = [
  { name: "session-review", lastRun: "1h", status: "ok" as const },
  { name: "morning-briefing", lastRun: "6h", status: "ok" as const },
  { name: "weekly-meta-audit", lastRun: "2d", status: "error" as const },
];

const NAV_ITEMS = [
  { label: "Home", glyph: "⌂", active: true },
  { label: "Habits", glyph: "◎", active: false },
  { label: "Projects", glyph: "⬡", active: false },
  { label: "Flow", glyph: "∿", active: false },
  { label: "Claude", glyph: "✦", active: false },
];

/* ── Editorial-specific CSS ── */
const EDITORIAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

  /* Editorial root: the scroll IS the experience */
  .v4-root {
    position: relative;
    width: 100%;
    min-height: 100vh;
    display: flex;
    font-family: 'DM Sans', sans-serif;
    overflow-x: hidden;
  }

  /* Ultra-slim left nav: 36px, barely there */
  .v4-rail {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 36px;
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 18px 0 18px;
    gap: 0;
    transition: background 0.5s ease, border-color 0.5s ease;
  }
  .v4-rail-wordmark {
    font-family: 'Noto Serif JP', serif;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    user-select: none;
    margin-bottom: 16px;
    opacity: 0.55;
    transition: color 0.5s ease;
  }
  .v4-nav-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    margin: 5px 0;
    transition: background 0.3s, box-shadow 0.3s;
    cursor: pointer;
  }
  .v4-nav-dot:focus-visible {
    outline: 1px solid currentColor;
    outline-offset: 3px;
  }

  /* The scroll canvas: starts at left edge of where rail ends */
  .v4-scroll {
    margin-left: 36px;
    width: calc(100% - 36px);
    position: relative;
    z-index: 10;
  }

  /* Opening hero: full viewport height, centered, painting is everything */
  .v4-hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px 32px 80px;
    position: relative;
  }

  /* Each painted gap between stations: tall, mostly just painting */
  .v4-breathing-gap {
    min-height: 38vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    pointer-events: none;
  }
  /* Faint kanji watermark in the breathing gap */
  .v4-gap-kanji {
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(64px, 12vw, 120px);
    font-weight: 300;
    opacity: 0.05;
    user-select: none;
    pointer-events: none;
    letter-spacing: -0.02em;
  }

  /* Each content station: centered column, maxed at 580px */
  .v4-station {
    max-width: 580px;
    margin: 0 auto;
    padding: 0 24px 0;
    position: relative;
  }

  /* Station label: the tiny eyebrow above each panel */
  .v4-station-label {
    font-family: 'Noto Serif JP', serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.20em;
    text-transform: uppercase;
    margin-bottom: 12px;
    transition: color 0.5s ease;
    text-align: center;
  }

  /* Hero clock: oversized, breathing */
  .v4-hero-clock {
    font-family: 'DM Sans', monospace;
    font-size: clamp(52px, 10vw, 88px);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.03em;
    line-height: 1;
    margin-bottom: 8px;
    transition: color 0.5s ease, text-shadow 0.5s ease;
  }
  .v4-hero-greeting {
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(18px, 3vw, 28px);
    font-weight: 400;
    line-height: 1.3;
    margin-bottom: 6px;
    transition: color 0.5s ease, text-shadow 0.5s ease;
  }
  .v4-hero-datestamp {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.55;
    margin-bottom: 20px;
    transition: color 0.5s ease;
  }
  .v4-hero-kanji {
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(32px, 6vw, 56px);
    font-weight: 700;
    line-height: 1.1;
    margin-bottom: 6px;
    transition: color 0.5s ease, text-shadow 0.5s ease;
  }
  .v4-hero-subtitle {
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(13px, 2vw, 18px);
    font-weight: 400;
    letter-spacing: 0.06em;
    opacity: 0.72;
    transition: color 0.5s ease;
  }
  .v4-hero-scroll-hint {
    position: absolute;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    opacity: 0.35;
    animation: v4-hint-bob 2.4s ease-in-out infinite;
  }
  .v4-hint-line {
    width: 1px;
    height: 28px;
    border-radius: 1px;
  }
  .v4-hint-text {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-family: 'Noto Serif JP', serif;
  }
  @keyframes v4-hint-bob {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50%       { transform: translateX(-50%) translateY(6px); }
  }

  /* Operator station: horizontal, portrait-style strip */
  .v4-operator-strip {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .v4-op-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 800;
    flex-shrink: 0;
    transition: background 0.5s, border-color 0.5s, color 0.5s;
  }
  .v4-op-name {
    font-family: 'Noto Serif JP', serif;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
    transition: color 0.5s;
  }
  .v4-op-meta {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-top: 2px;
    transition: color 0.5s;
  }
  .v4-op-pills {
    margin-left: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .v4-op-pill {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.10em;
    padding: 3px 10px;
    border-radius: 20px;
    transition: background 0.4s, border-color 0.4s, color 0.4s;
  }

  /* Vitals: 4 large numbers in a row */
  .v4-vitals-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
  }
  @media (max-width: 520px) {
    .v4-vitals-row { grid-template-columns: repeat(2, 1fr); }
  }
  .v4-vital-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 8px;
    gap: 4px;
  }
  .v4-vital-val {
    font-family: 'DM Sans', monospace;
    font-size: clamp(24px, 4vw, 36px);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    transition: color 0.5s;
  }
  .v4-vital-unit {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.6;
  }
  .v4-vital-lbl {
    font-family: 'Noto Serif JP', serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: color 0.5s;
  }

  /* Calendar: clean time-event strip */
  .v4-cal-event {
    display: grid;
    grid-template-columns: 44px 1fr 36px;
    align-items: center;
    gap: 14px;
    padding: 12px 0;
    transition: border-color 0.4s;
  }
  .v4-cal-event + .v4-cal-event {
    border-top: 1px solid;
  }
  .v4-cal-time {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    font-family: 'DM Sans', monospace;
    text-align: right;
    transition: color 0.5s;
  }
  .v4-cal-title {
    font-size: 16px;
    font-weight: 500;
    line-height: 1.4;
    transition: color 0.5s;
  }
  .v4-cal-dur {
    font-size: 12px;
    text-align: right;
    transition: color 0.5s;
  }

  /* Project station */
  .v4-project-name {
    font-family: 'Noto Serif JP', serif;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 2px;
    transition: color 0.5s;
  }
  .v4-project-sub {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-bottom: 14px;
    transition: color 0.5s;
  }
  .v4-progress-track {
    height: 3px;
    border-radius: 2px;
    overflow: hidden;
    margin: 8px 0 14px;
    transition: background 0.4s;
  }
  .v4-progress-fill {
    height: 100%;
    border-radius: 2px;
    width: 62%;
    transition: background 0.4s;
  }
  .v4-check-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    font-size: 15px;
    font-weight: 500;
    line-height: 1.4;
    transition: color 0.5s;
  }
  .v4-check-box {
    width: 13px;
    height: 13px;
    border-radius: 3px;
    border: 1.5px solid;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    transition: background 0.4s, border-color 0.4s, color 0.4s;
  }

  /* Crew station: slim rows */
  .v4-crew-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
    transition: border-color 0.4s;
  }
  .v4-crew-row + .v4-crew-row {
    border-top: 1px solid;
  }
  .v4-crew-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .v4-crew-name {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
    transition: color 0.5s;
  }
  .v4-crew-time {
    font-size: 12px;
    transition: color 0.5s;
  }

  /* Now playing: horizontal compact */
  .v4-np-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .v4-np-art {
    width: 44px;
    height: 44px;
    border-radius: 5px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    transition: background 0.5s, border-color 0.5s;
  }
  .v4-np-info { flex: 1; min-width: 0; }
  .v4-np-track {
    font-size: 15px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.5s;
  }
  .v4-np-artist {
    font-size: 13px;
    margin-top: 2px;
    transition: color 0.5s;
  }
  .v4-np-eq {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 16px;
    flex-shrink: 0;
  }
  .v4-np-bar {
    width: 3px;
    border-radius: 1.5px;
    animation: v4-pulse var(--bar-dur, 0.9s) ease-in-out infinite alternate;
  }
  @keyframes v4-pulse {
    from { transform: scaleY(0.3); }
    to   { transform: scaleY(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .v4-np-bar { animation: none; }
    .v4-hero-scroll-hint { animation: none; }
  }

  /* Inbox: avatar + preview */
  .v4-inbox-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 0;
    transition: border-color 0.4s;
  }
  .v4-inbox-row + .v4-inbox-row {
    border-top: 1px solid;
  }
  .v4-inbox-av {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
    transition: background 0.4s, border-color 0.4s, color 0.4s;
  }
  .v4-inbox-body { flex: 1; min-width: 0; }
  .v4-inbox-name {
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
    transition: color 0.5s;
  }
  .v4-inbox-preview {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.5s;
  }
  .v4-inbox-time {
    font-size: 12px;
    flex-shrink: 0;
    margin-top: 2px;
    transition: color 0.5s;
  }
  .v4-urgent-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(248,113,113,0.18);
    border: 1px solid rgba(248,113,113,0.40);
    color: #F87171;
  }

  /* CTA station: centered */
  .v4-cta-station {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 0 24px 0;
  }
  .v4-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 6px;
    padding: 13px 36px;
    font-size: 15px;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.06em;
    cursor: pointer;
    border: 1px solid;
    transition: background 0.2s, box-shadow 0.2s, border-color 0.2s, color 0.2s;
  }
  .v4-cta:hover { filter: brightness(1.08); }
  .v4-cta:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
  .v4-cta-sec {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    cursor: pointer;
    border: none;
    background: transparent;
    text-decoration: none;
    padding: 4px 0;
    transition: color 0.3s;
  }
  .v4-cta-sec:hover { opacity: 0.8; }

  /* Phase toggle */
  .v4-toggle {
    position: fixed;
    top: 14px;
    right: 16px;
    z-index: 200;
    display: flex;
    border-radius: 8px;
    border: 1px solid;
    gap: 2px;
    padding: 3px;
    transition: background 0.4s ease, border-color 0.4s ease;
    max-width: calc(100vw - 80px);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .v4-toggle-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.05em;
    cursor: pointer;
    border: none;
    background: transparent;
    border-radius: 5px;
    white-space: nowrap;
    transition: background 0.2s, color 0.2s;
  }
  .v4-toggle-btn:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }

  /* Section divider between Crew and NowPlaying within same panel */
  .v4-inline-divider {
    height: 1px;
    margin: 14px 0;
    border: none;
    transition: background 0.4s;
  }
`;

/* ── Component ── */

export default function V4Editorial() {
  const [phase, setPhase] = useState<Phase>("night");
  const [clockStr, setClockStr] = useState("");
  const [datestamp, setDatestamp] = useState("");
  const [greeting, setGreeting] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const tk = PHASES[phase];

  useEmakiVars(phase, rootRef as React.RefObject<HTMLElement>);

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

  return (
    <>
      <style>{EMAKI_CSS}</style>
      <style>{EDITORIAL_CSS}</style>

      <div
        ref={rootRef}
        className="v4-root"
        style={{
          background: tk.bg,
          transition: "background 0.6s ease",
          ["--hero-halo" as string]: tk.heroHalo,
          ["--panel-blur" as string]: phase === "day" ? "none" : "blur(10px)",
        }}
      >
        {/* World painting — full page backdrop */}
        <PaintedBackdrop phase={phase} />
        <FoxfireLayer phase={phase} />

        {/* Ultra-slim fixed rail */}
        <nav
          className="v4-rail"
          aria-label="Primary navigation"
          style={{
            background: tk.railBg,
            borderRight: `1px solid ${tk.railBorder}40`,
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <span className="v4-rail-wordmark" style={{ color: tk.goldBright }}>
            PG
          </span>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className="v4-nav-dot"
              role="button"
              tabIndex={0}
              title={item.label}
              aria-label={item.label}
              aria-pressed={item.active}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") e.currentTarget.click();
              }}
              style={{
                background: item.active ? tk.foxfire : `${tk.textMuted}44`,
                boxShadow: item.active ? `0 0 8px ${tk.orbGlow}` : "none",
              }}
            />
          ))}
        </nav>

        {/* Scroll canvas */}
        <div className="v4-scroll">
          {/* ══ STATION 0: Hero Opening ══ */}
          <section className="v4-hero" aria-label="Clock and greeting">
            {/* Kanji title — large, painted, text directly on sky */}
            <div
              className="v4-hero-kanji"
              style={{
                color: tk.textPrimary,
                textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
              }}
            >
              {tk.kanji}
            </div>
            <div
              className="v4-hero-subtitle"
              style={{
                color: tk.accent,
                textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
              }}
            >
              {tk.subtitle}
            </div>

            {/* Breathing gap before clock */}
            <div style={{ height: "clamp(24px, 6vh, 52px)" }} />

            {/* The clock: the grand opening number */}
            <div
              className="v4-hero-clock"
              style={{
                color: tk.foxfire,
                textShadow:
                  tk.heroHalo !== "none"
                    ? `${tk.heroHalo}, 0 0 40px ${tk.orbGlow}`
                    : `0 0 40px ${tk.orbGlow}`,
              }}
            >
              {clockStr || "00:00:00"}
            </div>

            {/* Greeting: intimate, serif */}
            <div
              className="v4-hero-greeting"
              style={{
                color: tk.textPrimary,
                textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
              }}
            >
              Good {greeting || "morning"}, Patrick.
            </div>
            <div className="v4-hero-datestamp" style={{ color: tk.textMuted }}>
              {datestamp}
            </div>

            {/* Phase eyebrow — floats in the sky */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: tk.eyebrowText,
                textShadow: tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                opacity: 0.8,
              }}
            >
              {tk.eyebrowLabel}
            </div>

            {/* Scroll hint */}
            <div className="v4-hero-scroll-hint">
              <div
                className="v4-hint-line"
                style={{ background: tk.textMuted }}
              />
              <span className="v4-hint-text" style={{ color: tk.textMuted }}>
                scroll
              </span>
            </div>
          </section>

          {/* ══ PAINTED GAP: vast open sky ══ */}
          <div className="v4-breathing-gap">
            <span className="v4-gap-kanji" style={{ color: tk.textPrimary }}>
              操
            </span>
          </div>

          {/* ══ STATION 1: Operator ══ */}
          <div className="v4-station">
            <div className="v4-station-label" style={{ color: tk.gold }}>
              Operator
            </div>
            <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />
            <div style={{ height: 14 }} />
            <WashiPanel tk={tk}>
              <div className="v4-operator-strip">
                <div
                  className="v4-op-avatar"
                  style={{
                    background: `linear-gradient(135deg, ${tk.accent}30, ${tk.gold}20)`,
                    border: `1.5px solid ${tk.panelInkBorder}`,
                    color: tk.foxfire,
                  }}
                >
                  PG
                </div>
                <div>
                  <div className="v4-op-name" style={{ color: tk.textPrimary }}>
                    Patrick <em>Smith</em>
                  </div>
                  <div className="v4-op-meta" style={{ color: tk.textMuted }}>
                    GTM Engineer · Chicago
                  </div>
                </div>
                <div className="v4-op-pills">
                  {[
                    { k: "FOCUS", v: "DEEP WORK" },
                    { k: "STREAK", v: "29 DAYS" },
                    { k: "RANK", v: "A · TIER III" },
                  ].map((kv) => (
                    <span
                      key={kv.k}
                      className="v4-op-pill"
                      style={{
                        background: `${tk.accent}12`,
                        border: `1px solid ${tk.panelBorder}`,
                        color: tk.textSub,
                      }}
                    >
                      {kv.k}: {kv.v}
                    </span>
                  ))}
                </div>
              </div>
            </WashiPanel>
          </div>

          {/* ══ PAINTED GAP ══ */}
          <div className="v4-breathing-gap">
            <span className="v4-gap-kanji" style={{ color: tk.textPrimary }}>
              生
            </span>
          </div>

          {/* ══ STATION 2: Vitals ══ */}
          <div className="v4-station">
            <div className="v4-station-label" style={{ color: tk.gold }}>
              Vitals · Whoop Live
            </div>
            <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />
            <div style={{ height: 14 }} />
            <WashiPanel tk={tk} inkColor={tk.accent}>
              <div className="v4-vitals-row">
                {VITALS.map((v) => (
                  <div
                    key={v.lbl}
                    className="v4-vital-cell"
                    style={{ borderRight: `1px solid ${tk.divider}` }}
                  >
                    <span
                      className="v4-vital-val"
                      style={{ color: tk.foxfire }}
                    >
                      {v.val}
                      <span className="v4-vital-unit">{v.unit}</span>
                    </span>
                    <span
                      className="v4-vital-lbl"
                      style={{ color: tk.textMuted }}
                    >
                      {v.lbl}
                    </span>
                  </div>
                ))}
              </div>
            </WashiPanel>
          </div>

          {/* ══ PAINTED GAP ══ */}
          <div className="v4-breathing-gap">
            <span className="v4-gap-kanji" style={{ color: tk.textPrimary }}>
              時
            </span>
          </div>

          {/* ══ STATION 3: Calendar ══ */}
          <div className="v4-station">
            <div className="v4-station-label" style={{ color: tk.gold }}>
              {new Date()
                .toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
                .toUpperCase()}
            </div>
            <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />
            <div style={{ height: 14 }} />
            <WashiPanel tk={tk}>
              {CALENDAR_EVENTS.map((ev, i) => (
                <div
                  key={i}
                  className="v4-cal-event"
                  style={{ borderColor: tk.divider }}
                >
                  <span className="v4-cal-time" style={{ color: tk.textMuted }}>
                    {ev.time}
                  </span>
                  <span className="v4-cal-title" style={{ color: tk.textSub }}>
                    {ev.title}
                  </span>
                  <span className="v4-cal-dur" style={{ color: tk.textMuted }}>
                    {ev.duration}
                  </span>
                </div>
              ))}
            </WashiPanel>
          </div>

          {/* ══ PAINTED GAP ══ */}
          <div className="v4-breathing-gap">
            <span className="v4-gap-kanji" style={{ color: tk.textPrimary }}>
              quest
            </span>
          </div>

          {/* ══ STATION 4: Active Project ══ */}
          <div className="v4-station">
            <div className="v4-station-label" style={{ color: tk.gold }}>
              Active Quest
            </div>
            <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />
            <div style={{ height: 14 }} />
            <WashiPanel tk={tk}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 2,
                }}
              >
                <div
                  className="v4-project-name"
                  style={{ color: tk.textPrimary }}
                >
                  {"Hero's Chronicle · "}
                  <em style={{ color: tk.foxfire }}>v1.0</em>
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
              <div className="v4-project-sub" style={{ color: tk.textMuted }}>
                {"PG'S 30TH · LIFE GAMIFICATION APP"}
              </div>

              {/* Progress bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontSize: 13,
                  color: tk.textMuted,
                  marginBottom: 4,
                }}
              >
                <span>Progress</span>
                <span
                  style={{
                    color: tk.foxfire,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  62%
                </span>
              </div>
              <div
                className="v4-progress-track"
                style={{ background: `${tk.accent}14` }}
              >
                <div
                  className="v4-progress-fill"
                  style={{
                    background: `linear-gradient(90deg, ${tk.foxfireGlow}, ${tk.accent})`,
                    boxShadow: `0 0 6px ${tk.orbGlow}`,
                  }}
                />
              </div>

              {/* Checklist: only show 4 (not all 5, editorial restraint) */}
              {PROJECT_CHECKS.slice(0, 4).map((c, i) => (
                <div
                  key={i}
                  className="v4-check-row"
                  style={{ color: c.done ? tk.textMuted : tk.textSub }}
                >
                  <div
                    className="v4-check-box"
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
                    }}
                  >
                    {c.label}
                  </span>
                </div>
              ))}
            </WashiPanel>
          </div>

          {/* ══ PAINTED GAP ══ */}
          <div className="v4-breathing-gap">
            <span className="v4-gap-kanji" style={{ color: tk.textPrimary }}>
              隊
            </span>
          </div>

          {/* ══ STATION 5: Crew + Now Playing (combined, sparse) ══ */}
          <div className="v4-station">
            <div className="v4-station-label" style={{ color: tk.gold }}>
              Crew &amp; Sound
            </div>
            <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />
            <div style={{ height: 14 }} />
            <WashiPanel tk={tk}>
              {/* Live sessions + agents — slim rows */}
              {[
                {
                  name: "personal-os",
                  time: "3m",
                  dot: "#34D399",
                  glow: "#34D39966",
                  mono: false,
                },
                {
                  name: "heros-chronicle",
                  time: "18m",
                  dot: `${tk.textMuted}88`,
                  glow: "none",
                  mono: false,
                },
                ...AGENTS.map((a) => ({
                  name: a.name,
                  time: a.lastRun,
                  dot: a.status === "ok" ? tk.foxfire : "#F87171",
                  glow:
                    a.status === "ok"
                      ? `${tk.orbGlow}`
                      : "rgba(248,113,113,0.4)",
                  mono: true,
                })),
              ].map((row, i) => (
                <div
                  key={i}
                  className="v4-crew-row"
                  style={{ borderColor: tk.divider }}
                >
                  <div
                    className="v4-crew-dot"
                    style={{
                      background: row.dot,
                      boxShadow:
                        row.glow !== "none" ? `0 0 5px ${row.glow}` : "none",
                    }}
                  />
                  <span
                    className="v4-crew-name"
                    style={{
                      color: row.mono ? tk.textSub : tk.textPrimary,
                      fontFamily: row.mono ? "'DM Sans', monospace" : undefined,
                      fontSize: row.mono ? 13 : 15,
                    }}
                  >
                    {row.name}
                  </span>
                  <span
                    className="v4-crew-time"
                    style={{ color: tk.textMuted }}
                  >
                    {row.time}
                  </span>
                </div>
              ))}

              {/* Divider before now playing */}
              <hr
                className="v4-inline-divider"
                style={{ background: tk.divider }}
              />

              {/* Now playing */}
              <div className="v4-np-row">
                <div
                  className="v4-np-art"
                  style={{
                    background: `linear-gradient(135deg, ${tk.accent}30, ${tk.foxfire}20)`,
                    border: `1.5px solid ${tk.panelBorder}`,
                  }}
                >
                  ♪
                </div>
                <div className="v4-np-info">
                  <div
                    className="v4-np-track"
                    style={{ color: tk.textPrimary }}
                  >
                    One Summer&apos;s Day
                  </div>
                  <div className="v4-np-artist" style={{ color: tk.textMuted }}>
                    Joe Hisaishi
                  </div>
                </div>
                <div className="v4-np-eq" aria-label="Now playing">
                  {[0.6, 1, 0.75, 0.9, 0.5].map((h, i) => (
                    <div
                      key={i}
                      className="v4-np-bar"
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
          </div>

          {/* ══ PAINTED GAP ══ */}
          <div className="v4-breathing-gap">
            <span className="v4-gap-kanji" style={{ color: tk.textPrimary }}>
              文
            </span>
          </div>

          {/* ══ STATION 6: Inbox ══ */}
          <div className="v4-station">
            <div className="v4-station-label" style={{ color: tk.gold }}>
              Inbox · {INBOX.length} unread
            </div>
            <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />
            <div style={{ height: 14 }} />
            <WashiPanel tk={tk}>
              {INBOX.map((msg, i) => (
                <div
                  key={i}
                  className="v4-inbox-row"
                  style={{ borderColor: tk.divider }}
                >
                  <div
                    className="v4-inbox-av"
                    style={{
                      background: `${tk.accent}20`,
                      border: `1.5px solid ${tk.panelBorder}`,
                      color: tk.foxfire,
                    }}
                  >
                    {msg.initials}
                  </div>
                  <div className="v4-inbox-body">
                    <div
                      className="v4-inbox-name"
                      style={{ color: tk.textPrimary }}
                    >
                      {msg.name}
                      {msg.urgent && (
                        <span className="v4-urgent-badge">URGENT</span>
                      )}
                    </div>
                    <div
                      className="v4-inbox-preview"
                      style={{ color: tk.textMuted }}
                    >
                      {msg.preview}
                    </div>
                  </div>
                  <span
                    className="v4-inbox-time"
                    style={{ color: tk.textMuted }}
                  >
                    {msg.time}
                  </span>
                </div>
              ))}
            </WashiPanel>
          </div>

          {/* ══ FINAL PAINTED GAP — the scroll lands here ══ */}
          <div className="v4-breathing-gap" style={{ minHeight: "28vh" }}>
            <span className="v4-gap-kanji" style={{ color: tk.textPrimary }}>
              始
            </span>
          </div>

          {/* ══ STATION 7: Capture CTA — final station ══ */}
          <div className="v4-cta-station" style={{ paddingBottom: 80 }}>
            <div
              style={{
                fontFamily: "'Noto Serif JP', serif",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: tk.gold,
                opacity: 0.7,
                marginBottom: 16,
              }}
            >
              Begin
            </div>
            <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />
            <div style={{ height: 24 }} />
            <button
              className="v4-cta"
              type="button"
              style={{
                background: tk.ctaBg,
                borderColor: tk.ctaBorder,
                color: tk.ctaText,
              }}
            >
              + Capture
            </button>
            <button
              className="v4-cta-sec"
              type="button"
              style={{ color: tk.textMuted }}
            >
              New session →
            </button>
          </div>
        </div>
        {/* end scroll canvas */}

        {/* Phase toggle */}
        <div
          className="v4-toggle"
          style={{
            background: tk.toggleBg,
            borderColor: tk.divider,
          }}
        >
          {(["day", "twilight", "night"] as Phase[]).map((p) => (
            <button
              key={p}
              className="v4-toggle-btn"
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
