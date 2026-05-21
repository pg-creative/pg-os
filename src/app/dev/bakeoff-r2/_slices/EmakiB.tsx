"use client";

import React from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   EmakiB — "golden-hour" arm  (Studio Ghibli luminous afternoon)
   Same Emaki structure as A. Skin swap:
   · Backdrop: /art/aesthetic-2026-05-20/ghibli-hero_0.png — warm golden-hour castle-in-sky glow
   · Palette: warm cream bg · jewel amber accent · rose-gold borders
   · Insets: warm parchment with sunlit glow
   · Everything reads "the painting is bathed in golden light"
───────────────────────────────────────────────────────────────────────────── */

const TOKENS = {
  bg: "#1A1108",
  rail: "#150E06",
  accent: "#F5A623",
  accentDim: "#C07D10",
  gold: "#D4922A",
  goldBright: "#F5C842",
  roseGold: "#E8A86A",
  text: "#FDF0D5",
  textMuted: "#B8936A",
  inset: "rgba(42,26,10,0.84)",
  border: "rgba(212,146,42,0.50)",
  hero: "/art/aesthetic-2026-05-20/ghibli-hero_0.png",
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

export default function EmakiB() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&family=Inter:wght@400;700&display=swap');

        .emaki-b-root {
          position: relative;
          width: 100%;
          min-height: 640px;
          background: ${TOKENS.bg};
          font-family: 'Inter', sans-serif;
          color: ${TOKENS.text};
          overflow: hidden;
        }

        /* Golden-hour painting — more luminous, multiply blend for warmth */
        .emaki-b-backdrop {
          position: absolute;
          inset: 0;
          background-image: url('${TOKENS.hero}');
          background-size: cover;
          background-position: center 30%;
          mix-blend-mode: luminosity;
          opacity: 0.32;
          pointer-events: none;
        }
        .emaki-b-backdrop-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(26,17,8,0.38) 0%,
            rgba(26,17,8,0.10) 30%,
            rgba(26,17,8,0.55) 75%,
            rgba(26,17,8,0.92) 100%
          );
          pointer-events: none;
        }
        /* Warm golden sun-glow from above */
        .emaki-b-sunbeam {
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 420px;
          background: radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.22) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Parallax far layer */
        .emaki-b-parallax-far {
          position: absolute;
          inset: 0;
          background-image: url('${TOKENS.hero}');
          background-size: 115% auto;
          background-position: center 20%;
          opacity: 0.22;
          transform: scale(1.04);
          pointer-events: none;
          filter: blur(0.5px) brightness(0.65) sepia(0.3);
        }

        /* Nav rail — warmer lacquer */
        .emaki-a-rail {
          position: absolute;
          left: 0; top: 0; bottom: 0;
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
        .emaki-b-nav-item {
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
        .emaki-b-nav-item.active { color: ${TOKENS.accent}; }
        .emaki-b-nav-indicator {
          position: absolute;
          left: 0; width: 3px; height: 28px;
          background: linear-gradient(180deg, ${TOKENS.goldBright}, ${TOKENS.accent});
          border-radius: 0 2px 2px 0;
          top: 50%; transform: translateY(-50%);
          box-shadow: 0 0 6px rgba(245,200,66,0.5);
        }

        .emaki-b-wordmark {
          position: absolute;
          top: 18px; left: 56px;
          font-family: 'Noto Serif JP', serif;
          font-size: 15px; font-weight: 700;
          color: ${TOKENS.goldBright};
          letter-spacing: 0.18em;
          z-index: 20;
          text-shadow: 0 0 12px rgba(245,200,66,0.4);
        }

        .emaki-b-content {
          position: relative;
          z-index: 10;
          max-width: 900px;
          margin: 0 auto;
          padding: 60px 32px 120px 72px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        /* Hero — warm golden morning header */
        .emaki-b-eyebrow {
          font-size: 11px; font-weight: 400;
          color: ${TOKENS.textMuted};
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .emaki-b-h1 {
          font-family: 'Noto Serif JP', serif;
          font-size: clamp(26px, 4vw, 38px);
          font-weight: 700;
          line-height: 1.25;
          color: ${TOKENS.text};
          margin-bottom: 12px;
          text-shadow: 0 2px 12px rgba(245,166,35,0.18);
        }
        .emaki-b-h1 .golden-accent { color: ${TOKENS.goldBright}; }
        .emaki-b-subhead {
          font-size: 13px; line-height: 1.65;
          color: ${TOKENS.textMuted};
          max-width: 520px;
        }

        /* Warm parchment insets */
        .emaki-b-inset {
          background: ${TOKENS.inset};
          border: 1px solid ${TOKENS.border};
          border-radius: 4px;
          padding: 16px 20px;
          position: relative;
          overflow: hidden;
        }
        /* Sunlit corner gleam */
        .emaki-b-inset::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(245,200,66,0.10) 0%, transparent 55%);
          pointer-events: none;
        }
        .emaki-b-inset-label {
          font-size: 10px; letter-spacing: 0.15em;
          text-transform: uppercase;
          color: ${TOKENS.gold};
          margin-bottom: 10px;
          font-family: 'Noto Serif JP', serif;
        }

        .emaki-b-projects {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 600px) { .emaki-b-projects { grid-template-columns: 1fr; } }

        .emaki-b-project-name {
          font-family: 'Noto Serif JP', serif;
          font-size: 16px; font-weight: 700;
          color: ${TOKENS.text};
          margin-bottom: 6px;
        }
        .emaki-b-project-meta {
          display: flex; flex-wrap: wrap; gap: 6px;
          margin-bottom: 8px;
        }
        .emaki-b-meta-pill {
          background: rgba(212,146,42,0.18);
          border: 1px solid ${TOKENS.border};
          border-radius: 20px;
          padding: 2px 8px;
          font-size: 11px;
          color: ${TOKENS.goldBright};
        }
        .emaki-b-meta-pill.alert {
          background: rgba(220,80,60,0.15);
          border-color: rgba(220,80,60,0.4);
          color: #F0806A;
        }
        .emaki-b-ctx-bar {
          height: 3px;
          background: rgba(212,146,42,0.18);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 8px;
        }
        .emaki-b-ctx-fill {
          height: 100%;
          background: linear-gradient(90deg, ${TOKENS.goldBright}, ${TOKENS.roseGold});
          border-radius: 2px;
          width: 48%;
          box-shadow: 0 0 6px rgba(245,200,66,0.4);
        }

        .emaki-b-section-title {
          font-family: 'Noto Serif JP', serif;
          font-size: 11px; font-weight: 700;
          color: ${TOKENS.gold};
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .emaki-b-activity-row {
          display: flex; align-items: baseline;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(212,146,42,0.15);
          font-size: 13px;
        }
        .emaki-b-activity-row:last-child { border-bottom: none; }
        .emaki-b-time {
          font-size: 11px; color: ${TOKENS.textMuted};
          font-variant-numeric: tabular-nums;
          min-width: 38px;
        }
        .emaki-b-activity-msg { color: ${TOKENS.text}; flex: 1; }
        .emaki-b-diff {
          font-size: 11px; color: ${TOKENS.goldBright};
          font-variant-numeric: tabular-nums;
        }

        .emaki-b-cta {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, rgba(245,166,35,0.15), rgba(245,166,35,0.08));
          border: 1px solid ${TOKENS.accent};
          border-radius: 3px;
          padding: 10px 20px;
          font-size: 13px; font-weight: 700;
          color: ${TOKENS.goldBright};
          cursor: pointer; letter-spacing: 0.08em;
          transition: background 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .emaki-b-cta:hover {
          background: linear-gradient(135deg, rgba(245,166,35,0.25), rgba(245,166,35,0.15));
        }

        /* Kitsu pod — golden glow ring */
        .emaki-b-kitsu-pod {
          position: fixed;
          bottom: 28px; right: 24px;
          width: 72px; height: 72px;
          border-radius: 50%;
          background: radial-gradient(circle at center, rgba(245,166,35,0.35) 0%, rgba(26,17,8,0.92) 70%);
          border: 2px solid ${TOKENS.goldBright};
          box-shadow:
            0 0 20px rgba(245,200,66,0.4),
            0 0 40px rgba(245,166,35,0.15),
            0 4px 16px rgba(0,0,0,0.5);
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          animation: emaki-b-bob 2s ease-in-out infinite;
          z-index: 50;
        }
        .emaki-b-kitsu-pod img {
          width: 58px; height: 58px;
          object-fit: contain;
          image-rendering: pixelated;
        }
        @keyframes emaki-b-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }

        .emaki-b-seam {
          height: 1px;
          background: linear-gradient(90deg, transparent, ${TOKENS.border}, ${TOKENS.goldBright}, ${TOKENS.border}, transparent);
          margin: 4px 0;
          opacity: 0.5;
        }
      `}</style>

      <div className="emaki-b-root">
        <div className="emaki-b-parallax-far" />
        <div className="emaki-b-backdrop" />
        <div className="emaki-b-backdrop-overlay" />
        <div className="emaki-b-sunbeam" />

        <nav className="emaki-a-rail" aria-label="Primary navigation">
          <div className="emaki-b-nav-indicator" />
          {NAV_ITEMS.map((item) => (
            <span
              key={item.label}
              className={`emaki-b-nav-item${item.active ? " active" : ""}`}
              role="button"
              tabIndex={0}
            >
              {item.label}
            </span>
          ))}
        </nav>

        <div className="emaki-b-wordmark">PG OS</div>

        <main className="emaki-b-content">
          <section>
            <div className="emaki-b-eyebrow">
              Late night · Kitsu is watching the fleet
            </div>
            <h1 className="emaki-b-h1">
              黄金の刻
              <br />
              <span
                className="golden-accent"
                style={{ fontSize: "0.7em", fontWeight: 400 }}
              >
                The Golden Hour
              </span>
            </h1>
            <p className="emaki-b-subhead">
              Three sessions live, one waiting on your call. The night is quiet
              — a good time to ship the thing you keep circling.
            </p>
          </section>

          <div className="emaki-b-seam" />

          <section>
            <div className="emaki-b-section-title">Active sessions</div>
            <div className="emaki-b-projects">
              <div className="emaki-b-inset">
                <div className="emaki-b-inset-label">Session</div>
                <div className="emaki-b-project-name">personal-os</div>
                <div className="emaki-b-project-meta">
                  <span className="emaki-b-meta-pill">cockpit · 2d</span>
                  <span className="emaki-b-meta-pill">48% ctx</span>
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
                <div className="emaki-b-ctx-bar">
                  <div className="emaki-b-ctx-fill" />
                </div>
              </div>

              <div className="emaki-b-inset">
                <div className="emaki-b-inset-label">Session</div>
                <div className="emaki-b-project-name">metrasens</div>
                <div className="emaki-b-project-meta">
                  <span className="emaki-b-meta-pill">signal-hub · 4d</span>
                  <span className="emaki-b-meta-pill alert">blocked</span>
                </div>
                <div
                  style={{ fontSize: "11px", color: "#F0806A", marginTop: 4 }}
                >
                  MRE bucket — UPGRADE or CURRENT?
                </div>
              </div>
            </div>
          </section>

          <div className="emaki-b-seam" />

          <section>
            <div className="emaki-b-inset">
              <div className="emaki-b-section-title">Recent activity</div>
              {ACTIVITY.map((row, i) => (
                <div className="emaki-b-activity-row" key={i}>
                  <span className="emaki-b-time">{row.time}</span>
                  <span className="emaki-b-activity-msg">{row.msg}</span>
                  <span className="emaki-b-diff">{row.diff}</span>
                </div>
              ))}
            </div>
          </section>

          <div>
            <button className="emaki-b-cta" type="button">
              + New session →
            </button>
          </div>
        </main>

        <div className="emaki-b-kitsu-pod" title="Kitsu">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TOKENS.kitsu} alt="Kitsu" />
        </div>
      </div>
    </>
  );
}
