"use client";

// ─── Design System (ui-ux-pro-max → --design-system output) ───────────────────
// Style:      Motion-Driven (scroll entrance, hover 300ms, parallax float)
// Pattern:    Real-Time / Operations Landing (live status + metrics first)
// Colors:     #18181B surface / #09090B bg / #3F3F46 secondary / #2563EB accent
//             (Monochrome + single blue accent — "Monochrome + blue accent" per output)
// Typography: Caveat (display/handwritten warmth) + Quicksand (body/labels)
// Effects:    Entrance cascade, cubic-bezier spring, continuous ambient float
//
// ─── design-taste-frontend dials (at DEFAULTS: 8 / 6 / 4) ────────────────────
// DESIGN_VARIANCE=8   → asymmetric 2fr/1fr grid, left-aligned hero, NO centered H1
// MOTION_INTENSITY=6  → fluid CSS only; cubic-bezier(0.16,1,0.3,1); transform+opacity
//                       CSS stagger cascade, directional hover fill, pulse dot
// VISUAL_DENSITY=4    → Daily App Mode; cards where elevation needed; breathing room
//
// Anti-slop enforced: No Inter, no neon glow (inner refraction only),
//                     no 3-equal-column layout, no pure #000, no emoji icons,
//                     no oversized H1, directional hover-fill on CTA

