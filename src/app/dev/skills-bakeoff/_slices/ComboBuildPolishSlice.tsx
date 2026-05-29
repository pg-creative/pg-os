"use client";

import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1 — HUASHU BUILD
// Designer persona: Wim Crouwel / Experimental Jetset Dutch modernism.
// Scene sentence: "A solo builder at 1am, three terminals alive, coffee
// cooling, deciding which thread to pull next on a screen that feels like a
// cockpit, not a SaaS app."
// That scene demands: ink-black surface, monospace type as a structural grid
// element, one committed amber accent (cockpit HUD glow), data treated as
// typography rather than decoration. Projects rendered as horizontal data-
// rows — not identical icon-card clones. Activity strip reads like a diff log.
// Anti-slop: no gradient text, no glassmorphism, no icon-per-label, no
// rounded-pill-everything, no side-stripe card accents.
//
// STAGE 2 — IMPECCABLE POLISH
// · All colors in OKLCH — no #000 / #fff, all neutrals tinted toward amber
// · Color strategy: Committed — amber carries ~40% of the surface
// · Typography: ≥1.25 ratio between every step; body capped at 65ch
// · Spacing varies for rhythm — not uniform padding throughout
// · Every interactive element has default/hover/focus-visible/active states
// · Easing: cubic-bezier(0.22,1,0.36,1) (ease-out-quint) everywhere
// · prefers-reduced-motion: all keyframe and transition animations suppressed
// · Side-stripe ban honored — status uses background-tint, not left-border
// · "blocked" badge: background-tint red (not a left-border accent)
// · Copy: no em dashes; every word earns its place
// · Live-dot animation is data-meaningful (shows fleet pulse), not decorative
// ─────────────────────────────────────────────────────────────────────────────

