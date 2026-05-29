"use client";

/**
 * Emaki x Laputa — Reusable Building Blocks
 * Faithfully lifted from /dev/emaki-laputa/page.tsx (2026-05-20 lock).
 *
 * Exports:
 *   useEmakiVars(phase, ref?)  - sets --panel-blur + --hero-halo CSS vars
 *   PaintedBackdrop({ phase }) - full-bleed sky + parallax + overlay/vignette
 *   WashiPanel                 - frosted/solid surface with kintsugi + ink-rule
 *   KintsugiSeam               - the gold jagged divider line
 *   FoxfireLayer({ phase })    - drifting orbs + per-phase ambient animation
 *   GlyphSun / GlyphDusk / GlyphMoon - SVG phase icons for toggle buttons
 *
 * Luminance-aware behavior:
 *   day   : panelBg is nearly opaque washi; no blur, no dark halo
 *   night : frosted blur(10px) on panels; heavy text-shadow halo for legibility
 *   twilight: same frosted treatment as night
 *
 * Per-phase ambient animations (CSS-only, prefers-reduced-motion guarded):
 *   day      : drifting leaves in the wind + slow soft clouds
 *   twilight : falling sakura petals (existing, unchanged)
 *   night    : twinkling + drifting stars + foxfire embers
 */

import React, { useEffect, useRef, CSSProperties } from "react";
import { Phase, PHASES, PhaseTokens } from "./theme";

/* ── CSS vars helper ── */

/**
 * Applies --panel-blur and --hero-halo to a given element (or document root).
 * Call inside a useEffect to keep the vars in sync with the active phase.
 */
export function useEmakiVars(
  phase: Phase,
  ref?: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const el: HTMLElement = ref?.current ?? document.documentElement;
    el.style.setProperty(
      "--panel-blur",
      phase === "day" ? "none" : "blur(10px)",
    );
    el.style.setProperty("--hero-halo", PHASES[phase].heroHalo);
    return () => {
      el.style.removeProperty("--panel-blur");
      el.style.removeProperty("--hero-halo");
    };
  }, [phase, ref]);
}

/* ── Orb scatter: seeded positions for natural drift ── */
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

/* ── Sakura petals: twilight only ── */
const PETALS = [
  { left: "8%", size: 6, dur: 8, delay: 0 },
  { left: "22%", size: 5, dur: 10, delay: 1.5 },
  { left: "41%", size: 7, dur: 7, delay: 3.0 },
  { left: "58%", size: 4, dur: 9, delay: 0.8 },
  { left: "74%", size: 6, dur: 11, delay: 2.2 },
  { left: "88%", size: 5, dur: 8.5, delay: 4.5 },
];

/* ── Day leaves: drifting organic shapes blown by wind ── */
const LEAVES = [
  { left: "5%", size: 8, dur: 12, delay: 0, swing: 28 },
  { left: "18%", size: 7, dur: 15, delay: 2.1, swing: -22 },
  { left: "33%", size: 9, dur: 11, delay: 4.8, swing: 34 },
  { left: "47%", size: 6, dur: 14, delay: 1.3, swing: -18 },
  { left: "62%", size: 8, dur: 13, delay: 3.5, swing: 26 },
  { left: "76%", size: 7, dur: 16, delay: 0.7, swing: -30 },
  { left: "89%", size: 9, dur: 10, delay: 5.2, swing: 20 },
  { left: "54%", size: 6, dur: 17, delay: 6.0, swing: -24 },
];

/* ── Day clouds: slow soft drifters in the background ── */
const CLOUDS = [
  { top: "8%", width: 140, height: 38, dur: 38, delay: 0, opacity: 0.28 },
  { top: "18%", width: 100, height: 28, dur: 50, delay: 12, opacity: 0.2 },
  { top: "6%", width: 180, height: 48, dur: 62, delay: 26, opacity: 0.18 },
  { top: "24%", width: 120, height: 32, dur: 44, delay: 7, opacity: 0.22 },
];

