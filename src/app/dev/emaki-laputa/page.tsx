"use client";

import React, { useState, useEffect } from "react";
import { MarvisCorner } from "../../_components/views/cockpit/MarvisCorner";

/* ─────────────────────────────────────────────────────────────────────────────
   Emaki × Laputa — v2
   SOUL: Emaki painted world, foxfire, kodama orbs, kintsugi gold, Noto Serif JP
   BODY: Laputa crisp legibility — washi paper panels, DM Sans data, sleek rail

   3 phases: night (default) · twilight · day
   Each phase shifts the painted backdrop, palette, ambient particle hue,
   and reading-scrim strength. Data panels stay crisp across all three.
   v2 changes: amber foxfire night, deeper day contrast, balanced twilight,
               washi panels, overflow-safe SVG toggle, tightened composition.
───────────────────────────────────────────────────────────────────────────── */

type Phase = "night" | "twilight" | "day";

/* ─── Per-phase tokens ─── */
const PHASES: Record<
  Phase,
  {
    backdropImg: string;
    bg: string;
    railBg: string;
    railBorder: string;
    panelBg: string;
    panelBorder: string;
    panelInkBorder: string;
    panelTint: string;
    textPrimary: string;
    textSub: string;
    textMuted: string;
    accent: string;
    accentDim: string;
    gold: string;
    heroHalo: string;
    panelShadow: string;
    goldBright: string;
    foxfire: string;
    foxfireGlow: string;
    orbColor: string;
    orbGlow: string;
    divider: string;
    ctaBg: string;
    ctaBorder: string;
    ctaText: string;
    overlayGradient: string;
    ambientWash: string;
    eyebrow: string;
    eyebrowText: string;
    pillActive: string;
    pillInactive: string;
    pillTextActive: string;
    pillTextInactive: string;
    toggleBg: string;
    phaseName: string;
    eyebrowLabel: string;
    kanji: string;
    subtitle: string;
  }
