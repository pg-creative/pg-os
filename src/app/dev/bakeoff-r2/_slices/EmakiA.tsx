"use client";

import React from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   EmakiA — "as conceived" NIGHT arm
   Palette: ink-black backdrop · ember accent · aged-cream text · gold-dust borders
   Hero: /art/aesthetic-2026-05-20/nioh-hero_0.png (deep ink night sky painting)
───────────────────────────────────────────────────────────────────────────── */

const TOKENS = {
  bg: "#09070A",
  rail: "#0D0A07",
  accent: "#E8922A",
  accentDim: "#8B5E1A",
  gold: "#8B6914",
  goldBright: "#C9952A",
  text: "#E8D9B8",
  textMuted: "#A89070",
  inset: "rgba(20,14,8,0.88)",
  border: "rgba(139,105,20,0.55)",
  hero: "/art/aesthetic-2026-05-20/nioh-hero_0.png",
  kitsu: "/agent-office/pixel/marvis-kitsune.png",
};

const NAV_ITEMS = [
  { label: "Home", active: true },
  { label: "Habits", active: false },
  { label: "Projects", active: false },
  { label: "Flow", active: false },
  { label: "Claude", active: false },
];

const ACTIVITY = [
  { time: "09:58", msg: "legibility foundation shipped", diff: "+711 −0" },
  { time: "09:24", msg: "party mode — Kitsu sings first", diff: "+180 −44" },
  { time: "08:51", msg: "fox head reframed", diff: "+12 −9" },
];