/* ── Night stars: twinkling points of light ── */
const STARS = [
  {
    top: "4%",
    left: "12%",
    size: 2,
    twinkDur: 3.2,
    twinkDelay: 0,
    driftDur: 22,
    driftDelay: 0,
  },
  {
    top: "9%",
    left: "34%",
    size: 1.5,
    twinkDur: 4.1,
    twinkDelay: 0.8,
    driftDur: 28,
    driftDelay: 5,
  },
  {
    top: "3%",
    left: "56%",
    size: 2.5,
    twinkDur: 2.8,
    twinkDelay: 1.6,
    driftDur: 18,
    driftDelay: 2,
  },
  {
    top: "7%",
    left: "74%",
    size: 1.5,
    twinkDur: 5.0,
    twinkDelay: 2.4,
    driftDur: 32,
    driftDelay: 9,
  },
  {
    top: "14%",
    left: "88%",
    size: 2,
    twinkDur: 3.6,
    twinkDelay: 0.5,
    driftDur: 25,
    driftDelay: 4,
  },
  {
    top: "18%",
    left: "22%",
    size: 1.5,
    twinkDur: 4.4,
    twinkDelay: 3.1,
    driftDur: 30,
    driftDelay: 7,
  },
  {
    top: "22%",
    left: "45%",
    size: 2,
    twinkDur: 2.6,
    twinkDelay: 1.9,
    driftDur: 20,
    driftDelay: 1,
  },
  {
    top: "11%",
    left: "65%",
    size: 3,
    twinkDur: 6.2,
    twinkDelay: 0.3,
    driftDur: 35,
    driftDelay: 12,
  },
  {
    top: "5%",
    left: "92%",
    size: 1.5,
    twinkDur: 3.9,
    twinkDelay: 4.0,
    driftDur: 24,
    driftDelay: 6,
  },
  {
    top: "16%",
    left: "7%",
    size: 2,
    twinkDur: 4.7,
    twinkDelay: 2.7,
    driftDur: 28,
    driftDelay: 3,
  },
  {
    top: "25%",
    left: "80%",
    size: 1.5,
    twinkDur: 3.3,
    twinkDelay: 1.2,
    driftDur: 19,
    driftDelay: 8,
  },
  {
    top: "2%",
    left: "50%",
    size: 2.5,
    twinkDur: 5.5,
    twinkDelay: 3.8,
    driftDur: 40,
    driftDelay: 15,
  },
];