> = {
  night: {
    backdropImg: "/art/aesthetic-2026-05-20/emaki-sky-night_0.png",
    /* Deep warm ink — not cold black */
    bg: "#0a0806",
    railBg: "rgba(12,9,7,0.94)",
    railBorder: "rgba(210,168,80,0.35)",
    /* Washi paper — warm dark amber tint */
    panelBg: "rgba(22,16,8,0.90)",
    panelBorder: "rgba(210,168,80,0.20)",
    panelInkBorder: "rgba(210,168,80,0.55)",
    panelTint: "rgba(180,130,40,0.04)",
    textPrimary: "#EFE4C8",
    textSub: "#B8A882",
    textMuted: "#B0A075",
    /* Accent = warm amber / foxfire gold — NOT teal */
    accent: "#E8A840",
    accentDim: "#A06C18",
    gold: "#C8981C",
    heroHalo: "0 0 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,1)",
    panelShadow: "none",
    goldBright: "#EFC040",
    foxfire: "#F0C060",
    foxfireGlow: "#E8A020",
    orbColor: "rgba(240,192,96,0.80)",
    orbGlow: "rgba(232,160,32,0.50)",
    divider: "rgba(210,168,80,0.22)",
    ctaBg: "rgba(232,168,64,0.10)",
    ctaBorder: "rgba(232,168,64,0.45)",
    ctaText: "#F0C060",
    overlayGradient:
      "linear-gradient(180deg, rgba(10,8,6,0.56) 0%, rgba(10,8,6,0.10) 30%, rgba(10,8,6,0.50) 72%, rgba(10,8,6,0.97) 100%)",
    ambientWash:
      "radial-gradient(ellipse at 28% 100%, rgba(232,168,48,0.12) 0%, transparent 60%), radial-gradient(ellipse at 72% 100%, rgba(200,152,28,0.08) 0%, transparent 55%)",
    eyebrow: "rgba(210,168,80,0.80)",
    eyebrowText: "#C8981C",
    pillActive: "rgba(232,168,64,0.18)",
    pillInactive: "rgba(12,9,7,0.5)",
    pillTextActive: "#F0C060",
    pillTextInactive: "#B0A075",
    toggleBg: "rgba(18,13,8,0.86)",
    phaseName: "Night",
    eyebrowLabel: "Late night · Kitsu watches the fleet by foxfire",
    kanji: "狐火の道",
    subtitle: "The Foxfire Path",
  },
  twilight: {
    backdropImg: "/art/aesthetic-2026-05-20/emaki-sky-twilight_0.png",
    /* Deeper indigo base — less gray/muddy than before */
    bg: "#0e0816",
    railBg: "rgba(18,10,26,0.92)",
    railBorder: "rgba(210,130,170,0.28)",
    /* Washi — subtle plum/rose tint */
    panelBg: "rgba(28,14,38,0.90)",
    panelBorder: "rgba(210,130,170,0.22)",
    panelInkBorder: "rgba(210,130,170,0.50)",
    panelTint: "rgba(160,80,130,0.04)",
    textPrimary: "#F4E8F8",
    textSub: "#C8A8D8",
    textMuted: "#C0A8D0",
    /* Cleaner rose — no muddy orange contamination */
    accent: "#E0A0D0",
    accentDim: "#A05888",
    gold: "#C88840",
    heroHalo: "0 0 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,1)",
    panelShadow: "none",
    goldBright: "#EAA050",
    foxfire: "#F0B0E0",
    foxfireGlow: "#E060C0",
    orbColor: "rgba(240,176,224,0.80)",
    orbGlow: "rgba(224,96,192,0.45)",
    divider: "rgba(200,136,64,0.22)",
    ctaBg: "rgba(224,160,208,0.08)",
    ctaBorder: "rgba(224,160,208,0.40)",
    ctaText: "#F0B0E0",
    overlayGradient:
      "linear-gradient(180deg, rgba(14,8,22,0.52) 0%, rgba(14,8,22,0.08) 30%, rgba(14,8,22,0.52) 72%, rgba(14,8,22,0.97) 100%)",
    ambientWash:
      "radial-gradient(ellipse at 32% 100%, rgba(224,96,192,0.11) 0%, transparent 60%), radial-gradient(ellipse at 68% 100%, rgba(200,136,64,0.10) 0%, transparent 55%)",
    eyebrow: "rgba(200,136,64,0.85)",
    eyebrowText: "#C88840",
    pillActive: "rgba(224,160,208,0.18)",
    pillInactive: "rgba(18,10,26,0.5)",
    pillTextActive: "#F0B0E0",
    pillTextInactive: "#C0A8D0",
    toggleBg: "rgba(22,12,32,0.86)",
    phaseName: "Twilight",
    eyebrowLabel: "Dusk settling · Kitsu tends the embers",
    kanji: "黄昏の刻",
    subtitle: "The Twilight Hour",
  },
  day: {
    backdropImg: "/art/aesthetic-2026-05-20/emaki-sky-day_0.png",
    /* Warm parchment base */
    bg: "#e8ddc8",
    railBg: "rgba(250,244,232,0.98)",
    railBorder: "rgba(140,100,30,0.40)",
    /* Crisp washi cards: nearly opaque, clearly-defined */
    panelBg: "rgba(252,248,240,0.97)",
    panelBorder: "rgba(140,100,30,0.38)",
    panelInkBorder: "rgba(110,72,12,0.70)",
    panelTint: "rgba(200,152,40,0.05)",
    /* Deep warm ink — aim 7:1+ on cream panel surface */
    textPrimary: "#120d04",
    textSub: "#2e2008",
    textMuted: "#4a3410",
    /* Richer emerald accent for real contrast on light bg */
    accent: "#1a5c3a",
    accentDim: "#0e3d24",
    gold: "#8c5c08",
    goldBright: "#b87818",
    foxfire: "#145830",
    foxfireGlow: "#0c4020",
    heroHalo: "none",
    panelShadow:
      "0 2px 12px rgba(120,80,10,0.14), 0 1px 4px rgba(120,80,10,0.10)",
    orbColor: "rgba(20,88,48,0.65)",
    orbGlow: "rgba(12,64,32,0.32)",
    divider: "rgba(140,92,12,0.28)",
    ctaBg: "rgba(20,88,48,0.12)",
    ctaBorder: "rgba(20,88,48,0.55)",
    ctaText: "#0a2e18",
    /* Golden-hour warmth wash + gentle edge vignette */
    overlayGradient:
      "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 38%, transparent 74%, rgba(96,124,156,0.18) 100%), radial-gradient(ellipse at 50% 108%, rgba(80,112,150,0.14) 0%, transparent 58%)",
    ambientWash: "none",
    eyebrow: "rgba(140,92,12,0.90)",
    eyebrowText: "#7a4c08",
    pillActive: "rgba(20,88,48,0.18)",
    pillInactive: "rgba(250,244,232,0.70)",
    pillTextActive: "#0e3d24",
    pillTextInactive: "#4a3410",
    toggleBg: "rgba(248,242,228,0.96)",
    phaseName: "Day",
    eyebrowLabel: "Golden hour · Kitsu rests in the sun",
    kanji: "陽光の庭",
    subtitle: "The Golden Garden",
  },
};

