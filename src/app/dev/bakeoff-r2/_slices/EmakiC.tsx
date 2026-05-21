"use client";

import React from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   EmakiC — "Nioh kodama kitsune" arm  (fox-spirit world)
   Same Emaki structure as A/B. Skin swap:
   · Backdrop: /art/aesthetic-2026-05-20/onmyoji-hero_0.png — deep sumi-ink spirit forest atmosphere
   · Palette: deepest ink black · kintsugi-gold seams · foxfire teal-green embers
   · Added CSS layers: drifting kodama spirit orbs + floating foxfire embers
   · Insets: kintsugi-crack gold seam borders, sumi-ink panels
   · The most Kitsu-native: we're inside the spirit realm
───────────────────────────────────────────────────────────────────────────── */

const TOKENS = {
  bg: "#060508",
  rail: "#080609",
  accent: "#4ECDC4", // foxfire teal
  accentDim: "#2A8A84",
  gold: "#C9A227", // kintsugi gold
  goldBright: "#E8C44A",
  foxfire: "#6FE8C4", // bright foxfire
  foxfireGlow: "#2EECD4",
  text: "#DDD5C8",
  textMuted: "#7A7060",
  inset: "rgba(12,8,14,0.90)",
  border: "rgba(201,162,39,0.45)",
  hero: "/art/aesthetic-2026-05-20/onmyoji-hero_0.png",
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

/* Kodama/foxfire orbs — positions seeded for natural scatter */
const ORBS = [
  { top: "12%", left: "18%", size: 8, dur: 7, delay: 0 },
  { top: "24%", left: "72%", size: 6, dur: 9, delay: 1.2 },
  { top: "38%", left: "42%", size: 10, dur: 6, delay: 2.5 },
  { top: "55%", left: "85%", size: 7, dur: 8, delay: 0.8 },
  { top: "67%", left: "28%", size: 5, dur: 10, delay: 3.1 },
  { top: "78%", left: "61%", size: 9, dur: 7.5, delay: 1.7 },
  { top: "15%", left: "55%", size: 6, dur: 8.5, delay: 4.0 },
  { top: "44%", left: "8%", size: 7, dur: 6.8, delay: 2.0 },
  { top: "32%", left: "90%", size: 5, dur: 9.2, delay: 0.5 },
  { top: "88%", left: "78%", size: 8, dur: 7.2, delay: 3.5 },
  { top: "6%", left: "35%", size: 6, dur: 11, delay: 1.0 },
  { top: "72%", left: "15%", size: 4, dur: 8.0, delay: 2.8 },
];

export default function EmakiC() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&family=Inter:wght@400;700&display=swap');

        .emaki-c-root {
          position: relative;
          width: 100%;
          min-height: 640px;
          background: ${TOKENS.bg};
          font-family: 'Inter', sans-serif;
          color: ${TOKENS.text};
          overflow: hidden;
        }

        /* Deep sumi-ink painting backdrop */
        .emaki-c-backdrop {
          position: absolute;
          inset: 0;
          background-image: url('${TOKENS.hero}');
          background-size: cover;
          background-position: center top;
          mix-blend-mode: soft-light;
          opacity: 0.35;
          pointer-events: none;
        }
        .emaki-c-backdrop-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(6,5,8,0.50) 0%,
            rgba(6,5,8,0.15) 35%,
            rgba(6,5,8,0.65) 78%,
            rgba(6,5,8,0.97) 100%
          );
          pointer-events: none;
        }
        /* Foxfire ambient color wash from below */
        .emaki-c-foxfire-wash {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 40%;
          background: radial-gradient(ellipse at 30% 100%, rgba(78,205,196,0.08) 0%, transparent 65%),
                      radial-gradient(ellipse at 70% 100%, rgba(201,162,39,0.07) 0%, transparent 55%);
          pointer-events: none;
        }

        /* Parallax far */
        .emaki-c-parallax-far {
          position: absolute;
          inset: 0;
          background-image: url('${TOKENS.hero}');
          background-size: 112% auto;
          background-position: center 15%;
          opacity: 0.20;
          transform: scale(1.06);
          pointer-events: none;
          filter: blur(1px) brightness(0.35) hue-rotate(15deg);
        }

        /* Drifting kodama/foxfire orbs layer */
        .emaki-c-orb {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(111,232,196,0.9), rgba(46,236,212,0.3) 60%, transparent);
          pointer-events: none;
          animation: emaki-c-drift var(--orb-dur, 8s) ease-in-out infinite var(--orb-delay, 0s);
          box-shadow: 0 0 calc(var(--orb-size, 8px) * 1.5) rgba(78,205,196,0.5);
        }
        @keyframes emaki-c-drift {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.6; }
          25%  { transform: translate(6px, -8px) scale(1.1); opacity: 0.9; }
          50%  { transform: translate(-4px, -14px) scale(0.95); opacity: 0.7; }
          75%  { transform: translate(8px, -6px) scale(1.05); opacity: 0.85; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
        }

        /* Kintsugi seam decorative line */
        .emaki-c-kintsugi {
          height: 1px;
          position: relative;
          margin: 6px 0;
        }
        .emaki-c-kintsugi::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(201,162,39,0.3) 15%,
            rgba(232,196,74,0.8) 40%,
            rgba(201,162,39,1.0) 50%,
            rgba(232,196,74,0.8) 60%,
            rgba(201,162,39,0.3) 85%,
            transparent 100%
          );
          /* Irregular kintsugi crack feel via clip-path */
          clip-path: polygon(
            0% 50%, 8% 20%, 16% 70%, 24% 30%, 32% 60%, 40% 10%,
            48% 80%, 56% 25%, 64% 65%, 72% 35%, 80% 55%, 88% 15%,
            96% 70%, 100% 50%
          );
        }

        /* Nav rail */
        .emaki-c-rail {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 40px;
          background: ${TOKENS.rail};
          border-right: 1px solid rgba(201,162,39,0.35);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 28px;
          z-index: 20;
        }
        .emaki-c-nav-item {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-family: 'Noto Serif JP', serif;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em;
          color: ${TOKENS.textMuted};
          cursor: pointer;
          transition: color 0.2s;
          user-select: none;
        }
        .emaki-c-nav-item.active { color: ${TOKENS.foxfire}; }
        .emaki-c-nav-indicator {
          position: absolute;
          left: 0; width: 3px; height: 28px;
          background: linear-gradient(180deg, ${TOKENS.foxfireGlow}, ${TOKENS.accent});
          border-radius: 0 2px 2px 0;
          top: 50%; transform: translateY(-50%);
          box-shadow: 0 0 8px rgba(78,205,196,0.7);
        }

        .emaki-c-wordmark {
          position: absolute;
          top: 18px; left: 56px;
          font-family: 'Noto Serif JP', serif;
          font-size: 15px; font-weight: 700;
          color: ${TOKENS.goldBright};
          letter-spacing: 0.18em;
          z-index: 20;
          text-shadow: 0 0 14px rgba(78,205,196,0.35);
        }

        .emaki-c-content {
          position: relative;
          z-index: 10;
          max-width: 900px;
          margin: 0 auto;
          padding: 60px 32px 120px 72px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .emaki-c-eyebrow {
          font-size: 11px; font-weight: 400;
          color: ${TOKENS.textMuted};
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .emaki-c-h1 {
          font-family: 'Noto Serif JP', serif;
          font-size: clamp(26px, 4vw, 38px);
          font-weight: 700;
          line-height: 1.25;
          color: ${TOKENS.text};
          margin-bottom: 12px;
        }
        .emaki-c-h1 .spirit-accent { color: ${TOKENS.foxfire}; }
        .emaki-c-subhead {
          font-size: 13px; line-height: 1.65;
          color: ${TOKENS.textMuted};
          max-width: 520px;
        }

        /* Sumi-ink insets with kintsugi border shimmer */
        .emaki-c-inset {
          background: ${TOKENS.inset};
          border: 1px solid ${TOKENS.border};
          border-radius: 4px;
          padding: 16px 20px;
          position: relative;
          overflow: hidden;
        }
        .emaki-c-inset::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(145deg, rgba(78,205,196,0.05) 0%, transparent 50%);
          pointer-events: none;
        }
        /* Kintsugi corner seam */
        .emaki-c-inset::after {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 40%; height: 2px;
          background: linear-gradient(90deg, rgba(232,196,74,0.8), transparent);
        }
        .emaki-c-inset-label {
          font-size: 10px; letter-spacing: 0.15em;
          text-transform: uppercase;
          color: ${TOKENS.gold};
          margin-bottom: 10px;
          font-family: 'Noto Serif JP', serif;
        }

        .emaki-c-projects {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 600px) { .emaki-c-projects { grid-template-columns: 1fr; } }

        .emaki-c-project-name {
          font-family: 'Noto Serif JP', serif;
          font-size: 16px; font-weight: 700;
          color: ${TOKENS.text};
          margin-bottom: 6px;
        }
        .emaki-c-project-meta {
          display: flex; flex-wrap: wrap; gap: 6px;
          margin-bottom: 8px;
        }
        .emaki-c-meta-pill {
          background: rgba(78,205,196,0.10);
          border: 1px solid rgba(78,205,196,0.30);
          border-radius: 20px;
          padding: 2px 8px;
          font-size: 11px;
          color: ${TOKENS.foxfire};
        }
        .emaki-c-meta-pill.alert {
          background: rgba(220,60,40,0.15);
          border-color: rgba(220,60,40,0.40);
          color: #F08070;
        }
        .emaki-c-ctx-bar {
          height: 3px;
          background: rgba(78,205,196,0.12);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 8px;
        }
        .emaki-c-ctx-fill {
          height: 100%;
          background: linear-gradient(90deg, ${TOKENS.foxfireGlow}, ${TOKENS.accent});
          border-radius: 2px;
          width: 48%;
          box-shadow: 0 0 6px rgba(78,205,196,0.5);
        }

        .emaki-c-section-title {
          font-family: 'Noto Serif JP', serif;
          font-size: 11px; font-weight: 700;
          color: ${TOKENS.gold};
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .emaki-c-activity-row {
          display: flex; align-items: baseline;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(78,205,196,0.10);
          font-size: 13px;
        }
        .emaki-c-activity-row:last-child { border-bottom: none; }
        .emaki-c-time {
          font-size: 11px; color: ${TOKENS.textMuted};
          font-variant-numeric: tabular-nums;
          min-width: 38px;
        }
        .emaki-c-activity-msg { color: ${TOKENS.text}; flex: 1; }
        .emaki-c-diff {
          font-size: 11px; color: ${TOKENS.foxfire};
          font-variant-numeric: tabular-nums;
        }

        .emaki-c-cta {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(78,205,196,0.08);
          border: 1px solid rgba(78,205,196,0.45);
          border-radius: 3px;
          padding: 10px 20px;
          font-size: 13px; font-weight: 700;
          color: ${TOKENS.foxfire};
          cursor: pointer; letter-spacing: 0.08em;
          transition: background 0.2s, box-shadow 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .emaki-c-cta:hover {
          background: rgba(78,205,196,0.15);
          box-shadow: 0 0 12px rgba(78,205,196,0.25);
        }

        /* Kitsu pod — foxfire spirit realm glow */
        .emaki-c-kitsu-pod {
          position: fixed;
          bottom: 28px; right: 24px;
          width: 72px; height: 72px;
          border-radius: 50%;
          background: radial-gradient(circle at center, rgba(78,205,196,0.25) 0%, rgba(6,5,8,0.94) 70%);
          border: 1.5px solid rgba(201,162,39,0.7);
          box-shadow:
            0 0 18px rgba(78,205,196,0.4),
            0 0 36px rgba(78,205,196,0.15),
            0 0 8px rgba(201,162,39,0.4),
            0 4px 16px rgba(0,0,0,0.7);
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          animation: emaki-c-bob 2s ease-in-out infinite;
          z-index: 50;
        }
        /* Foxfire rim around Kitsu pod */
        .emaki-c-kitsu-pod::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            rgba(78,205,196,0.6) 0deg,
            rgba(201,162,39,0.5) 90deg,
            rgba(78,205,196,0.3) 180deg,
            rgba(201,162,39,0.6) 270deg,
            rgba(78,205,196,0.6) 360deg
          );
          animation: emaki-c-spin 6s linear infinite;
          z-index: -1;
        }
        .emaki-c-kitsu-pod img {
          width: 58px; height: 58px;
          object-fit: contain;
          image-rendering: pixelated;
          position: relative;
          z-index: 1;
        }
        @keyframes emaki-c-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes emaki-c-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="emaki-c-root">
        <div className="emaki-c-parallax-far" />
        <div className="emaki-c-backdrop" />
        <div className="emaki-c-backdrop-overlay" />
        <div className="emaki-c-foxfire-wash" />

        {/* Drifting kodama spirit orbs */}
        {ORBS.map((orb, i) => (
          <div
            key={i}
            className="emaki-c-orb"
            style={{
              top: orb.top,
              left: orb.left,
              width: orb.size,
              height: orb.size,
              ["--orb-dur" as string]: `${orb.dur}s`,
              ["--orb-delay" as string]: `${orb.delay}s`,
            }}
          />
        ))}

        <nav className="emaki-c-rail" aria-label="Primary navigation">
          <div className="emaki-c-nav-indicator" />
          {NAV_ITEMS.map((item) => (
            <span
              key={item.label}
              className={`emaki-c-nav-item${item.active ? " active" : ""}`}
              role="button"
              tabIndex={0}
            >
              {item.label}
            </span>
          ))}
        </nav>

        <div className="emaki-c-wordmark">PG OS</div>

        <main className="emaki-c-content">
          <section>
            <div className="emaki-c-eyebrow">
              Late night · Kitsu is watching the fleet
            </div>
            <h1 className="emaki-c-h1">
              狐火の道
              <br />
              <span
                className="spirit-accent"
                style={{ fontSize: "0.7em", fontWeight: 400 }}
              >
                The Foxfire Path
              </span>
            </h1>
            <p className="emaki-c-subhead">
              Three sessions live, one waiting on your call. The night is quiet
              — a good time to ship the thing you keep circling.
            </p>
          </section>

          <div className="emaki-c-kintsugi" />

          <section>
            <div className="emaki-c-section-title">Active sessions</div>
            <div className="emaki-c-projects">
              <div className="emaki-c-inset">
                <div className="emaki-c-inset-label">Session</div>
                <div className="emaki-c-project-name">personal-os</div>
                <div className="emaki-c-project-meta">
                  <span className="emaki-c-meta-pill">cockpit · 2d</span>
                  <span className="emaki-c-meta-pill">48% ctx</span>
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
                <div className="emaki-c-ctx-bar">
                  <div className="emaki-c-ctx-fill" />
                </div>
              </div>

              <div className="emaki-c-inset">
                <div className="emaki-c-inset-label">Session</div>
                <div className="emaki-c-project-name">metrasens</div>
                <div className="emaki-c-project-meta">
                  <span className="emaki-c-meta-pill">signal-hub · 4d</span>
                  <span className="emaki-c-meta-pill alert">blocked</span>
                </div>
                <div
                  style={{ fontSize: "11px", color: "#F08070", marginTop: 4 }}
                >
                  MRE bucket — UPGRADE or CURRENT?
                </div>
              </div>
            </div>
          </section>

          <div className="emaki-c-kintsugi" />

          <section>
            <div className="emaki-c-inset">
              <div className="emaki-c-section-title">Recent activity</div>
              {ACTIVITY.map((row, i) => (
                <div className="emaki-c-activity-row" key={i}>
                  <span className="emaki-c-time">{row.time}</span>
                  <span className="emaki-c-activity-msg">{row.msg}</span>
                  <span className="emaki-c-diff">{row.diff}</span>
                </div>
              ))}
            </div>
          </section>

          <div>
            <button className="emaki-c-cta" type="button">
              + New session →
            </button>
          </div>
        </main>

        <div className="emaki-c-kitsu-pod" title="Kitsu">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TOKENS.kitsu} alt="Kitsu" />
        </div>
      </div>
    </>
  );
}