/* ── Shared CSS (animations + component classes) ── */
export const EMAKI_CSS = `
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

  /* Painted world layers */
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

  /* Orb layer */
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

  /* Sakura petals (twilight) — unchanged */
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

  /* ── Day: leaves drifting in the wind ── */
  .el-leaf {
    position: absolute;
    top: -14px;
    pointer-events: none;
    border-radius: 50% 10% 50% 10%;
    animation:
      el-leaf-fall var(--leaf-dur, 13s) ease-in-out infinite var(--leaf-delay, 0s);
    will-change: transform, opacity;
  }
  @keyframes el-leaf-fall {
    0%   { transform: translateY(-14px) rotate(0deg)   translateX(0px);                           opacity: 0;    }
    6%   { opacity: 0.80; }
    30%  { transform: translateY(28vh)  rotate(120deg)  translateX(var(--leaf-swing, 24px));       opacity: 0.72; }
    60%  { transform: translateY(58vh)  rotate(240deg)  translateX(calc(var(--leaf-swing, 24px) * -0.6)); opacity: 0.60; }
    92%  { opacity: 0.40; }
    100% { transform: translateY(100vh) rotate(400deg)  translateX(calc(var(--leaf-swing, 24px) * 0.3));  opacity: 0;    }
  }

  /* ── Day: slow drifting clouds ── */
  .el-cloud {
    position: absolute;
    left: -20%;
    pointer-events: none;
    border-radius: 50%;
    filter: blur(14px);
    animation: el-cloud-drift var(--cloud-dur, 45s) linear infinite var(--cloud-delay, 0s);
    will-change: transform;
  }
  @keyframes el-cloud-drift {
    0%   { transform: translateX(0);    }
    100% { transform: translateX(130vw);}
  }

  /* ── Night: twinkling stars ── */
  .el-star {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    animation:
      el-star-twinkle var(--star-twink-dur, 4s) ease-in-out infinite var(--star-twink-delay, 0s),
      el-star-drift   var(--star-drift-dur, 26s) ease-in-out infinite var(--star-drift-delay, 0s);
    will-change: transform, opacity;
  }
  @keyframes el-star-twinkle {
    0%   { opacity: 0.20; transform: scale(0.85); }
    50%  { opacity: 1.00; transform: scale(1.30); }
    100% { opacity: 0.20; transform: scale(0.85); }
  }
  @keyframes el-star-drift {
    0%   { translate: 0px   0px; }
    33%  { translate: 4px  -3px; }
    66%  { translate: -3px  2px; }
    100% { translate: 0px   0px; }
  }

  /* ── Pointer parallax layers (JS-driven via inline style) ── */
  .el-parallax-mid {
    position: absolute;
    inset: -6%;
    background-size: cover;
    background-position: center top;
    opacity: 0.38;
    pointer-events: none;
    will-change: transform;
    transition: opacity 0.8s ease;
  }
  .el-parallax-near {
    position: absolute;
    inset: -4%;
    background-size: cover;
    background-position: center top;
    opacity: 0.18;
    pointer-events: none;
    will-change: transform;
    transition: opacity 0.8s ease;
    filter: blur(0.5px);
  }

  /* Reduced motion: disable all ambient animations */
  @media (prefers-reduced-motion: reduce) {
    .el-orb    { animation: none; }
    .el-petal  { animation: none; }
    .el-leaf   { animation: none; }
    .el-cloud  { animation: none; }
    .el-star   { animation: none; }
    .el-parallax-mid  { transform: none !important; }
    .el-parallax-near { transform: none !important; }
    .el-parallax-far  { transform: none !important; }
  }

  /* Nav rail: Laputa sleek */
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

  /* Main canvas */
  .el-main {
    flex: 1;
    position: relative;
    z-index: 10;
    padding: 32px 28px 100px 24px;
    max-width: 800px;
    overflow-y: auto;
  }

  /* Kintsugi seam */
  .el-kintsugi {
    height: 1px;
    position: relative;
    margin: 4px 0;
    overflow: visible;
  }

  /* Washi paper panels: integrated, not floating */
  .el-panel {
    border-radius: 8px;
    padding: 18px 20px;
    position: relative;
    overflow: hidden;
    backdrop-filter: var(--panel-blur, blur(10px));
    -webkit-backdrop-filter: var(--panel-blur, blur(10px));
    transition: background 0.5s ease, border-color 0.5s ease;
  }
  /* Left ink-rule accent */
  .el-panel::before {
    content: '';
    position: absolute;
    top: 10%; left: 0;
    width: 2.5px;
    height: 80%;
    border-radius: 2px;
    transition: background 0.5s ease;
  }
  /* Kintsugi top-edge gold line */
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

  /* Project grid */
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

  /* Activity stream */
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

  /* CTA button */
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
  .el-cta:hover { filter: brightness(1.08); }
  .el-cta:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }

  /* Phase toggle: fixed position, overflow-safe, no emoji */
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
  .el-toggle-btn:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }

  /* Hero text */
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

  /* Layout rhythm */
  .el-section-gap { height: 18px; }
  .el-section-gap-sm { height: 12px; }

  /* Stat strip */
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
`;

/* ── SVG phase glyphs — no emoji ── */