import React, { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Inline SVG icon primitives (no external deps, no emoji)
// ─────────────────────────────────────────────────────────────────────────────
function IconPlus() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.5 1v11M1 6.5h11"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 6h8M7 3l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.5 1L10 9.5H1L5.5 1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 5v2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="5.5" cy="8.2" r="0.55" fill="currentColor" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────
const PROJECTS = [
  {
    id: "pos",
    name: "personal-os",
    meta: "cockpit · 2d",
    tags: [
      { label: "48% ctx", style: "ctx" },
      { label: "browser_batch", style: "mono" },
    ],
    blocked: false,
  },
  {
    id: "met",
    name: "metrasens",
    meta: "signal-hub · 4d",
    tags: [
      { label: "blocked", style: "alert" },
      { label: "UPGRADE or CURRENT?", style: "warn" },
    ],
    blocked: true,
  },
];

const ACTIVITY = [
  {
    time: "09:58",
    msg: "legibility foundation shipped",
    diff: "+711",
    neg: "−0",
    pos: true,
  },
  {
    time: "09:24",
    msg: "party mode — Kitsu sings first",
    diff: "+180",
    neg: "−44",
    pos: false,
  },
  {
    time: "08:51",
    msg: "fox head reframed",
    diff: "+12",
    neg: "−9",
    pos: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ComboSystemArchitectSlice() {
  // Visible from first paint — don't gate content visibility on JS timing
  // (the rAF gate left opacity:0 stuck on hydration-regenerated trees).
  const [ready, setReady] = useState(true);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <>
      <style>{STYLES}</style>
      <div
        className={`csa-root${ready ? " csa-ready" : ""}`}
        role="main"
        aria-label="PG OS — Home"
      >
        {/* Ambient orb — pointer-events-none, no repaints on scroll container */}
        <div className="csa-orb" aria-hidden="true" />

        <Chrome />
        <div className="csa-body">
          <LeftCol />
          <RightCol />
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chrome
// ─────────────────────────────────────────────────────────────────────────────
function Chrome() {
  return (
    <header className="csa-chrome csa-enter csa-d1">
      <span className="csa-wordmark" aria-label="PG OS">
        PG <em>OS</em>
      </span>
      <nav className="csa-tabs" role="tablist" aria-label="Main navigation">
        {["Home", "Habits", "Projects", "Cockpit"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={t === "Home"}
            className={`csa-tab${t === "Home" ? " active" : ""}`}
          >
            {t}
          </button>
        ))}
      </nav>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Left column — Hero + Cards + CTA
// ─────────────────────────────────────────────────────────────────────────────
function LeftCol() {
  return (
    <section className="csa-left">
      {/* Eyebrow */}
      <div className="csa-eyebrow csa-enter csa-d2">
        <span className="csa-pulse" aria-hidden="true" />
        Late night · Kitsu is watching the fleet
      </div>

      {/* H1 — left-aligned, Caveat, not oversized */}
      <h1 className="csa-h1 csa-enter csa-d3">
        The fleet holds.
        <br />
        You move the needle.
      </h1>

      <p className="csa-sub csa-enter csa-d4">
        Three sessions live, one waiting on your call. The night is quiet — a
        good time to ship the thing you keep circling.
      </p>

      {/* Project cards — 2-column, not 3-equal (design-taste Rule 3 + Layout §3) */}
      <div
        className="csa-cards csa-enter csa-d5"
        role="region"
        aria-label="Active projects"
      >
        {PROJECTS.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>

      {/* CTA — directional hover fill from left */}
      <div className="csa-enter csa-d6">
        <button className="csa-cta" aria-label="Start a new session">
          <IconPlus />
          New session
          <IconArrow />
        </button>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Project card
// ─────────────────────────────────────────────────────────────────────────────
function ProjectCard({ project }: { project: (typeof PROJECTS)[0] }) {
  return (
    <article
      className={`csa-card${project.blocked ? " csa-card--blocked" : ""}`}
      aria-label={`${project.name} — ${project.blocked ? "blocked" : "active"}`}
      tabIndex={0}
    >
      {/* Liquid glass inner edge — anti-slop (inner refraction, not outer glow) */}
      <span className="csa-card-shine" aria-hidden="true" />
      <div className="csa-card-title">
        {project.name}
        {project.blocked && (
          <span className="csa-blocked-icon" aria-label="Blocked">
            <IconAlert />
          </span>
        )}
      </div>
      <div className="csa-card-meta">{project.meta}</div>
      <div className="csa-card-tags">
        {project.tags.map((tag) => (
          <span key={tag.label} className={`csa-tag csa-tag--${tag.style}`}>
            {tag.label}
          </span>
        ))}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Right column — Status + Activity + Shimmer skeleton
// ─────────────────────────────────────────────────────────────────────────────
function RightCol() {
  return (
    <aside className="csa-right" aria-label="Status and activity">
      {/* Fleet status summary */}
      <div className="csa-enter csa-d3">
        <div className="csa-section-lbl">Fleet status</div>
        <div
          className="csa-status-block"
          role="status"
          aria-label="Fleet status"
        >
          {[
            { dot: "green", label: "Sessions live", val: "3" },
            { dot: "amber", label: "Awaiting call", val: "1" },
            { dot: "red", label: "Blocked", val: "1" },
          ].map((r) => (
            <div key={r.label} className="csa-status-row">
              <span className="csa-status-label">
                <span
                  className={`csa-dot csa-dot--${r.dot}`}
                  aria-hidden="true"
                />
                {r.label}
              </span>
              <span className="csa-status-val">{r.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="csa-rule" aria-hidden="true" />

      {/* Recent activity */}
      <div className="csa-enter csa-d5">
        <div className="csa-section-lbl">Recent activity</div>
        <div className="csa-activity" role="feed" aria-label="Recent activity">
          {ACTIVITY.map((row, i) => (
            <div key={i} className="csa-activity-row" role="article">
              <span className="csa-time">{row.time}</span>
              <span className="csa-activity-msg">{row.msg}</span>
              <span className={`csa-diff${row.pos ? " pos" : ""}`}>
                <span className="pos-part">{row.diff}</span>{" "}
                <span className="neg-part">{row.neg}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="csa-rule" aria-hidden="true" />

      {/* Shimmer skeleton (design-taste Rule 5 — mandatory loading state) */}
      <div
        className="csa-enter csa-d7"
        aria-busy="true"
        aria-label="Loading upcoming tasks"
      >
        <div className="csa-section-lbl">Upcoming</div>
        <div className="csa-skeletons">
          {[78, 62, 70].map((w, i) => (
            <div key={i} className="csa-shimmer" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — scoped to .csa-root
// ─────────────────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Quicksand:wght@400;500;600;700&display=swap');

/* ── Tokens ── */
.csa-root {
  --bg:       #09090B;
  --surface:  #18181B;
  --surface2: #27272A;
  --border:   rgba(63,63,70,0.55);
  --border-hi:rgba(255,255,255,0.06);
  --accent:   #2563EB;
  --accent-lo:rgba(37,99,235,0.12);
  --accent-gl:rgba(37,99,235,0.07);
  --text-1:   #F4F4F5;
  --text-2:   #A1A1AA;
  --text-3:   #52525B;
  --green:    #22C55E;
  --green-lo: rgba(34,197,94,0.12);
  --amber:    #F59E0B;
  --red:      #EF4444;
  --red-lo:   rgba(239,68,68,0.12);
  --r-sm:     9px;
  --r-md:     14px;
  --r-lg:     20px;
  --spring:   cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
  --t-fast:   140ms;
  --t-std:    270ms;
  --t-slow:   400ms;

  font-family: 'Quicksand', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text-1);
  max-width: 1180px;
  min-height: 640px;
  margin: 0 auto;
  overflow: hidden;
  position: relative;
  border-radius: var(--r-lg);
}

/* ── Ambient orb — fixed pseudo-element, pointer-events-none ── */
.csa-orb {
  position: absolute;
  top: -160px;
  right: -100px;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(37,99,235,0.13) 0%, transparent 68%);
  pointer-events: none;
  z-index: 0;
  animation: csa-float 9s ease-in-out infinite alternate;
  will-change: transform;
}
@keyframes csa-float {
  0%   { transform: translate(0,    0)    scale(1); }
  100% { transform: translate(-28px, 36px) scale(1.05); }
}
@media (prefers-reduced-motion: reduce) {
  .csa-orb             { animation: none; }
  .csa-enter           { transition: none !important; }
  .csa-pulse           { animation: none !important; }
  .csa-shimmer::after  { animation: none !important; }
}

/* ── Entrance cascade (MOTION_INTENSITY=6 — CSS only, transform+opacity) ── */
.csa-enter {
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity  var(--t-slow) var(--spring),
    transform var(--t-slow) var(--spring);
}
.csa-ready .csa-enter { opacity: 1; transform: translateY(0); }
.csa-ready .csa-d1 { transition-delay:   0ms; }
.csa-ready .csa-d2 { transition-delay:  55ms; }
.csa-ready .csa-d3 { transition-delay: 110ms; }
.csa-ready .csa-d4 { transition-delay: 165ms; }
.csa-ready .csa-d5 { transition-delay: 220ms; }
.csa-ready .csa-d6 { transition-delay: 275ms; }
.csa-ready .csa-d7 { transition-delay: 330ms; }

/* ── Chrome ── */
.csa-chrome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 22px 13px 26px;
  border-bottom: 1px solid var(--border);
  position: relative;
  z-index: 10;
  background: rgba(9,9,11,0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.csa-wordmark {
  font-family: 'Caveat', cursive;
  font-weight: 700;
  font-size: 20px;
  color: var(--text-1);
  letter-spacing: 0.01em;
}
.csa-wordmark em {
  font-style: normal;
  color: var(--accent);
}
.csa-tabs {
  display: flex;
  gap: 2px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 3px;
}
.csa-tab {
  font-family: 'Quicksand', sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  letter-spacing: 0.01em;
  transition: color var(--t-fast) var(--ease-out),
              background var(--t-fast) var(--ease-out);
}
.csa-tab.active      { background: var(--surface2); color: var(--text-1); }
.csa-tab:hover:not(.active) { color: var(--text-1); }
.csa-tab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ── Body grid — DESIGN_VARIANCE=8: asymmetric fractional (2fr 1fr) ── */
.csa-body {
  display: grid;
  grid-template-columns: 2fr 1fr;
  position: relative;
  z-index: 1;
}
@media (max-width: 768px) {
  .csa-body { grid-template-columns: 1fr; }
}

/* ── Left column ── */
.csa-left {
  padding: 30px 28px 28px 28px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* Eyebrow */
.csa-eyebrow {
  font-family: 'Quicksand', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 7px;
}

/* Pulse dot (MOTION_INTENSITY=6, perpetual micro-interaction) */
.csa-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  animation: csa-pulse 2.6s ease-in-out infinite;
  will-change: opacity, transform;
}
@keyframes csa-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.35; transform: scale(0.65); }
}

/* H1 — left-aligned (DESIGN_VARIANCE=8 bans centered H1s), Caveat, controlled size */
.csa-h1 {
  font-family: 'Caveat', cursive;
  font-size: 36px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.015em;
  color: var(--text-1);
  margin: 0;
  max-width: 480px;
}

.csa-sub {
  font-size: 13.5px;
  font-weight: 400;
  line-height: 1.7;
  color: var(--text-2);
  max-width: 460px;
  margin: 0;
}

/* Cards — 2-column (NOT 3-equal, anti-slop) */
.csa-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
}
@media (max-width: 480px) {
  .csa-cards { grid-template-columns: 1fr; }
}

.csa-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 15px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition:
    border-color var(--t-std) var(--spring),
    transform    var(--t-std) var(--spring);
}
/* Liquid glass refraction: inner border only (design-taste anti-slop, no outer glow) */
.csa-card-shine {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 1px 0 var(--border-hi);
  pointer-events: none;
}
/* Hover accent wash — transform/opacity only */
.csa-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--accent-gl);
  opacity: 0;
  transition: opacity var(--t-std) var(--ease-out);
  pointer-events: none;
}
.csa-card:hover              { border-color: rgba(37,99,235,0.3); }
.csa-card:hover::before      { opacity: 1; }
.csa-card:active             { transform: translateY(1px) scale(0.985); }
.csa-card:focus-visible      { outline: 2px solid var(--accent); outline-offset: 2px; }

.csa-card--blocked { border-color: rgba(239,68,68,0.25); }
.csa-card--blocked::before { background: var(--red-lo); }

.csa-card-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-1);
  letter-spacing: -0.01em;
  margin-bottom: 3px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.csa-blocked-icon { color: var(--red); flex-shrink: 0; }

.csa-card-meta {
  font-size: 11px;
  color: var(--text-3);
  font-weight: 500;
  margin-bottom: 9px;
}
.csa-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

/* Tags / badges */
.csa-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  letter-spacing: 0.025em;
  white-space: nowrap;
}
.csa-tag--ctx  { background: rgba(168,85,247,0.1);  color: #C084FC; border: 1px solid rgba(168,85,247,0.18); }
.csa-tag--mono { background: var(--surface2); color: var(--text-2); border: 1px solid var(--border); font-size: 9px; font-family: 'Quicksand', monospace; }
.csa-tag--alert{ background: var(--red-lo);  color: #FCA5A5; border: 1px solid rgba(239,68,68,0.2); }
.csa-tag--warn { background: rgba(245,158,11,0.1); color: #FCD34D; border: 1px solid rgba(245,158,11,0.18); font-size: 9px; }

/* CTA — directional hover fill from left (design-taste §4 "Directional Hover Aware Button") */
.csa-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--accent);
  color: #fff;
  font-family: 'Quicksand', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  padding: 10px 18px;
  border-radius: var(--r-sm);
  border: none;
  cursor: pointer;
  letter-spacing: 0.02em;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.14);
  transition:
    transform   var(--t-fast) var(--spring),
    box-shadow  var(--t-std)  var(--spring);
}
.csa-cta::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.1);
  transform: translateX(-102%);
  transition: transform var(--t-std) var(--spring);
  border-radius: inherit;
}
.csa-cta:hover { box-shadow: 0 4px 22px rgba(37,99,235,0.32), inset 0 1px 0 rgba(255,255,255,0.14); }
.csa-cta:hover::after { transform: translateX(0); }
.csa-cta:active { transform: translateY(1px) scale(0.975); }
.csa-cta:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }

/* ── Right column ── */
.csa-right {
  padding: 26px 20px 26px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Section label */
.csa-section-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 9px;
}

/* Horizontal rule */
.csa-rule {
  width: 100%;
  height: 1px;
  background: var(--border);
  flex-shrink: 0;
}

/* Status block — liquid glass inner refraction */
.csa-status-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
  box-shadow: inset 0 1px 0 var(--border-hi);
}
.csa-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 13px;
  transition: background var(--t-fast) var(--ease-out);
}
.csa-status-row + .csa-status-row { border-top: 1px solid var(--border); }
.csa-status-row:hover { background: var(--surface2); }
.csa-status-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: 7px;
}
.csa-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.csa-dot--green { background: var(--green); }
.csa-dot--amber { background: var(--amber); }
.csa-dot--red   { background: var(--red); }
.csa-status-val {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-1);
  font-family: 'Quicksand', monospace;
}

/* Activity feed */
.csa-activity {
  display: flex;
  flex-direction: column;
}
.csa-activity-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: baseline;
  gap: 8px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border);
  transition: background var(--t-fast) var(--ease-out);
  border-radius: 4px;
}
.csa-activity-row:last-child { border-bottom: none; }
.csa-activity-row:hover { background: var(--surface); }
.csa-time {
  font-family: 'Quicksand', monospace;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-3);
  letter-spacing: 0.02em;
}
.csa-activity-msg {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-1);
  line-height: 1.4;
}
.csa-diff {
  font-family: 'Quicksand', monospace;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  display: flex;
  gap: 3px;
}
.csa-diff .pos-part { color: #86EFAC; }
.csa-diff .neg-part { color: var(--text-3); }
.csa-diff.pos .pos-part { color: #4ADE80; }

/* Shimmer skeleton — design-taste Rule 5: mandatory loading state */
.csa-skeletons {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.csa-shimmer {
  height: 11px;
  border-radius: 4px;
  background: var(--surface2);
  position: relative;
  overflow: hidden;
}
/* Shimmer applied to fixed pseudo-element — NOT to scroll container (performance rule §5) */
.csa-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.045) 50%, transparent 100%);
  transform: translateX(-100%);
  animation: csa-shim 2s ease-in-out infinite;
  will-change: transform;
}
@keyframes csa-shim {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;