export default function EmakiA() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&family=Inter:wght@400;700&display=swap');

        .emaki-a-root {
          position: relative;
          width: 100%;
          min-height: 640px;
          background: ${TOKENS.bg};
          font-family: 'Inter', sans-serif;
          color: ${TOKENS.text};
          overflow: hidden;
        }

        /* Full-bleed painted backdrop */
        .emaki-a-backdrop {
          position: absolute;
          inset: 0;
          background-image: url('${TOKENS.hero}');
          background-size: cover;
          background-position: center top;
          mix-blend-mode: screen;
          opacity: 0.18;
          pointer-events: none;
          will-change: transform;
        }
        .emaki-a-backdrop-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(9,7,10,0.55) 0%,
            rgba(9,7,10,0.20) 35%,
            rgba(9,7,10,0.70) 80%,
            rgba(9,7,10,0.95) 100%
          );
          pointer-events: none;
        }

        /* Parallax distant layer (slower) */
        .emaki-a-parallax-far {
          position: absolute;
          inset: 0;
          background-image: url('${TOKENS.hero}');
          background-size: 110% auto;
          background-position: center 10%;
          opacity: 0.28;
          transform: scale(1.05);
          pointer-events: none;
          filter: blur(1px) brightness(0.4);
        }

        /* Nav rail */
        .emaki-a-rail {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 40px;
          background: ${TOKENS.rail};
          border-right: 1px solid ${TOKENS.border};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 28px;
          z-index: 20;
        }
        .emaki-a-nav-item {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-family: 'Noto Serif JP', serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: ${TOKENS.textMuted};
          cursor: pointer;
          transition: color 0.2s;
          user-select: none;
        }
        .emaki-a-nav-item.active {
          color: ${TOKENS.accent};
        }
        .emaki-a-nav-indicator {
          position: absolute;
          left: 0;
          width: 3px;
          height: 28px;
          background: ${TOKENS.accent};
          border-radius: 0 2px 2px 0;
          top: 50%;
          transform: translateY(-50%);
        }

        /* Wordmark */
        .emaki-a-wordmark {
          position: absolute;
          top: 18px;
          left: 56px;
          font-family: 'Noto Serif JP', serif;
          font-size: 15px;
          font-weight: 700;
          color: ${TOKENS.accent};
          letter-spacing: 0.18em;
          z-index: 20;
        }

        /* Main scroll content */
        .emaki-a-content {
          position: relative;
          z-index: 10;
          max-width: 900px;
          margin: 0 auto;
          padding: 60px 32px 120px 72px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        /* Hero section */
        .emaki-a-hero {
          padding-top: 32px;
        }
        .emaki-a-eyebrow {
          font-size: 11px;
          font-weight: 400;
          color: ${TOKENS.textMuted};
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .emaki-a-h1 {
          font-family: 'Noto Serif JP', serif;
          font-size: clamp(26px, 4vw, 38px);
          font-weight: 700;
          line-height: 1.25;
          color: ${TOKENS.text};
          margin-bottom: 12px;
        }
        .emaki-a-h1 .kanji-accent {
          color: ${TOKENS.accent};
        }
        .emaki-a-subhead {
          font-size: 13px;
          line-height: 1.65;
          color: ${TOKENS.textMuted};
          max-width: 520px;
        }

        /* Paper inset panels */
        .emaki-a-inset {
          background: ${TOKENS.inset};
          border: 1px solid ${TOKENS.border};
          border-radius: 4px;
          padding: 16px 20px;
          position: relative;
          overflow: hidden;
        }
        .emaki-a-inset::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(139,105,20,0.06) 0%, transparent 60%);
          pointer-events: none;
        }
        .emaki-a-inset-label {
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: ${TOKENS.gold};
          margin-bottom: 10px;
          font-family: 'Noto Serif JP', serif;
        }

        /* Project insets grid */
        .emaki-a-projects {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 600px) {
          .emaki-a-projects { grid-template-columns: 1fr; }
        }
        .emaki-a-project-name {
          font-family: 'Noto Serif JP', serif;
          font-size: 16px;
          font-weight: 700;
          color: ${TOKENS.text};
          margin-bottom: 6px;
        }
        .emaki-a-project-meta {
          font-size: 12px;
          color: ${TOKENS.textMuted};
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }
        .emaki-a-meta-pill {
          background: rgba(139,105,20,0.15);
          border: 1px solid ${TOKENS.border};
          border-radius: 20px;
          padding: 2px 8px;
          font-size: 11px;
          color: ${TOKENS.goldBright};
        }
        .emaki-a-meta-pill.alert {
          background: rgba(220,50,40,0.15);
          border-color: rgba(220,50,40,0.4);
          color: #E87060;
        }
        .emaki-a-ctx-bar {
          height: 3px;
          background: rgba(139,105,20,0.2);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 8px;
        }
        .emaki-a-ctx-fill {
          height: 100%;
          background: linear-gradient(90deg, ${TOKENS.accent}, ${TOKENS.gold});
          border-radius: 2px;
          width: 48%;
        }

        /* Activity section */
        .emaki-a-section-title {
          font-family: 'Noto Serif JP', serif;
          font-size: 11px;
          font-weight: 700;
          color: ${TOKENS.gold};
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .emaki-a-activity-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(139,105,20,0.15);
          font-size: 13px;
        }
        .emaki-a-activity-row:last-child { border-bottom: none; }
        .emaki-a-time {
          font-size: 11px;
          color: ${TOKENS.textMuted};
          font-variant-numeric: tabular-nums;
          min-width: 38px;
        }
        .emaki-a-activity-msg { color: ${TOKENS.text}; flex: 1; }
        .emaki-a-diff {
          font-size: 11px;
          color: ${TOKENS.gold};
          font-variant-numeric: tabular-nums;
        }

        /* CTA */
        .emaki-a-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid ${TOKENS.accent};
          border-radius: 3px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          color: ${TOKENS.accent};
          cursor: pointer;
          letter-spacing: 0.08em;
          transition: background 0.2s, color 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .emaki-a-cta:hover {
          background: rgba(232,146,42,0.12);
        }

        /* Kitsu pod */
        .emaki-a-kitsu-pod {
          position: fixed;
          bottom: 28px;
          right: 24px;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: radial-gradient(circle at center, rgba(139,105,20,0.4) 0%, rgba(9,7,10,0.9) 70%);
          border: 1.5px solid ${TOKENS.gold};
          box-shadow: 0 0 18px rgba(232,146,42,0.25), 0 4px 16px rgba(0,0,0,0.6);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: emaki-a-bob 2s ease-in-out infinite;
          z-index: 50;
        }
        .emaki-a-kitsu-pod img {
          width: 58px;
          height: 58px;
          object-fit: contain;
          image-rendering: pixelated;
        }
        @keyframes emaki-a-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }

        /* Ink-seam decorative divider */
        .emaki-a-seam {
          height: 1px;
          background: linear-gradient(90deg, transparent, ${TOKENS.border}, ${TOKENS.gold}, ${TOKENS.border}, transparent);
          margin: 4px 0;
          opacity: 0.6;
        }
      `}</style>

      <div className="emaki-a-root">
        {/* Parallax far backdrop */}
        <div className="emaki-a-parallax-far" />
        {/* Painting at screen blend */}
        <div className="emaki-a-backdrop" />
        {/* Dark overlay gradient */}
        <div className="emaki-a-backdrop-overlay" />

        {/* Nav rail */}
        <nav className="emaki-a-rail" aria-label="Primary navigation">
          <div className="emaki-a-nav-indicator" />
          {NAV_ITEMS.map((item) => (
            <span
              key={item.label}
              className={`emaki-a-nav-item${item.active ? " active" : ""}`}
              role="button"
              tabIndex={0}
            >
              {item.label}
            </span>
          ))}
        </nav>

        {/* Wordmark */}
        <div className="emaki-a-wordmark">PG OS</div>

        {/* Main scroll */}
        <main className="emaki-a-content">
          {/* Hero */}
          <section className="emaki-a-hero">
            <div className="emaki-a-eyebrow">
              Late night · Kitsu is watching the fleet
            </div>
            <h1 className="emaki-a-h1">
              深夜の航路
              <br />
              <span
                className="kanji-accent"
                style={{ fontSize: "0.7em", fontWeight: 400 }}
              >
                The Late-Night Transit
              </span>
            </h1>
            <p className="emaki-a-subhead">
              Three sessions live, one waiting on your call. The night is quiet
              — a good time to ship the thing you keep circling.
            </p>
          </section>

          <div className="emaki-a-seam" />

          {/* Projects */}
          <section>
            <div className="emaki-a-section-title">Active sessions</div>
            <div className="emaki-a-projects">
              {/* Project 1 */}
              <div className="emaki-a-inset">
                <div className="emaki-a-inset-label">Session</div>
                <div className="emaki-a-project-name">personal-os</div>
                <div className="emaki-a-project-meta">
                  <span className="emaki-a-meta-pill">cockpit · 2d</span>
                  <span className="emaki-a-meta-pill">48% ctx</span>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: TOKENS.textMuted,
                    marginBottom: 4,
                  }}
                >
                  mcp_claude-in-chrome__browser_batch
                </div>
                <div className="emaki-a-ctx-bar">
                  <div className="emaki-a-ctx-fill" />
                </div>
              </div>

              {/* Project 2 */}
              <div className="emaki-a-inset">
                <div className="emaki-a-inset-label">Session</div>
                <div className="emaki-a-project-name">metrasens</div>
                <div className="emaki-a-project-meta">
                  <span className="emaki-a-meta-pill">signal-hub · 4d</span>
                  <span className="emaki-a-meta-pill alert">blocked</span>
                </div>
                <div
                  style={{ fontSize: "11px", color: "#E87060", marginTop: 4 }}
                >
                  MRE bucket — UPGRADE or CURRENT?
                </div>
              </div>
            </div>
          </section>

          <div className="emaki-a-seam" />

          {/* Activity */}
          <section>
            <div className="emaki-a-inset">
              <div className="emaki-a-section-title">Recent activity</div>
              {ACTIVITY.map((row, i) => (
                <div className="emaki-a-activity-row" key={i}>
                  <span className="emaki-a-time">{row.time}</span>
                  <span className="emaki-a-activity-msg">{row.msg}</span>
                  <span className="emaki-a-diff">{row.diff}</span>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div>
            <button className="emaki-a-cta" type="button">
              + New session →
            </button>
          </div>
        </main>

        {/* Kitsu pod — fixed bottom-right */}
        <div className="emaki-a-kitsu-pod" title="Kitsu">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TOKENS.kitsu} alt="Kitsu" />
        </div>
      </div>
    </>
  );
}