export function GlyphSun({ color }: { color: string }) {
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

export function GlyphDusk({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <path
        d="M1.5 9 A5 5 0 0 1 11.5 9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="0.5"
        y1="9"
        x2="12.5"
        y2="9"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
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

export function GlyphMoon({ color }: { color: string }) {
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

/* ── PaintedBackdrop ── */

interface PaintedBackdropProps {
  phase: Phase;
}

/**
 * Full-bleed backdrop: multi-layer parallax + solid base + sky image
 * + overlay gradient + ambient wash. Sits at z-index 0 behind everything.
 *
 * Pointer parallax: three depth layers respond to mousemove at different
 * rates (far=2px, mid=5px, near=9px), throttled via requestAnimationFrame.
 * Disabled automatically by prefers-reduced-motion via CSS class.
 */
export function PaintedBackdrop({ phase }: PaintedBackdropProps) {
  const tk: PhaseTokens = PHASES[phase];

  const farRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const nearRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = (e.clientX - cx) / cx; // -1..1
        const dy = (e.clientY - cy) / cy;
        if (farRef.current)
          farRef.current.style.transform = `scale(1.04) translate(${dx * 2}px, ${dy * 2}px)`;
        if (midRef.current)
          midRef.current.style.transform = `translate(${dx * 5}px, ${dy * 5}px)`;
        if (nearRef.current)
          nearRef.current.style.transform = `translate(${dx * 9}px, ${dy * 9}px)`;
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      {/* Far layer: blurred, dark, slow parallax */}
      <div
        ref={farRef}
        className="el-parallax-far"
        style={{
          backgroundImage: `url('${tk.backdropImg}')`,
          opacity: phase === "day" ? 0.07 : 0.11,
        }}
      />
      {/* Solid color base */}
      <div className="el-backdrop" style={{ background: tk.bg }} />
      {/* Primary sky image */}
      <div
        className="el-backdrop-img"
        style={{ backgroundImage: `url('${tk.backdropImg}')` }}
      />
      {/* Mid parallax: same image, tinted, medium depth */}
      <div
        ref={midRef}
        className="el-parallax-mid"
        style={{
          backgroundImage: `url('${tk.backdropImg}')`,
          opacity: phase === "day" ? 0.12 : 0.2,
          mixBlendMode: phase === "day" ? "multiply" : "screen",
        }}
      />
      {/* Near parallax: same image, fastest layer, subtle */}
      <div
        ref={nearRef}
        className="el-parallax-near"
        style={{
          backgroundImage: `url('${tk.backdropImg}')`,
          opacity: phase === "day" ? 0.06 : 0.1,
          mixBlendMode: phase === "day" ? "multiply" : "screen",
        }}
      />
      <div className="el-overlay" style={{ background: tk.overlayGradient }} />
      <div className="el-ambient" style={{ background: tk.ambientWash }} />
    </>
  );
}

/* ── FoxfireLayer ── */

interface FoxfireLayerProps {
  phase: Phase;
}

/**
 * Drifting kodama orbs + foxfire embers + per-phase signature ambient:
 *   day      : wind-blown leaves + slow drifting clouds
 *   twilight : falling sakura petals (unchanged, exact original)
 *   night    : twinkling drifting stars
 * All CSS-only (transform/opacity), prefers-reduced-motion guarded via CSS.
 */
export function FoxfireLayer({ phase }: FoxfireLayerProps) {
  const tk: PhaseTokens = PHASES[phase];

  /* Leaf colors vary by phase for natural look */
  const leafColors =
    phase === "day"
      ? ["#6a9a2a", "#8ab840", "#4e7a18", "#a0c040", "#5c8820", "#7ab030"]
      : [
          "#a07840",
          "#c09050",
          "#806030",
          "#b08840",
        ]; /* warm autumn for other phases */

  /* Star glow color from phase tokens */
  const starColor = tk.foxfire;
  const starGlow = tk.orbGlow;

  return (
    <>
      {/* Orbs: all phases */}
      {ORBS.map((orb, i) => (
        <div
          key={`orb-${i}`}
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

      {/* Twilight: sakura petals (unchanged) */}
      {phase === "twilight" &&
        PETALS.map((p, i) => (
          <div
            key={`petal-${i}`}
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

      {/* Day: wind-blown leaves */}
      {phase === "day" &&
        LEAVES.map((lf, i) => (
          <div
            key={`leaf-${i}`}
            className="el-leaf"
            style={{
              left: lf.left,
              width: lf.size,
              height: lf.size * 0.7,
              background: leafColors[i % leafColors.length],
              ["--leaf-dur" as string]: `${lf.dur}s`,
              ["--leaf-delay" as string]: `${lf.delay}s`,
              ["--leaf-swing" as string]: `${lf.swing}px`,
              opacity: 0.82,
            }}
          />
        ))}

      {/* Day: slow soft clouds */}
      {phase === "day" &&
        CLOUDS.map((cl, i) => (
          <div
            key={`cloud-${i}`}
            className="el-cloud"
            style={{
              top: cl.top,
              width: cl.width,
              height: cl.height,
              background: "rgba(255,252,245,0.9)",
              opacity: cl.opacity,
              ["--cloud-dur" as string]: `${cl.dur}s`,
              ["--cloud-delay" as string]: `${cl.delay}s`,
            }}
          />
        ))}

      {/* Night: twinkling drifting stars */}
      {phase === "night" &&
        STARS.map((st, i) => (
          <div
            key={`star-${i}`}
            className="el-star"
            style={{
              top: st.top,
              left: st.left,
              width: st.size,
              height: st.size,
              background: starColor,
              boxShadow: `0 0 ${st.size * 3}px ${starGlow}, 0 0 ${st.size * 6}px ${starGlow}55`,
              ["--star-twink-dur" as string]: `${st.twinkDur}s`,
              ["--star-twink-delay" as string]: `${st.twinkDelay}s`,
              ["--star-drift-dur" as string]: `${st.driftDur}s`,
              ["--star-drift-delay" as string]: `${st.driftDelay}s`,
            }}
          />
        ))}
    </>
  );
}

/* ── KintsugiSeam ── */

interface KintsugiSeamProps {
  gold: string;
  goldBright: string;
}

/**
 * The jagged gold seam divider between sections.
 * Pass tk.gold and tk.goldBright from the active phase tokens.
 */
export function KintsugiSeam({ gold, goldBright }: KintsugiSeamProps) {
  return (
    <div className="el-kintsugi">
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, transparent 0%, ${gold}55 15%, ${goldBright}cc 40%, ${gold} 50%, ${goldBright}cc 60%, ${gold}55 85%, transparent 100%)`,
          clipPath:
            "polygon(0% 50%, 6% 15%, 13% 72%, 21% 28%, 29% 65%, 37% 8%, 45% 78%, 53% 22%, 61% 62%, 69% 32%, 77% 58%, 85% 12%, 93% 68%, 100% 50%)",
        }}
      />
    </div>
  );
}

/* ── WashiPanel ── */

interface WashiPanelProps {
  tk: PhaseTokens;
  /** Override the left ink-rule color gradient stop. Default: tk.gold */
  inkColor?: string;
  style?: CSSProperties;
  className?: string;
  children: React.ReactNode;
}

/**
 * Washi paper panel surface. Luminance-aware:
 *   day      : nearly opaque, box-shadow for lift, no blur
 *   night/tw : frosted via var(--panel-blur), subtle ink shadow
 *
 * Includes: kintsugi gold top-edge, left ink-rule accent.
 * The panel's backdrop-filter is driven by the --panel-blur CSS var
 * (set by useEmakiVars). No blur on day; blur(10px) on night/twilight.
 */
export function WashiPanel({
  tk,
  inkColor,
  style,
  className,
  children,
}: WashiPanelProps) {
  const ink = inkColor ?? tk.gold;
  const panelBoxShadow =
    tk.panelShadow !== "none"
      ? `inset 0 0 0 0.5px ${tk.panelInkBorder}33, ${tk.panelShadow}`
      : `inset 0 0 0 0.5px ${tk.panelInkBorder}33`;

  return (
    <div
      className={`el-panel${className ? ` ${className}` : ""}`}
      style={{
        background: `linear-gradient(135deg, ${tk.panelBg} 0%, ${tk.panelTint} 100%)`,
        border: `1px solid ${tk.panelBorder}`,
        boxShadow: panelBoxShadow,
        ...style,
      }}
    >
      {/* Left ink-rule */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: 0,
          width: "2.5px",
          height: "80%",
          borderRadius: "2px",
          background: `linear-gradient(180deg, transparent, ${ink}88, transparent)`,
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
      {children}
    </div>
  );
}