/* ─── Shared content ─── */
const NAV_ITEMS = [
  { label: "Home", active: true, glyph: "⌂" },
  { label: "Habits", active: false, glyph: "◎" },
  { label: "Projects", active: false, glyph: "⬡" },
  { label: "Flow", active: false, glyph: "∿" },
  { label: "Claude", active: false, glyph: "✦" },
];

const ACTIVITY = [
  {
    time: "09:58",
    msg: "legibility foundation shipped",
    diff: "+711 −0",
    positive: true,
  },
  {
    time: "09:24",
    msg: "party mode — Kitsu sings first",
    diff: "+180 −44",
    positive: true,
  },
  { time: "08:51", msg: "fox head reframed", diff: "+12 −9", positive: true },
];

/* Orb scatter — seeded for natural drift */
const ORBS = [
  { top: "11%", left: "17%", size: 7, dur: 7.2, delay: 0 },
  { top: "23%", left: "71%", size: 5, dur: 9.1, delay: 1.3 },
  { top: "37%", left: "43%", size: 9, dur: 6.4, delay: 2.6 },
  { top: "54%", left: "84%", size: 6, dur: 8.3, delay: 0.9 },
  { top: "66%", left: "27%", size: 4, dur: 10.2, delay: 3.2 },
  { top: "77%", left: "60%", size: 8, dur: 7.7, delay: 1.8 },
  { top: "14%", left: "54%", size: 5, dur: 8.8, delay: 4.1 },
  { top: "45%", left: "7%", size: 6, dur: 6.9, delay: 2.1 },
  { top: "31%", left: "91%", size: 4, dur: 9.4, delay: 0.6 },
  { top: "87%", left: "77%", size: 7, dur: 7.4, delay: 3.7 },
  { top: "5%", left: "34%", size: 5, dur: 11.1, delay: 1.1 },
  { top: "71%", left: "14%", size: 3, dur: 8.2, delay: 2.9 },
];

/* ─── Sakura petals (twilight only) ─── */
const PETALS = [
  { left: "8%", size: 6, dur: 8, delay: 0 },
  { left: "22%", size: 5, dur: 10, delay: 1.5 },
  { left: "41%", size: 7, dur: 7, delay: 3.0 },
  { left: "58%", size: 4, dur: 9, delay: 0.8 },
  { left: "74%", size: 6, dur: 11, delay: 2.2 },
  { left: "88%", size: 5, dur: 8.5, delay: 4.5 },
];