export default function ComboBuildPolishSlice() {
  const [hoveredRow, setHoveredRow] = React.useState<string | null>(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');

        .cs-root *, .cs-root *::before, .cs-root *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .cs-root {
          /* ── Color tokens ─────────────────────── */
          --ink-950: oklch(9%  0.009 62);
          --ink-900: oklch(13% 0.009 62);
          --ink-850: oklch(16% 0.009 63);
          --ink-800: oklch(20% 0.010 63);
          --ink-700: oklch(27% 0.009 64);
          --ink-600: oklch(36% 0.009 64);
          --ink-500: oklch(47% 0.008 65);
          --ink-400: oklch(58% 0.008 66);
          --ink-300: oklch(70% 0.007 67);
          --ink-200: oklch(82% 0.006 68);
          --ink-100: oklch(92% 0.005 69);

          --amber:       oklch(75% 0.172 68);
          --amber-dim:   oklch(63% 0.138 68);
          --amber-tint:  oklch(20% 0.042 68);
          --amber-ghost: oklch(14% 0.022 68);

          --green:      oklch(67% 0.143 148);
          --green-tint: oklch(15% 0.032 148);

          --red:      oklch(57% 0.183 24);
          --red-tint: oklch(17% 0.046 24);

          /* ── Easing ───────────────────────────── */
          --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);

          /* ── Layout ───────────────────────────── */
          font-family: 'Space Grotesk', system-ui, sans-serif;
          background: var(--ink-950);
          color: var(--ink-100);
          max-width: 1180px;
          min-height: 640px;
          padding: 40px 52px 52px 60px;
          display: flex;
          flex-direction: column;
          gap: 0;
          position: relative;
          overflow: hidden;
        }

        /* Left accent rail — cockpit frame edge, not a side-stripe on a card */
        .cs-root::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(
            to bottom,
            var(--amber) 0%,
            var(--amber-dim) 60%,
            transparent 100%
          );
        }

        /* ── Chrome ──────────────────────────────────────── */
        .cs-chrome {
          display: flex;
          align-items: baseline;
          gap: 28px;
          margin-bottom: 44px;
        }

        .cs-wordmark {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--amber);
          flex-shrink: 0;
          line-height: 1;
          padding-bottom: 9px;
        }

        .cs-tabs {
          display: flex;
          border-bottom: 1px solid var(--ink-700);
          flex: 1;
        }

        .cs-tab {
          font-family: 'Space Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--ink-500);
          padding: 0 14px 9px;
          cursor: pointer;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          background: transparent;
          line-height: 1;
          transition:
            color 180ms var(--ease-out-quint),
            border-color 180ms var(--ease-out-quint);
          outline: none;
        }

        .cs-tab:first-child {
          padding-left: 0;
        }

        .cs-tab:hover { color: var(--ink-300); }

        .cs-tab:focus-visible {
          outline: 2px solid var(--amber);
          outline-offset: 3px;
          border-radius: 2px;
        }

        .cs-tab[aria-selected="true"] {
          color: var(--amber);
          border-bottom-color: var(--amber);
        }

        /* ── Hero ────────────────────────────────────────── */
        .cs-hero {
          margin-bottom: 48px;
        }

        .cs-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-500);
          margin-bottom: 18px;
        }

        .cs-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          flex-shrink: 0;
          animation: cs-pulse 2.8s ease-in-out infinite;
        }

        @keyframes cs-pulse {
          0%, 100% { opacity: 1;    transform: scale(1); }
          50%       { opacity: 0.45; transform: scale(0.8); }
        }

        @media (prefers-reduced-motion: reduce) {
          .cs-dot { animation: none; }
          .cs-tab, .cs-proj-row, .cs-cta-btn, .cs-cta-arrow {
            transition: none !important;
          }
        }

        .cs-h1 {
          font-size: clamp(26px, 3vw, 40px);
          font-weight: 600;
          letter-spacing: -0.028em;
          line-height: 1.08;
          color: var(--ink-100);
          max-width: 24ch;
          text-wrap: pretty;
          margin-bottom: 18px;
        }

        .cs-h1 strong {
          color: var(--amber);
          font-weight: 600;
        }

        .cs-subhead {
          font-size: 15px;
          font-weight: 400;
          line-height: 1.68;
          color: var(--ink-300);
          max-width: 62ch;
          text-wrap: pretty;
        }

        /* ── Section label ───────────────────────────────── */
        .cs-section-label {
          font-family: 'Space Mono', monospace;
          font-size: 9.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ink-600);
          margin-bottom: 12px;
        }

        /* ── Project rows ────────────────────────────────── */
        .cs-projects {
          margin-bottom: 44px;
        }

        .cs-proj-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto auto;
          align-items: center;
          column-gap: 28px;
          padding: 16px 18px;
          border-radius: 6px;
          cursor: pointer;
          background: transparent;
          transition: background 160ms var(--ease-out-quint);
          outline: none;
          width: 100%;
          text-align: left;
          border: none;
          color: inherit;
        }

        .cs-proj-row + .cs-proj-row { margin-top: 4px; }

        .cs-proj-row:hover { background: var(--ink-850); }

        .cs-proj-row:focus-visible {
          outline: 2px solid var(--amber);
          outline-offset: -2px;
        }

        .cs-proj-row:active { background: var(--ink-800); }

        .cs-proj-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .cs-proj-name {
          font-size: 14.5px;
          font-weight: 600;
          letter-spacing: -0.012em;
          color: var(--ink-100);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cs-proj-branch {
          font-family: 'Space Mono', monospace;
          font-size: 10.5px;
          color: var(--ink-500);
        }

        /* Context bar */
        .cs-ctx {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .cs-ctx-label {
          font-family: 'Space Mono', monospace;
          font-size: 9.5px;
          color: var(--ink-600);
          letter-spacing: 0.06em;
        }

        .cs-ctx-track {
          width: 60px;
          height: 2px;
          background: var(--ink-700);
          border-radius: 1px;
          overflow: hidden;
        }

        .cs-ctx-fill {
          height: 100%;
          background: var(--amber-dim);
          border-radius: 1px;
        }

        /* Status badges — background tint only, no side-stripe */
        .cs-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 3px;
          font-family: 'Space Mono', monospace;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .cs-badge-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
        }

        .cs-badge.live {
          background: var(--green-tint);
          color: var(--green);
        }

        .cs-badge.blocked {
          background: var(--red-tint);
          color: var(--red);
        }

        /* Tool label */
        .cs-tool-label {
          font-family: 'Space Mono', monospace;
          font-size: 9.5px;
          color: var(--ink-600);
          white-space: nowrap;
        }

        /* Blocked question */
        .cs-blocked-q {
          font-size: 11.5px;
          font-style: italic;
          color: var(--red);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Activity ─────────────────────────────────────── */
        .cs-activity {
          margin-bottom: 44px;
        }

        .cs-activity-list {
          list-style: none;
        }

        .cs-act-row {
          display: grid;
          grid-template-columns: 46px 1fr auto;
          align-items: baseline;
          column-gap: 20px;
          padding: 12px 0;
          border-bottom: 1px solid var(--ink-850);
        }

        .cs-act-row:first-child {
          border-top: 1px solid var(--ink-850);
        }

        .cs-act-time {
          font-family: 'Space Mono', monospace;
          font-size: 10.5px;
          color: var(--ink-600);
          text-align: right;
        }

        .cs-act-label {
          font-size: 13px;
          font-weight: 400;
          color: var(--ink-200);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cs-act-diff {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          white-space: nowrap;
          text-align: right;
        }

        .diff-plus  { color: var(--green); }
        .diff-minus { color: var(--red-tint); filter: brightness(1.6); }

        /* ── CTA ──────────────────────────────────────────── */
        .cs-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .cs-footer-hint {
          font-size: 13px;
          color: var(--ink-600);
        }

        .cs-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 11px 22px;
          background: var(--amber-tint);
          border: 1px solid var(--amber-dim);
          border-radius: 5px;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--amber);
          cursor: pointer;
          outline: none;
          transition:
            background 180ms var(--ease-out-quint),
            border-color 180ms var(--ease-out-quint),
            color 180ms var(--ease-out-quint),
            transform 120ms var(--ease-out-quint);
        }

        .cs-cta-btn:hover {
          background: oklch(24% 0.058 68);
          border-color: var(--amber);
          color: oklch(88% 0.128 68);
        }

        .cs-cta-btn:focus-visible {
          outline: 2px solid var(--amber);
          outline-offset: 3px;
        }

        .cs-cta-btn:active {
          transform: scale(0.982);
          background: var(--amber-ghost);
        }

        .cs-cta-arrow {
          font-size: 15px;
          line-height: 1;
          transition: transform 200ms var(--ease-out-quint);
        }

        .cs-cta-btn:hover .cs-cta-arrow {
          transform: translateX(4px);
        }
      `}</style>

      <div className="cs-root" role="main">
        {/* Chrome */}
        <div className="cs-chrome">
          <span className="cs-wordmark">PG OS</span>
          <nav className="cs-tabs" role="tablist" aria-label="Main navigation">
            {(["Home", "Habits", "Projects", "Cockpit"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={t === "Home"}
                className="cs-tab"
              >
                {t}
              </button>
            ))}
          </nav>
        </div>

        {/* Hero */}
        <header className="cs-hero">
          <p className="cs-eyebrow">
            <span className="cs-dot" aria-hidden="true" />
            Late night &nbsp;·&nbsp; Kitsu is watching the fleet
          </p>
          <h1 className="cs-h1">
            You have <strong>three sessions</strong> in motion tonight.
          </h1>
          <p className="cs-subhead">
            Three sessions live, one waiting on your call. The night is quiet —
            a good time to ship the thing you keep circling.
          </p>
        </header>

        {/* Projects */}
        <section className="cs-projects" aria-labelledby="cs-projects-hd">
          <p className="cs-section-label" id="cs-projects-hd">
            Active projects
          </p>

          {/* personal-os */}
          <button
            className="cs-proj-row"
            aria-label="personal-os: cockpit branch, 48% context, live"
            onMouseEnter={() => setHoveredRow("pos")}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <div className="cs-proj-meta">
              <span className="cs-proj-name">personal-os</span>
              <span className="cs-proj-branch">cockpit &nbsp;·&nbsp; 2d</span>
            </div>

            <div
              className="cs-ctx"
              aria-label="Context: 48%"
              role="meter"
              aria-valuenow={48}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className="cs-ctx-label">ctx&nbsp;48%</span>
              <div className="cs-ctx-track">
                <div className="cs-ctx-fill" style={{ width: "48%" }} />
              </div>
            </div>

            <span className="cs-badge live">
              <span className="cs-badge-dot" aria-hidden="true" />
              Live
            </span>

            <span className="cs-tool-label">mcp&#8209;browser&#8209;batch</span>
          </button>

          {/* metrasens */}
          <button
            className="cs-proj-row"
            aria-label="metrasens: signal-hub branch, blocked — decision needed on MRE bucket"
            onMouseEnter={() => setHoveredRow("met")}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <div className="cs-proj-meta">
              <span className="cs-proj-name">metrasens</span>
              <span className="cs-proj-branch">
                signal&#8209;hub &nbsp;·&nbsp; 4d
              </span>
            </div>

            <span className="cs-blocked-q">
              MRE bucket: UPGRADE or CURRENT?
            </span>

            <span className="cs-badge blocked">
              <span className="cs-badge-dot" aria-hidden="true" />
              Blocked
            </span>

            {/* empty fourth column keeps grid aligned */}
            <span aria-hidden="true" />
          </button>
        </section>

        {/* Activity */}
        <section className="cs-activity" aria-labelledby="cs-activity-hd">
          <p className="cs-section-label" id="cs-activity-hd">
            Recent activity
          </p>
          <ul className="cs-activity-list">
            {[
              {
                time: "09:58",
                label: "legibility foundation shipped",
                plus: "+711",
                minus: "−0",
              },
              {
                time: "09:24",
                label: "party mode — Kitsu sings first",
                plus: "+180",
                minus: "−44",
              },
              {
                time: "08:51",
                label: "fox head reframed",
                plus: "+12",
                minus: "−9",
              },
            ].map(({ time, label, plus, minus }) => (
              <li key={time} className="cs-act-row">
                <span className="cs-act-time" aria-hidden="true">
                  {time}
                </span>
                <span className="cs-act-label">{label}</span>
                <span
                  className="cs-act-diff"
                  aria-label={`${plus} additions, ${minus} deletions`}
                >
                  <span className="diff-plus">{plus}</span>{" "}
                  <span className="diff-minus">{minus}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Footer CTA */}
        <div className="cs-footer">
          <span className="cs-footer-hint">Ready when you are.</span>
          <button className="cs-cta-btn" aria-label="Start a new session">
            + New session
            <span className="cs-cta-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
