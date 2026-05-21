"use client";

// design-taste-frontend — DESIGN_VARIANCE: 8 | MOTION_INTENSITY: 6 | VISUAL_DENSITY: 4
// Asymmetric grid · fluid CSS transitions · daily-app spacing · Geist · Zinc/Slate · 1 accent (amber)

import React, { useState, useEffect, useRef } from "react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

  .dts-root {
    font-family: 'Geist', ui-sans-serif, system-ui, sans-serif;
    background-color: #0f0f10;
    color: #e4e4e7;
    min-height: 640px;
    position: relative;
    overflow: hidden;
  }

  /* ── Noise grain — fixed, pointer-events-none, never on scroll container ── */
  .dts-grain {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.028;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* ── Ambient glow — top-left, tinted to accent ── */
  .dts-glow {
    position: absolute;
    top: -120px;
    left: -80px;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Chrome bar ── */
  .dts-chrome {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 28px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    height: 48px;
  }

  .dts-wordmark {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: #fbbf24;
    margin-right: 32px;
    text-transform: uppercase;
  }

  .dts-tabs {
    display: flex;
    gap: 0;
    height: 100%;
  }

  .dts-tab {
    position: relative;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: #71717a;
    padding: 0 16px;
    height: 100%;
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: color 0.2s cubic-bezier(0.16,1,0.3,1);
    border: none;
    background: none;
    outline: none;
    white-space: nowrap;
  }

  .dts-tab:hover {
    color: #d4d4d8;
  }

  .dts-tab[data-active="true"] {
    color: #e4e4e7;
  }

  .dts-tab[data-active="true"]::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 16px;
    right: 16px;
    height: 1.5px;
    background: #fbbf24;
  }

  /* ── Main layout — DESIGN_VARIANCE 8: asymmetric 2fr 1fr grid ── */
  .dts-body {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 0;
    padding: 0;
  }

  @media (max-width: 767px) {
    .dts-body {
      grid-template-columns: 1fr;
    }
    .dts-right-col {
      border-left: none !important;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
  }

  /* ── Left column ── */
  .dts-left-col {
    padding: 40px 36px 36px 36px;
    border-right: 1px solid rgba(255,255,255,0.06);
  }

  /* ── Eyebrow ── */
  .dts-eyebrow {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #71717a;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  .dts-eyebrow-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #fbbf24;
    animation: dts-pulse 2.4s cubic-bezier(0.16,1,0.3,1) infinite;
  }

  @keyframes dts-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
  }

  /* ── H1 — left-aligned, DV8 anti-center rule ── */
  .dts-h1 {
    font-size: clamp(26px, 3.8vw, 46px);
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: #fafafa;
    margin: 0 0 16px 0;
    max-width: 580px;
  }

  .dts-subhead {
    font-size: 14px;
    line-height: 1.65;
    color: #71717a;
    max-width: 56ch;
    margin: 0 0 36px 0;
  }

  /* ── Project cards — elevation signals hierarchy, shadow tinted to bg ── */
  .dts-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 36px;
  }

  @media (max-width: 600px) {
    .dts-cards { grid-template-columns: 1fr; }
  }

  .dts-card {
    background: #18181b;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 18px;
    box-shadow: 0 4px 24px -8px rgba(0,0,0,0.45);
    transition: border-color 0.25s cubic-bezier(0.16,1,0.3,1),
                transform 0.25s cubic-bezier(0.16,1,0.3,1),
                box-shadow 0.25s cubic-bezier(0.16,1,0.3,1);
    cursor: default;
  }

  .dts-card:hover {
    border-color: rgba(251,191,36,0.18);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05);
  }

  .dts-card:active {
    transform: translateY(-1px) scale(0.98);
  }

  .dts-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
  }

  .dts-card-name {
    font-size: 13px;
    font-weight: 600;
    color: #e4e4e7;
    letter-spacing: -0.01em;
  }

  .dts-stat {
    font-size: 11px;
    font-weight: 500;
    font-family: 'Geist Mono', ui-monospace, monospace;
    color: #fbbf24;
    background: rgba(251,191,36,0.1);
    border: 1px solid rgba(251,191,36,0.18);
    border-radius: 4px;
    padding: 2px 7px;
    white-space: nowrap;
  }

  .dts-stat[data-alert="true"] {
    color: #f87171;
    background: rgba(248,113,113,0.08);
    border-color: rgba(248,113,113,0.2);
  }

  .dts-card-meta {
    font-size: 11px;
    color: #52525b;
    margin-bottom: 8px;
    font-family: 'Geist Mono', ui-monospace, monospace;
  }

  .dts-card-body {
    font-size: 12px;
    color: #71717a;
    font-family: 'Geist Mono', ui-monospace, monospace;
    line-height: 1.5;
    word-break: break-all;
  }

  /* ── Activity table ── */
  .dts-activity-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #52525b;
    margin-bottom: 10px;
  }

  .dts-activity {
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .dts-activity-row {
    display: grid;
    grid-template-columns: 44px 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.2s cubic-bezier(0.16,1,0.3,1);
    /* staggered reveal */
    opacity: 0;
    animation: dts-row-in 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  .dts-activity-row:nth-child(1) { animation-delay: 0.08s; }
  .dts-activity-row:nth-child(2) { animation-delay: 0.16s; }
  .dts-activity-row:nth-child(3) { animation-delay: 0.24s; }

  @keyframes dts-row-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .dts-activity-time {
    font-size: 11px;
    font-family: 'Geist Mono', ui-monospace, monospace;
    color: #52525b;
    white-space: nowrap;
  }

  .dts-activity-msg {
    font-size: 13px;
    color: #a1a1aa;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dts-activity-diff {
    font-size: 11px;
    font-family: 'Geist Mono', ui-monospace, monospace;
    color: #4ade80;
    white-space: nowrap;
  }

  /* ── CTA ── */
  .dts-cta-wrap {
    margin-top: 28px;
  }

  .dts-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'Geist', sans-serif;
    color: #0f0f10;
    background: #fbbf24;
    border: none;
    border-radius: 7px;
    padding: 10px 20px;
    cursor: pointer;
    letter-spacing: -0.01em;
    transition: background 0.2s cubic-bezier(0.16,1,0.3,1),
                transform 0.2s cubic-bezier(0.16,1,0.3,1),
                box-shadow 0.2s cubic-bezier(0.16,1,0.3,1);
    outline: none;
    box-shadow: 0 0 0 0 transparent;
    /* Directional hover fill via pseudo will break self-contained — use bg shift */
  }

  .dts-cta:hover {
    background: #f59e0b;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px -4px rgba(245,158,11,0.35);
  }

  .dts-cta:active {
    transform: translateY(0) scale(0.98);
    box-shadow: none;
  }

  .dts-cta-icon {
    display: inline-block;
    transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
  }

  .dts-cta:hover .dts-cta-icon {
    transform: translateX(3px);
  }

  /* ── Right column — stacked status panels ── */
  .dts-right-col {
    border-left: 1px solid rgba(255,255,255,0.06);
    padding: 40px 24px 36px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .dts-status-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #52525b;
    margin-bottom: 16px;
  }

  /* ── Session status panel ── */
  .dts-sessions {
    margin-bottom: 32px;
  }

  .dts-session-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    /* staggered load-in */
    opacity: 0;
    animation: dts-row-in 0.45s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  .dts-session-item:nth-child(1) { animation-delay: 0.05s; }
  .dts-session-item:nth-child(2) { animation-delay: 0.12s; }
  .dts-session-item:nth-child(3) { animation-delay: 0.19s; }
  .dts-session-item:nth-child(4) { animation-delay: 0.26s; }

  .dts-session-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dts-session-dot[data-state="live"] {
    background: #4ade80;
    animation: dts-pulse 2.1s cubic-bezier(0.16,1,0.3,1) infinite;
  }

  .dts-session-dot[data-state="waiting"] {
    background: #fbbf24;
    animation: dts-blink 1.6s step-end infinite;
  }

  @keyframes dts-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.2; }
  }

  .dts-session-name {
    font-size: 12px;
    font-weight: 500;
    color: #d4d4d8;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dts-session-tag {
    font-size: 10px;
    font-family: 'Geist Mono', ui-monospace, monospace;
    color: #71717a;
  }

  /* ── Skeleton loader (per Rule 5: loading states) ── */
  .dts-skeleton {
    background: linear-gradient(90deg, #27272a 25%, #3f3f46 50%, #27272a 75%);
    background-size: 200% 100%;
    animation: dts-shimmer 1.8s cubic-bezier(0.16,1,0.3,1) infinite;
    border-radius: 4px;
  }

  @keyframes dts-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* ── Divider ── */
  .dts-divider {
    border: none;
    border-top: 1px solid rgba(255,255,255,0.05);
    margin: 0 0 24px;
  }

  /* ── Fleet stat pills ── */
  .dts-fleet-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .dts-fleet-stat {
    background: #18181b;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    padding: 12px;
    transition: border-color 0.2s cubic-bezier(0.16,1,0.3,1);
  }

  .dts-fleet-stat:hover {
    border-color: rgba(255,255,255,0.12);
  }

  .dts-fleet-num {
    font-size: 20px;
    font-weight: 700;
    font-family: 'Geist Mono', ui-monospace, monospace;
    color: #e4e4e7;
    letter-spacing: -0.04em;
    line-height: 1;
    margin-bottom: 4px;
  }

  .dts-fleet-key {
    font-size: 10px;
    color: #52525b;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* ── Focus ring for a11y ── */
  .dts-tab:focus-visible,
  .dts-cta:focus-visible {
    outline: 2px solid rgba(251,191,36,0.6);
    outline-offset: 2px;
  }
`;

const TABS = ["Home", "Habits", "Projects", "Cockpit"];

const SESSIONS = [
  { id: 1, name: "personal-os", tag: "cockpit", state: "live" as const },
  { id: 2, name: "heros-chronicle", tag: "quest-log", state: "live" as const },
  { id: 3, name: "metrasens", tag: "signal-hub", state: "live" as const },
  { id: 4, name: "alchmy-content", tag: "engine", state: "waiting" as const },
];

const PROJECTS = [
  {
    name: "personal-os",
    meta: "cockpit · 2d",
    stat: "48% ctx",
    alert: false,
    body: "mcp_claude-in-chrome__browser_batch",
  },
  {
    name: "metrasens",
    meta: "signal-hub · 4d",
    stat: "blocked",
    alert: true,
    body: "MRE bucket — UPGRADE or CURRENT?",
  },
];

const ACTIVITY = [
  { time: "09:58", msg: "legibility foundation shipped", diff: "+711 −0" },
  { time: "09:24", msg: "party mode — Kitsu sings first", diff: "+180 −44" },
  { time: "08:51", msg: "fox head reframed", diff: "+12 −9" },
];

export default function DesignTasteSlice() {
  const [activeTab, setActiveTab] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="dts-root" style={{ maxWidth: 1180 }}>
        <div className="dts-grain" aria-hidden="true" />
        <div className="dts-glow" aria-hidden="true" />

        {/* ── Chrome bar ── */}
        <header className="dts-chrome" role="banner">
          <span className="dts-wordmark" aria-label="PG OS">
            PG OS
          </span>
          <nav className="dts-tabs" role="tablist" aria-label="Main navigation">
            {TABS.map((t, i) => (
              <button
                key={t}
                role="tab"
                aria-selected={i === activeTab}
                data-active={i === activeTab ? "true" : "false"}
                className="dts-tab"
                onClick={() => setActiveTab(i)}
              >
                {t}
              </button>
            ))}
          </nav>
        </header>

        {/* ── Body — asymmetric 2fr 1fr (DESIGN_VARIANCE 8) ── */}
        <main className="dts-body" role="main">
          {/* Left column */}
          <div className="dts-left-col">
            {/* Eyebrow */}
            <div className="dts-eyebrow" aria-label="Context">
              <span className="dts-eyebrow-dot" aria-hidden="true" />
              Late night · Kitsu is watching the fleet
            </div>

            {/* H1 — left-aligned, anti-center, no gradient text (Rule 7) */}
            <h1 className="dts-h1">
              Three sessions running.
              <br />
              One call to make.
            </h1>

            <p className="dts-subhead">
              Three sessions live, one waiting on your call. The night is quiet
              — a good time to ship the thing you keep circling.
            </p>

            {/* Project cards — 2-column (never 3-column per Rule 7) */}
            <div className="dts-cards" role="list" aria-label="Active projects">
              {PROJECTS.map((p) => (
                <article key={p.name} className="dts-card" role="listitem">
                  <div className="dts-card-header">
                    <span className="dts-card-name">{p.name}</span>
                    <span
                      className="dts-stat"
                      data-alert={p.alert ? "true" : "false"}
                      aria-label={
                        p.alert
                          ? `Status: ${p.stat} (alert)`
                          : `Context: ${p.stat}`
                      }
                    >
                      {p.stat}
                    </span>
                  </div>
                  <div className="dts-card-meta">{p.meta}</div>
                  <div className="dts-card-body">{p.body}</div>
                </article>
              ))}
            </div>

            {/* Recent activity — divide-y, no extra card boxing */}
            <div className="dts-activity-label" id="activity-label">
              Recent activity
            </div>
            <div
              className="dts-activity"
              role="log"
              aria-label="Recent activity"
              aria-labelledby="activity-label"
            >
              {loaded
                ? ACTIVITY.map((a) => (
                    <div key={a.time} className="dts-activity-row">
                      <span className="dts-activity-time">{a.time}</span>
                      <span className="dts-activity-msg">{a.msg}</span>
                      <span
                        className="dts-activity-diff"
                        aria-label={`Diff: ${a.diff}`}
                      >
                        {a.diff}
                      </span>
                    </div>
                  ))
                : [1, 2, 3].map((k) => (
                    <div
                      key={k}
                      className="dts-activity-row"
                      style={{ opacity: 1, animation: "none" }}
                    >
                      <div
                        className="dts-skeleton"
                        style={{ height: 12, width: 36 }}
                      />
                      <div
                        className="dts-skeleton"
                        style={{ height: 12, flex: 1 }}
                      />
                      <div
                        className="dts-skeleton"
                        style={{ height: 12, width: 64 }}
                      />
                    </div>
                  ))}
            </div>

            {/* CTA — tactile active feedback per Rule 5 */}
            <div className="dts-cta-wrap">
              <button
                className="dts-cta"
                type="button"
                aria-label="Start a new session"
              >
                + New session
                <span className="dts-cta-icon" aria-hidden="true">
                  →
                </span>
              </button>
            </div>
          </div>

          {/* Right column — status panel */}
          <aside
            className="dts-right-col"
            role="complementary"
            aria-label="Fleet status"
          >
            <div className="dts-sessions" aria-label="Active sessions">
              <div className="dts-status-label" id="sessions-label">
                Active sessions
              </div>
              {SESSIONS.map((s) => (
                <div key={s.id} className="dts-session-item">
                  <span
                    className="dts-session-dot"
                    data-state={s.state}
                    aria-label={s.state === "live" ? "Live" : "Waiting"}
                  />
                  <span className="dts-session-name">{s.name}</span>
                  <span className="dts-session-tag">{s.tag}</span>
                </div>
              ))}
            </div>

            <hr className="dts-divider" />

            {/* Fleet metrics */}
            <div className="dts-status-label">Fleet metrics</div>
            <div className="dts-fleet-stats">
              <div className="dts-fleet-stat">
                <div className="dts-fleet-num">3</div>
                <div className="dts-fleet-key">Live</div>
              </div>
              <div className="dts-fleet-stat">
                <div className="dts-fleet-num">1</div>
                <div className="dts-fleet-key">Waiting</div>
              </div>
              <div className="dts-fleet-stat">
                <div className="dts-fleet-num" style={{ color: "#fbbf24" }}>
                  47
                </div>
                <div className="dts-fleet-key">Commits today</div>
              </div>
              <div className="dts-fleet-stat">
                <div className="dts-fleet-num" style={{ color: "#f87171" }}>
                  1
                </div>
                <div className="dts-fleet-key">Blocked</div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