/* ── SVG phase glyphs — no emoji ── */
function GlyphSun({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <circle cx="6.5" cy="6.5" r="2.8" stroke={color} strokeWidth="1.5" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 6.5 + Math.cos(rad) * 4.2;
        const y1 = 6.5 + Math.sin(rad) * 4.2;
        const x2 = 6.5 + Math.cos(rad) * 5.8;
        const y2 = 6.5 + Math.sin(rad) * 5.8;
        return (
          <line
            key={a}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function GlyphDusk({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      {/* Half-circle horizon */}
      <path
        d="M1.5 9 A5 5 0 0 1 11.5 9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Ground line */}
      <line
        x1="0.5"
        y1="9"
        x2="12.5"
        y2="9"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Rays */}
      <line
        x1="6.5"
        y1="1"
        x2="6.5"
        y2="3"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <line
        x1="2.2"
        y1="3.5"
        x2="3.5"
        y2="4.8"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <line
        x1="10.8"
        y1="3.5"
        x2="9.5"
        y2="4.8"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GlyphMoon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <path
        d="M9.5 7.5 A4.5 4.5 0 1 1 5.5 2.8 A3.2 3.2 0 0 0 9.5 7.5 Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function EmakiLaputa() {
  const [phase, setPhase] = useState<Phase>("night");
  const tk = PHASES[phase];

  /* Auto-detect time of day on first render */
  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 6 && h < 18) setPhase("day");
    else if (h >= 18 && h < 21) setPhase("twilight");
    else setPhase("night");
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .el-root {
          position: relative;
          width: 100%;
          min-height: 100vh;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        }

        /* ── Painted world layers ── */
        .el-backdrop {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center top;
          transition: opacity 0.8s ease;
          pointer-events: none;
        }
        .el-backdrop-img {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center top;
          mix-blend-mode: normal;
          opacity: 0.72;
          pointer-events: none;
          transition: opacity 0.8s ease;
        }
        .el-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          transition: background 0.8s ease;
        }
        .el-ambient {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 45%;
          pointer-events: none;
          transition: background 0.8s ease;
        }
        .el-parallax-far {
          position: absolute;
          inset: 0;
          background-size: 110% auto;
          background-position: center 20%;
          opacity: 0.11;
          transform: scale(1.04);
          pointer-events: none;
          filter: blur(1.5px) brightness(0.4);
          transition: opacity 0.8s ease;
        }

        /* ── Orb layer ── */
        .el-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          animation: el-drift var(--orb-dur, 8s) ease-in-out infinite var(--orb-delay, 0s);
        }
        @keyframes el-drift {
          0%   { transform: translate(0,0) scale(1); opacity: 0.50; }
          25%  { transform: translate(5px,-8px) scale(1.12); opacity: 0.88; }
          50%  { transform: translate(-4px,-13px) scale(0.96); opacity: 0.65; }
          75%  { transform: translate(7px,-5px) scale(1.06); opacity: 0.80; }
          100% { transform: translate(0,0) scale(1); opacity: 0.50; }
        }

        /* ── Sakura petals (twilight) ── */
        .el-petal {
          position: absolute;
          top: -10px;
          border-radius: 50% 0 50% 0;
          background: rgba(255,180,200,0.65);
          pointer-events: none;
          animation: el-petal-fall var(--pet-dur, 9s) linear infinite var(--pet-delay, 0s);
        }
        @keyframes el-petal-fall {
          0%   { transform: translateY(-10px) rotate(0deg) translateX(0); opacity: 0; }
          8%   { opacity: 0.75; }
          90%  { opacity: 0.55; }
          100% { transform: translateY(100vh) rotate(360deg) translateX(30px); opacity: 0; }
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .el-orb { animation: none; }
          .el-petal { animation: none; }
        }

        /* ── Nav rail — Laputa sleek ── */
        .el-rail {
          position: relative;
          width: 52px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 0 24px 0;
          gap: 0;
          z-index: 30;
          flex-shrink: 0;
          transition: background 0.5s ease, border-color 0.5s ease;
        }
        .el-wordmark {
          font-family: 'Noto Serif JP', serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.20em;
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          user-select: none;
          margin-bottom: 20px;
          transition: color 0.5s ease;
        }
        .el-nav-items {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 1;
        }
        .el-nav-item {
          width: 44px;
          height: 44px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s;
          position: relative;
        }
        .el-nav-item:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }
        .el-nav-glyph {
          font-size: 15px;
          line-height: 1;
          transition: color 0.18s;
        }
        .el-nav-label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.03em;
          margin-top: 2px;
          transition: color 0.18s;
        }

        /* ── Main canvas ── */
        .el-main {
          flex: 1;
          position: relative;
          z-index: 10;
          padding: 32px 28px 100px 24px;
          max-width: 800px;
          overflow-y: auto;
        }

        /* ── Kintsugi seam ── */
        .el-kintsugi {
          height: 1px;
          position: relative;
          margin: 4px 0;
          overflow: visible;
        }

        /* ── Washi paper panels — integrated, not floating ── */
        .el-panel {
          border-radius: 8px;
          padding: 18px 20px;
          position: relative;
          overflow: hidden;
          backdrop-filter: var(--panel-blur, blur(10px));
          -webkit-backdrop-filter: var(--panel-blur, blur(10px));
          transition: background 0.5s ease, border-color 0.5s ease;
        }
        /* Left ink-rule accent: full-height left border, brushwork feel */
        .el-panel::before {
          content: '';
          position: absolute;
          top: 10%; left: 0;
          width: 2.5px;
          height: 80%;
          border-radius: 2px;
          transition: background 0.5s ease;
        }
        /* Kintsugi top-edge accent — gold line across full width */
        .el-panel::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          transition: background 0.5s ease;
        }
        .el-panel-label {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          margin-bottom: 12px;
          font-family: 'Noto Serif JP', serif;
          transition: color 0.5s ease;
        }

        /* ── Project grid ── */
        .el-projects {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 560px) { .el-projects { grid-template-columns: 1fr; } }

        .el-project-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .el-project-name {
          font-family: 'Noto Serif JP', serif;
          font-size: 15px;
          font-weight: 700;
          transition: color 0.5s ease;
        }
        .el-project-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }
        .el-pill {
          border-radius: 20px;
          padding: 3px 10px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.04em;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: background 0.4s ease, border-color 0.4s ease, color 0.4s ease;
        }
        .el-pill-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .el-tool-chip {
          display: inline-block;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          transition: background 0.4s ease, border-color 0.4s ease, color 0.4s ease;
        }
        .el-ctx-bar {
          height: 3px;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 10px;
          transition: background 0.4s ease;
        }
        .el-ctx-fill {
          height: 100%;
          width: 48%;
          border-radius: 2px;
          transition: background 0.4s ease, box-shadow 0.4s ease;
        }
        .el-blocked-note {
          font-size: 12px;
          font-style: italic;
          margin-top: 6px;
          transition: color 0.4s ease;
        }

        /* ── Activity stream ── */
        .el-activity-row {
          display: flex;
          align-items: baseline;
          gap: 14px;
          padding: 8px 0;
          transition: border-color 0.4s ease;
        }
        .el-activity-row + .el-activity-row {
          border-top: 1px solid;
        }
        .el-time {
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
          font-family: 'DM Sans', monospace;
          min-width: 42px;
          flex-shrink: 0;
          transition: color 0.4s ease;
        }
        .el-activity-msg {
          flex: 1;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.55;
          transition: color 0.4s ease;
        }
        .el-diff {
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
          font-weight: 600;
          flex-shrink: 0;
          transition: color 0.4s ease;
        }

        /* ── CTA ── */
        .el-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 6px;
          padding: 11px 22px;
          font-size: 15px;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.05em;
          cursor: pointer;
          border: 1px solid;
          transition: background 0.2s, box-shadow 0.2s, border-color 0.2s, color 0.2s;
        }
        .el-cta:hover {
          filter: brightness(1.08);
        }
        .el-cta:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }

        /* ── Phase toggle — safe, no overflow ──
           Uses position:fixed + right:16 + no overflow:hidden.
           All 3 pills always visible. No emoji.
        ── */
        .el-toggle {
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
          /* ensure no scroll clipping */
          max-width: calc(100vw - 80px);
        }
        .el-toggle-btn {
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
        .el-toggle-btn:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }

        /* ── Hero text ── */
        .el-eyebrow {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          margin-bottom: 10px;
          transition: color 0.5s ease, text-shadow 0.5s ease;
          text-shadow: var(--hero-halo);
        }
        .el-h1-kanji {
          font-family: 'Noto Serif JP', serif;
          font-size: clamp(26px, 4vw, 42px);
          font-weight: 700;
          line-height: 1.15;
          margin-bottom: 5px;
          transition: color 0.5s ease, text-shadow 0.5s ease;
          text-shadow: var(--hero-halo);
        }
        .el-h1-sub {
          font-family: 'Noto Serif JP', serif;
          font-size: clamp(13px, 2vw, 18px);
          font-weight: 500;
          line-height: 1.3;
          margin-bottom: 14px;
          transition: color 0.5s ease, text-shadow 0.5s ease;
          text-shadow: var(--hero-halo);
        }
        .el-subhead {
          font-size: 16px;
          font-weight: 500;
          line-height: 1.55;
          max-width: 480px;
          transition: color 0.5s ease, text-shadow 0.5s ease;
          text-shadow: var(--hero-halo);
        }

        /* ── Layout rhythm ── */
        .el-section-gap { height: 18px; }
        .el-section-gap-sm { height: 12px; }

        /* ── Stat strip ── */
        .el-stat-strip {
          display: flex;
          gap: 2px;
          margin-top: 16px;
        }
        .el-stat {
          flex: 1;
          padding: 10px 12px;
          border-radius: 6px;
          text-align: center;
          transition: background 0.4s, border-color 0.4s;
        }
        .el-stat-val {
          font-family: 'DM Sans', sans-serif;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
          transition: color 0.4s;
        }
        .el-stat-lbl {
          font-family: 'Noto Serif JP', serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          margin-top: 2px;
          transition: color 0.4s;
        }
      `}</style>

      <div
        className="el-root"
        style={{
          background: tk.bg,
          transition: "background 0.6s ease",
          ["--hero-halo" as string]: tk.heroHalo,
          ["--panel-blur" as string]: phase === "day" ? "none" : "blur(10px)",
        }}
      >
        {/* ── World painting layers ── */}
        <div
          className="el-parallax-far"
          style={{
            backgroundImage: `url('${tk.backdropImg}')`,
            opacity: phase === "day" ? 0.07 : 0.11,
          }}
        />
        <div className="el-backdrop" style={{ background: tk.bg }} />
        <div
          className="el-backdrop-img"
          style={{ backgroundImage: `url('${tk.backdropImg}')` }}
        />
        <div
          className="el-overlay"
          style={{ background: tk.overlayGradient }}
        />
        <div className="el-ambient" style={{ background: tk.ambientWash }} />

        {/* ── Drifting orbs (foxfire/kodama) ── */}
        {ORBS.map((orb, i) => (
          <div
            key={i}
            className="el-orb"
            style={{
              top: orb.top,
              left: orb.left,
              width: orb.size,
              height: orb.size,
              background: `radial-gradient(circle at 35% 35%, ${tk.orbColor}, transparent 70%)`,
              boxShadow: `0 0 ${orb.size * 2}px ${tk.orbGlow}`,
              ["--orb-dur" as string]: `${orb.dur}s`,
              ["--orb-delay" as string]: `${orb.delay}s`,
            }}
          />
        ))}

        {/* ── Sakura petals (twilight phase only) ── */}
        {phase === "twilight" &&
          PETALS.map((p, i) => (
            <div
              key={i}
              className="el-petal"
              style={{
                left: p.left,
                width: p.size,
                height: p.size,
                ["--pet-dur" as string]: `${p.dur}s`,
                ["--pet-delay" as string]: `${p.delay}s`,
              }}
            />
          ))}

        {/* ── Left nav rail — Laputa sleek ── */}
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
                className={`el-nav-item${item.active ? " active" : ""}`}
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

        {/* ── Main canvas ── */}
        <main className="el-main">
          {/* Hero section */}
          <section style={{ paddingTop: 8 }}>
            <p className="el-eyebrow" style={{ color: tk.eyebrowText }}>
              {tk.eyebrowLabel}
            </p>
            <h1 className="el-h1-kanji" style={{ color: tk.textPrimary }}>
              {tk.kanji}
            </h1>
            <p className="el-h1-sub" style={{ color: tk.accent }}>
              {tk.subtitle}
            </p>
            <p className="el-subhead" style={{ color: tk.textSub }}>
              Three sessions live, one waiting on your call. The night is quiet
              — a good time to ship the thing you keep circling.
            </p>

            {/* Stat strip — quick vitals inline with hero */}
            <div className="el-stat-strip">
              {[
                { val: "3", lbl: "active" },
                { val: "14", lbl: "shipped" },
                { val: "2", lbl: "blocked" },
                { val: "48%", lbl: "ctx" },
              ].map((s) => (
                <div
                  key={s.lbl}
                  className="el-stat"
                  style={{
                    background: tk.panelBg,
                    border: `1px solid ${tk.panelBorder}`,
                  }}
                >
                  <div className="el-stat-val" style={{ color: tk.foxfire }}>
                    {s.val}
                  </div>
                  <div className="el-stat-lbl" style={{ color: tk.textMuted }}>
                    {s.lbl}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="el-section-gap" />

          {/* Kintsugi divider */}
          <div className="el-kintsugi">
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(90deg, transparent 0%, ${tk.gold}55 15%, ${tk.goldBright}cc 40%, ${tk.gold} 50%, ${tk.goldBright}cc 60%, ${tk.gold}55 85%, transparent 100%)`,
                clipPath:
                  "polygon(0% 50%, 6% 15%, 13% 72%, 21% 28%, 29% 65%, 37% 8%, 45% 78%, 53% 22%, 61% 62%, 69% 32%, 77% 58%, 85% 12%, 93% 68%, 100% 50%)",
              }}
            />
          </div>

          <div className="el-section-gap" />

          {/* Active sessions */}
          <section>
            <p
              className="el-panel-label"
              style={{ color: tk.gold, marginBottom: 12 }}
            >
              Active sessions
            </p>
            <div className="el-projects">
              {/* personal-os card */}
              <div
                className="el-panel"
                style={{
                  background: `linear-gradient(135deg, ${tk.panelBg} 0%, ${tk.panelTint} 100%)`,
                  border: `1px solid ${tk.panelBorder}`,
                  boxShadow:
                    tk.panelShadow !== "none"
                      ? `inset 0 0 0 0.5px ${tk.panelInkBorder}33, ${tk.panelShadow}`
                      : `inset 0 0 0 0.5px ${tk.panelInkBorder}33`,
                }}
              >
                {/* Washi ink left-rule */}
                <div
                  style={{
                    position: "absolute",
                    top: "10%",
                    left: 0,
                    width: "2.5px",
                    height: "80%",
                    borderRadius: "2px",
                    background: `linear-gradient(180deg, transparent, ${tk.gold}88, transparent)`,
                  }}
                />
                {/* Kintsugi top edge */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "1px",
                    background: `linear-gradient(90deg, transparent 0%, ${tk.goldBright}aa 30%, ${tk.gold} 50%, ${tk.goldBright}aa 70%, transparent 100%)`,
                  }}
                />
                <div className="el-project-header">
                  <span
                    className="el-project-name"
                    style={{ color: tk.textPrimary }}
                  >
                    personal-os
                  </span>
                  <span
                    className="el-pill"
                    style={{
                      background: `rgba(52,211,153,0.13)`,
                      border: `1px solid rgba(52,211,153,0.30)`,
                      color: "#34D399",
                    }}
                  >
                    <span
                      className="el-pill-dot"
                      style={{ background: "#34D399" }}
                    />
                    live
                  </span>
                </div>
                <div className="el-project-meta">
                  <span
                    className="el-pill"
                    style={{
                      background: `${tk.accent}16`,
                      border: `1px solid ${tk.accent}38`,
                      color: tk.foxfire,
                    }}
                  >
                    cockpit · 2d
                  </span>
                  <span
                    className="el-pill"
                    style={{
                      background: `${tk.accent}16`,
                      border: `1px solid ${tk.accent}38`,
                      color: tk.foxfire,
                    }}
                  >
                    48% ctx
                  </span>
                </div>
                <span
                  className="el-tool-chip"
                  style={{
                    background: `rgba(100,140,200,0.06)`,
                    border: `1px solid rgba(100,140,200,0.12)`,
                    color: tk.textMuted,
                  }}
                >
                  mcp_claude-in-chrome__browser_batch
                </span>
                <div
                  className="el-ctx-bar"
                  style={{ background: `${tk.accent}14` }}
                >
                  <div
                    className="el-ctx-fill"
                    style={{
                      background: `linear-gradient(90deg, ${tk.foxfireGlow}, ${tk.accent})`,
                      boxShadow: `0 0 6px ${tk.orbGlow}`,
                    }}
                  />
                </div>
              </div>

              {/* metrasens card */}
              <div
                className="el-panel"
                style={{
                  background: `linear-gradient(135deg, ${tk.panelBg} 0%, ${tk.panelTint} 100%)`,
                  border: `1px solid ${tk.panelBorder}`,
                  boxShadow:
                    tk.panelShadow !== "none"
                      ? `inset 0 0 0 0.5px ${tk.panelInkBorder}33, ${tk.panelShadow}`
                      : `inset 0 0 0 0.5px ${tk.panelInkBorder}33`,
                }}
              >
                {/* Washi ink left-rule — blocked: red tint */}
                <div
                  style={{
                    position: "absolute",
                    top: "10%",
                    left: 0,
                    width: "2.5px",
                    height: "80%",
                    borderRadius: "2px",
                    background: `linear-gradient(180deg, transparent, rgba(248,113,113,0.6), transparent)`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "1px",
                    background: `linear-gradient(90deg, transparent 0%, ${tk.goldBright}aa 30%, ${tk.gold} 50%, ${tk.goldBright}aa 70%, transparent 100%)`,
                  }}
                />
                <div className="el-project-header">
                  <span
                    className="el-project-name"
                    style={{ color: tk.textPrimary }}
                  >
                    metrasens
                  </span>
                  <span
                    className="el-pill"
                    style={{
                      background: "rgba(248,113,113,0.12)",
                      border: "1px solid rgba(248,113,113,0.30)",
                      color: "#F87171",
                    }}
                  >
                    <span
                      className="el-pill-dot"
                      style={{ background: "#F87171" }}
                    />
                    blocked
                  </span>
                </div>
                <div className="el-project-meta">
                  <span
                    className="el-pill"
                    style={{
                      background: `${tk.accent}16`,
                      border: `1px solid ${tk.accent}38`,
                      color: tk.foxfire,
                    }}
                  >
                    signal-hub · 4d
                  </span>
                </div>
                <p className="el-blocked-note" style={{ color: "#F87171" }}>
                  MRE bucket — UPGRADE or CURRENT?
                </p>
              </div>
            </div>
          </section>

          <div className="el-section-gap" />

          {/* Kintsugi divider */}
          <div className="el-kintsugi">
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(90deg, transparent 0%, ${tk.gold}55 15%, ${tk.goldBright}cc 40%, ${tk.gold} 50%, ${tk.goldBright}cc 60%, ${tk.gold}55 85%, transparent 100%)`,
                clipPath:
                  "polygon(0% 50%, 6% 15%, 13% 72%, 21% 28%, 29% 65%, 37% 8%, 45% 78%, 53% 22%, 61% 62%, 69% 32%, 77% 58%, 85% 12%, 93% 68%, 100% 50%)",
              }}
            />
          </div>

          <div className="el-section-gap" />

          {/* Recent activity */}
          <section>
            <div
              className="el-panel"
              style={{
                background: `linear-gradient(135deg, ${tk.panelBg} 0%, ${tk.panelTint} 100%)`,
                border: `1px solid ${tk.panelBorder}`,
                boxShadow: `inset 0 0 0 0.5px ${tk.panelInkBorder}33`,
              }}
            >
              {/* Washi ink left-rule */}
              <div
                style={{
                  position: "absolute",
                  top: "10%",
                  left: 0,
                  width: "2.5px",
                  height: "80%",
                  borderRadius: "2px",
                  background: `linear-gradient(180deg, transparent, ${tk.gold}88, transparent)`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "1px",
                  background: `linear-gradient(90deg, transparent 0%, ${tk.goldBright}aa 30%, ${tk.gold} 50%, ${tk.goldBright}aa 70%, transparent 100%)`,
                }}
              />
              <p className="el-panel-label" style={{ color: tk.gold }}>
                Recent activity
              </p>
              {ACTIVITY.map((row, i) => (
                <div
                  key={i}
                  className="el-activity-row"
                  style={{ borderColor: `${tk.accent}16` }}
                >
                  <span className="el-time" style={{ color: tk.textMuted }}>
                    {row.time}
                  </span>
                  <span
                    className="el-activity-msg"
                    style={{ color: tk.textSub }}
                  >
                    {row.msg}
                  </span>
                  <span className="el-diff" style={{ color: tk.foxfire }}>
                    {row.diff}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="el-section-gap" />

          {/* CTA */}
          <button
            className="el-cta"
            type="button"
            style={{
              background: tk.ctaBg,
              borderColor: tk.ctaBorder,
              color: tk.ctaText,
            }}
          >
            + New session →
          </button>
        </main>

        {/* ── Phase toggle — no overflow, no emoji ── */}
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

        {/* ── Real Kitsu (MarvisCorner) — Live2D fox + chat widget ── */}
        <MarvisCorner modelUrl="/live2d/fox/standard_fox.model3.json" />
      </div>
    </>
  );
}
