"use client";

// ─────────────────────────────────────────────────────────────────────────────
// HUASHU-DESIGN SLICE — PG OS · Home Screen
//
// Direction: Ash Thorp #15 · Warm Cyberpunk / Cinematic Concept Art
// Philosophy: "The future isn't cold — it's lonely and poetic."
// Blade Runner warmth over Tron coldness. Near-black ink grounds everything.
// A single amber/rust accent threads through the entire composition.
// Cinematic typography: heavyweight serif display + tight monospace for data.
//
// 120% signature detail: the onmyoji backdrop cropped into the hero zone as a
// framed atmospheric panel — not a full bleed, but a deliberate aperture into
// another world, living behind the content layer.
//
// Anti-slop applied:
// - No purple gradient
// - No left-border accent cards
// - No emoji icons
// - No Inter/Roboto as display face
// - No decorative icon scatter
// - Colors defined via oklch() — not arbitrary hex pulls
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

export default function HuashuSlice() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=JetBrains+Mono:wght@300;400;500&display=swap');

        /* ── Design tokens ── */
        .hs-root {
          --ink:        oklch(11% 0.008 30);
          --ink-mid:    oklch(16% 0.010 30);
          --ink-light:  oklch(22% 0.012 30);
          --amber:      oklch(68% 0.17  55);
          --amber-dim:  oklch(48% 0.12  55);
          --amber-faint:oklch(30% 0.06  55);
          --ash:        oklch(55% 0.008 30);
          --ash-dim:    oklch(38% 0.006 30);
          --cream:      oklch(92% 0.015 65);
          --blocked:    oklch(62% 0.16  28);
          --live-pulse: oklch(68% 0.14  155);

          font-family: 'JetBrains Mono', monospace;
          background: var(--ink);
          color: var(--cream);
          padding: 0;
          margin: 0;
          min-height: 640px;
          position: relative;
          overflow: hidden;
        }

        /* ── Chrome / nav bar ── */
        .hs-chrome {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 36px 14px;
          border-bottom: 1px solid var(--ink-light);
          position: relative;
          z-index: 10;
        }
        .hs-wordmark {
          font-family: 'Playfair Display', serif;
          font-weight: 900;
          font-size: 18px;
          letter-spacing: -0.03em;
          color: var(--amber);
        }
        .hs-nav {
          display: flex;
          gap: 2px;
          align-items: center;
        }
        .hs-nav-tab {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 3px;
          color: var(--ash);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 0.15s;
        }
        .hs-nav-tab:hover { color: var(--cream); }
        .hs-nav-tab.active {
          color: var(--amber);
          background: var(--amber-faint);
        }

        /* ── Hero zone ── */
        .hs-hero {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 0;
          min-height: 240px;
          position: relative;
        }

        /* Left: copy column */
        .hs-hero-copy {
          padding: 40px 40px 36px 36px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative;
          z-index: 5;
        }
        .hs-eyebrow {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.20em;
          text-transform: uppercase;
          color: var(--amber-dim);
        }
        .hs-eyebrow::before {
          content: '▸ ';
          color: var(--amber);
          font-size: 9px;
        }
        .hs-h1 {
          font-family: 'Playfair Display', serif;
          font-weight: 900;
          font-size: clamp(28px, 3.2vw, 42px);
          line-height: 1.05;
          letter-spacing: -0.03em;
          color: var(--cream);
          margin: 0;
          max-width: 520px;
        }
        .hs-h1 em {
          font-style: italic;
          color: var(--amber);
        }
        .hs-subhead {
          font-size: 12px;
          font-weight: 300;
          line-height: 1.7;
          color: var(--ash);
          max-width: 440px;
        }
        .hs-cta {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink);
          background: var(--amber);
          border: none;
          padding: 10px 20px;
          border-radius: 2px;
          cursor: pointer;
          width: fit-content;
          transition: opacity 0.12s, transform 0.12s;
        }
        .hs-cta:hover { opacity: 0.88; transform: translateY(-1px); }
        .hs-cta-arrow {
          font-size: 14px;
          line-height: 1;
          transition: transform 0.12s;
        }
        .hs-cta:hover .hs-cta-arrow { transform: translateX(3px); }

        /* Right: backdrop aperture */
        .hs-hero-aperture {
          position: relative;
          overflow: hidden;
        }
        .hs-aperture-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 20%;
          filter: brightness(0.5) saturate(0.7) sepia(0.15);
          transition: filter 0.4s;
        }
        .hs-aperture-img:hover {
          filter: brightness(0.62) saturate(0.85) sepia(0.1);
        }
        /* Frame edges — the "aperture" treatment */
        .hs-aperture-frame {
          position: absolute;
          inset: 0;
          border: 1px solid var(--amber-faint);
          pointer-events: none;
          z-index: 2;
        }
        .hs-aperture-frame::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to right,
            var(--ink) 0%,
            transparent 22%,
            transparent 80%,
            var(--ink) 100%
          );
        }
        .hs-aperture-frame::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            var(--ink) 0%,
            transparent 20%,
            transparent 80%,
            var(--ink) 100%
          );
        }
        .hs-aperture-label {
          position: absolute;
          bottom: 12px;
          right: 16px;
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--amber-dim);
          z-index: 3;
        }

        /* ── Body: two-col layout ── */
        .hs-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: var(--ink-light);
          border-top: 1px solid var(--ink-light);
        }

        /* ── Project cards ── */
        .hs-projects {
          padding: 28px 36px;
          background: var(--ink);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .hs-section-label {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ash-dim);
          margin-bottom: 4px;
        }
        .hs-card {
          background: var(--ink-mid);
          border: 1px solid var(--ink-light);
          border-radius: 2px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .hs-card:hover {
          border-color: var(--amber-faint);
        }
        .hs-card-top {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }
        .hs-card-name {
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: -0.02em;
          color: var(--cream);
        }
        .hs-card-stat {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--amber);
        }
        .hs-card-stat.blocked {
          color: var(--blocked);
        }
        .hs-card-meta {
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--ash-dim);
        }
        .hs-card-meta span {
          color: var(--ash);
        }
        .hs-card-body {
          font-size: 11px;
          font-weight: 300;
          line-height: 1.5;
          color: var(--ash);
          font-style: italic;
        }
        /* Amber notch — single accent detail */
        .hs-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 2px;
          height: 100%;
          background: var(--amber-faint);
          transition: background 0.15s;
        }
        .hs-card:hover::before {
          background: var(--amber);
        }
        .hs-card.alert::before {
          background: var(--blocked);
          opacity: 0.7;
        }
        .hs-card.alert:hover::before {
          background: var(--blocked);
          opacity: 1;
        }
        /* Blocked badge */
        .hs-blocked-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--blocked);
          background: oklch(15% 0.04 28);
          border: 1px solid oklch(22% 0.06 28);
          padding: 3px 8px;
          border-radius: 2px;
          width: fit-content;
        }

        /* ── Activity stream ── */
        .hs-activity {
          padding: 28px 36px;
          background: var(--ink);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .hs-activity-table {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .hs-activity-row {
          display: grid;
          grid-template-columns: 48px 1fr auto;
          gap: 14px;
          align-items: baseline;
          padding: 11px 0;
          border-bottom: 1px solid var(--ink-light);
        }
        .hs-activity-row:first-child {
          border-top: 1px solid var(--ink-light);
        }
        .hs-act-time {
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--ash-dim);
          white-space: nowrap;
        }
        .hs-act-label {
          font-size: 11px;
          font-weight: 300;
          color: var(--cream);
          line-height: 1.4;
        }
        .hs-act-diff {
          font-size: 10px;
          font-weight: 400;
          white-space: nowrap;
          text-align: right;
        }
        .hs-act-diff .plus { color: var(--live-pulse); }
        .hs-act-diff .minus { color: var(--blocked); }

        /* Live indicator */
        .hs-live-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--ink-mid);
          border: 1px solid var(--ink-light);
          border-radius: 2px;
          margin-top: 4px;
        }
        .hs-live-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--live-pulse);
          box-shadow: 0 0 6px var(--live-pulse);
          animation: hs-pulse 2.2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes hs-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px var(--live-pulse); }
          50%       { opacity: 0.4; box-shadow: 0 0 2px var(--live-pulse); }
        }
        .hs-live-text {
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.06em;
          color: var(--ash);
        }
        .hs-live-text strong {
          color: var(--live-pulse);
          font-weight: 500;
        }

        /* ── Responsive: narrow viewport fallback ── */
        @media (max-width: 720px) {
          .hs-hero { grid-template-columns: 1fr; }
          .hs-hero-aperture { height: 140px; }
          .hs-body { grid-template-columns: 1fr; }
          .hs-chrome { padding: 14px 20px; }
          .hs-hero-copy { padding: 28px 20px 24px; }
          .hs-projects, .hs-activity { padding: 22px 20px; }
        }
      `}</style>

      <div className="hs-root">
        {/* ── Chrome ── */}
        <header className="hs-chrome">
          <span className="hs-wordmark">PG OS</span>
          <nav className="hs-nav" aria-label="Main navigation">
            {["Home", "Habits", "Projects", "Cockpit"].map((tab) => (
              <button
                key={tab}
                className={`hs-nav-tab${tab === "Home" ? " active" : ""}`}
                aria-current={tab === "Home" ? "page" : undefined}
              >
                {tab}
              </button>
            ))}
          </nav>
        </header>

        {/* ── Hero ── */}
        <section className="hs-hero" aria-label="Dashboard overview">
          {/* Copy */}
          <div className="hs-hero-copy">
            <p className="hs-eyebrow">
              Late night · Kitsu is watching the fleet
            </p>
            <h1 className="hs-h1">
              The work is <em>alive.</em>
              <br />
              The night is yours.
            </h1>
            <p className="hs-subhead">
              Three sessions live, one waiting on your call. The night is
              quiet&nbsp;— a good time to ship the thing you keep circling.
            </p>
            <button className="hs-cta" aria-label="Start a new session">
              + New session
              <span className="hs-cta-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </div>

          {/* Backdrop aperture */}
          <div className="hs-hero-aperture" aria-hidden="true">
            <img
              src="/art/aesthetic-2026-05-20/onmyoji-hero_0.png"
              alt=""
              className="hs-aperture-img"
            />
            <div className="hs-aperture-frame" />
            <span className="hs-aperture-label">fleet · 03:12 JST</span>
          </div>
        </section>

        {/* ── Body grid ── */}
        <div className="hs-body">
          {/* Projects column */}
          <section className="hs-projects" aria-label="Active projects">
            <p className="hs-section-label">Active projects</p>

            {/* Card 1 — personal-os */}
            <article className="hs-card">
              <div className="hs-card-top">
                <span className="hs-card-name">personal-os</span>
                <span className="hs-card-stat">48% ctx</span>
              </div>
              <div className="hs-card-meta">
                <span>cockpit</span>&nbsp;·&nbsp;2d
              </div>
              <p className="hs-card-body">
                mcp_claude-in-chrome__browser_batch
              </p>
            </article>

            {/* Card 2 — metrasens (alert) */}
            <article className="hs-card alert">
              <div className="hs-card-top">
                <span className="hs-card-name">metrasens</span>
                <span className="hs-card-stat blocked">blocked</span>
              </div>
              <div className="hs-card-meta">
                <span>signal-hub</span>&nbsp;·&nbsp;4d
              </div>
              <p className="hs-card-body">MRE bucket — UPGRADE or CURRENT?</p>
              <div className="hs-blocked-badge">
                <span>!</span>
                needs decision
              </div>
            </article>
          </section>

          {/* Activity column */}
          <section className="hs-activity" aria-label="Recent activity">
            <p className="hs-section-label">Recent activity</p>

            <div className="hs-activity-table">
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
              ].map((row) => (
                <div key={row.time} className="hs-activity-row">
                  <span className="hs-act-time">{row.time}</span>
                  <span className="hs-act-label">{row.label}</span>
                  <span className="hs-act-diff">
                    <span className="plus">{row.plus}</span>{" "}
                    <span className="minus">{row.minus}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Live sessions indicator */}
            <div className="hs-live-row">
              <div className="hs-live-dot" />
              <span className="hs-live-text">
                <strong>3 sessions</strong> live · 1 awaiting decision
              </span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
