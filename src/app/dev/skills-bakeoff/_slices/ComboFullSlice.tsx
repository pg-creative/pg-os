"use client";

import React, { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// COMBO FULL SLICE
// Pipeline: ui-ux-pro-max → huashu-design → impeccable
//
// Design system (ui-ux-pro-max):
//   Style: Motion-Driven. Colors: #020617 bg, #22C55E accent, #F8FAFC fg.
//   Fonts: Space Grotesk (display) + JetBrains Mono (data) — sharp technologist register.
//   Effects: entrance animations, hover micro-interactions, parallax subtlety.
//
// Huashu build principles applied:
//   No AI slop: no purple gradients, no emoji icons, no card+side-border-accent,
//   no SVG-drawn faces, no decorative glassmorphism. Typography IS the hierarchy.
//   Placeholder discipline: every element earns its place.
//
// Impeccable polish:
//   OKLCH colors (tinted neutrals, never raw #000/#fff).
//   Physical scene → dark committed. Restrained color strategy: one accent ≤10%.
//   Absolute bans enforced: no side-stripe borders, no gradient text, no hero-metric
//   template, no identical card grids. Exit animations 60% of enter duration.
//   Easing: exponential-out curves only.
// ─────────────────────────────────────────────────────────────────────────────

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
`;

// OKLCH palette — never raw #000/#fff; every neutral tinted toward the midnight-blue hue
const C = {
  // Backgrounds — tinted blue-indigo, not pure black
  bg: "oklch(8% 0.018 250)", // deep ink, blue tint
  bgSurface: "oklch(12% 0.020 252)", // card surface
  bgHover: "oklch(15% 0.022 252)", // card hover lift

  // Text — tinted cool-white, not pure white
  textPrimary: "oklch(97% 0.008 250)", // near-white, slightly cool
  textSecondary: "oklch(62% 0.012 250)", // muted, still readable (≥4.5:1 on bgSurface)
  textTertiary: "oklch(42% 0.010 250)", // very muted — timestamps, small labels

  // Accent — green signal (≤10% of surface; used only for actionable states)
  accent: "oklch(75% 0.18 145)", // emerald-green, WCAG AA on bg
  accentMuted: "oklch(75% 0.06 145)", // desaturated for subtle tags

  // Semantic
  danger: "oklch(65% 0.20 25)", // warm red, not neon
  border: "oklch(22% 0.014 252)", // subtle divider

  // Data ink
  mono: "oklch(72% 0.012 250)", // monospace data values
};

// Easing tokens — exponential-out for enters, slightly faster exits
const EASE = {
  enter: "cubic-bezier(0.16, 1, 0.3, 1)", // expo-out: snappy, natural
  exit: "cubic-bezier(0.55, 0, 1, 0.45)", // expo-in: fast exit
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function TabBar({ active }: { active: string }) {
  const tabs = ["Home", "Habits", "Projects", "Cockpit"];
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        borderBottom: `1px solid ${C.border}`,
        paddingLeft: 24,
        paddingRight: 24,
      }}
      aria-label="Primary navigation"
    >
      {/* Wordmark */}
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: "0.08em",
          color: C.textPrimary,
          marginRight: 32,
          flexShrink: 0,
        }}
      >
        PG OS
      </span>

      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={isActive}
            style={{
              background: "none",
              border: "none",
              padding: "16px 16px",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: isActive ? 500 : 400,
              fontSize: 13,
              color: isActive ? C.textPrimary : C.textSecondary,
              cursor: "pointer",
              position: "relative",
              transition: `color 200ms ${EASE.enter}`,
              outline: "none",
              letterSpacing: "0.02em",
            }}
          >
            {tab}
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "60%",
                  height: 2,
                  background: C.accent,
                  borderRadius: "2px 2px 0 0",
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

function HeroSection({ visible }: { visible: boolean }) {
  return (
    <section
      style={{
        padding: "52px 40px 44px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: `opacity 500ms ${EASE.enter}, transform 500ms ${EASE.enter}`,
      }}
    >
      {/* Eyebrow */}
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 400,
          color: C.textTertiary,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          margin: "0 0 18px",
        }}
      >
        Late night&nbsp;·&nbsp;Kitsu is watching the fleet
      </p>

      {/* H1 — the one moment to spend weight */}
      <h1
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(28px, 4vw, 38px)",
          lineHeight: 1.15,
          color: C.textPrimary,
          margin: "0 0 16px",
          maxWidth: "600px",
          letterSpacing: "-0.02em",
        }}
      >
        Ship the thing you keep circling.
      </h1>

      {/* Sub-headline — body weight, not a shout */}
      <p
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 400,
          fontSize: 15,
          lineHeight: 1.65,
          color: C.textSecondary,
          margin: 0,
          maxWidth: "520px",
        }}
      >
        Three sessions live, one waiting on your call. The night is quiet — a
        good time to ship the thing you keep circling.
      </p>
    </section>
  );
}

// Single project card — huashu: NO left-border accent, NO icon+heading+text clone grid.
// Uses typographic differentiation to distinguish the two cards.
function ProjectCard({
  name,
  context,
  meta,
  tool,
  status,
  visible,
  delay,
}: {
  name: string;
  context: string;
  meta: string;
  tool: string;
  status?: "blocked" | "normal";
  visible: boolean;
  delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  const isBlocked = status === "blocked";

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.bgHover : C.bgSurface,
        border: `1px solid ${isBlocked ? C.danger : hovered ? C.border : C.border}`,
        borderRadius: 10,
        padding: "22px 24px",
        cursor: "pointer",
        opacity: visible ? 1 : 0,
        transform: visible
          ? `translateY(0) scale(${hovered ? 1.008 : 1})`
          : "translateY(16px)",
        transition: `
          opacity 400ms ${EASE.enter} ${delay}ms,
          transform 400ms ${EASE.enter} ${delay}ms,
          background 180ms ${EASE.enter},
          border-color 180ms ${EASE.enter},
          box-shadow 180ms ${EASE.enter}
        `,
        boxShadow: hovered
          ? `0 8px 32px oklch(0% 0 0 / 0.35), 0 0 0 1px ${C.border}`
          : "none",
      }}
      aria-label={`Project: ${name}`}
    >
      {/* Project name + status */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: 15,
            color: C.textPrimary,
            letterSpacing: "-0.01em",
          }}
        >
          {name}
        </span>
        {isBlocked && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 500,
              color: C.danger,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "3px 8px",
              border: `1px solid ${C.danger}`,
              borderRadius: 4,
            }}
          >
            blocked
          </span>
        )}
      </div>

      {/* Context line */}
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: C.textSecondary,
          margin: "0 0 6px",
          letterSpacing: "0.02em",
        }}
      >
        {context}
      </p>

      {/* Divider */}
      <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0" }} />

      {/* Meta row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: isBlocked ? C.danger : C.accentMuted,
            letterSpacing: "0.04em",
          }}
        >
          {meta}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: C.textTertiary,
            letterSpacing: "0.04em",
            maxWidth: "55%",
            textAlign: "right",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={tool}
        >
          {tool}
        </span>
      </div>
    </article>
  );
}

// Activity row — three rows, distinct from cards in visual weight
function ActivityRow({
  time,
  message,
  diff,
  visible,
  delay,
}: {
  time: string;
  message: string;
  diff: string;
  visible: boolean;
  delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "52px 1fr auto",
        alignItems: "center",
        gap: 16,
        padding: "12px 0",
        borderBottom: `1px solid ${C.border}`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-10px)",
        transition: `opacity 350ms ${EASE.enter} ${delay}ms, transform 350ms ${EASE.enter} ${delay}ms`,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: C.textTertiary,
          letterSpacing: "0.04em",
        }}
      >
        {time}
      </span>
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13,
          fontWeight: hovered ? 500 : 400,
          color: hovered ? C.textPrimary : C.textSecondary,
          transition: `color 160ms ${EASE.enter}, font-weight 160ms ${EASE.enter}`,
          letterSpacing: "0.01em",
        }}
      >
        {message}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: C.accent,
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        }}
      >
        {diff}
      </span>
    </li>
  );
}

// CTA — single primary action per screen (impeccable: one CTA, visually prominent)
function NewSessionCTA({ visible }: { visible: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        padding: "0 40px 48px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: `opacity 400ms ${EASE.enter} 700ms, transform 400ms ${EASE.enter} 700ms`,
      }}
    >
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: hovered ? C.accent : "transparent",
          color: hovered ? "oklch(10% 0.018 145)" : C.accent,
          border: `1.5px solid ${C.accent}`,
          borderRadius: 8,
          padding: "11px 22px",
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: "0.02em",
          cursor: "pointer",
          transition: `background 200ms ${EASE.enter}, color 200ms ${EASE.enter}, transform 200ms ${EASE.enter}`,
          transform: hovered ? "scale(1.03)" : "scale(1)",
          outline: "none",
        }}
        aria-label="Start a new session"
      >
        {/* SVG plus icon — no emoji */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="7" y1="1" x2="7" y2="13" />
          <line x1="1" y1="7" x2="13" y2="7" />
        </svg>
        New session
        {/* Arrow — SVG, not emoji */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            transform: hovered ? "translateX(3px)" : "translateX(0)",
            transition: `transform 200ms ${EASE.enter}`,
          }}
        >
          <path d="M2 6h8M6 2l4 4-4 4" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ComboFullSlice() {
  // Staggered entrance: each section reveals in sequence
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Step through entrance stages with small delays
    const timers = [
      setTimeout(() => setStep(1), 80), // chrome + nav
      setTimeout(() => setStep(2), 240), // hero
      setTimeout(() => setStep(3), 420), // cards
      setTimeout(() => setStep(4), 560), // activity
      setTimeout(() => setStep(5), 700), // CTA
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <>
      {/* Font import */}
      <style>{FONTS}</style>

      {/* Root — dark container, max 1180px as specified */}
      <div
        style={{
          background: C.bg,
          minHeight: 640,
          maxWidth: 1180,
          width: "100%",
          margin: "0 auto",
          fontFamily: "'Space Grotesk', sans-serif",
          color: C.textPrimary,
          borderRadius: 12,
          overflow: "hidden",
          // Subtle depth ring — not glassmorphism, just a border
          outline: `1px solid ${C.border}`,
        }}
      >
        {/* Chrome + Tab bar */}
        <div
          style={{
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? "translateY(0)" : "translateY(-8px)",
            transition: `opacity 300ms ${EASE.enter}, transform 300ms ${EASE.enter}`,
          }}
        >
          <TabBar active="Home" />
        </div>

        {/* Hero */}
        <HeroSection visible={step >= 2} />

        {/* Project cards */}
        <section
          aria-label="Active projects"
          style={{ padding: "0 40px 36px" }}
        >
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 500,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.textTertiary,
              margin: "0 0 16px",
              opacity: step >= 3 ? 1 : 0,
              transition: `opacity 300ms ${EASE.enter}`,
            }}
          >
            Active
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 14,
            }}
          >
            <ProjectCard
              name="personal-os"
              context="cockpit · 2d"
              meta="48% ctx"
              tool="mcp_claude-in-chrome__browser_batch"
              visible={step >= 3}
              delay={0}
            />
            <ProjectCard
              name="metrasens"
              context="signal-hub · 4d"
              meta="MRE bucket — UPGRADE or CURRENT?"
              tool=""
              status="blocked"
              visible={step >= 3}
              delay={80}
            />
          </div>
        </section>

        {/* Activity */}
        <section aria-label="Recent activity" style={{ padding: "0 40px 8px" }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 500,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.textTertiary,
              margin: "0 0 4px",
              opacity: step >= 4 ? 1 : 0,
              transition: `opacity 300ms ${EASE.enter}`,
            }}
          >
            Recent activity
          </h2>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            {[
              {
                time: "09:58",
                message: "legibility foundation shipped",
                diff: "+711 −0",
                delay: 0,
              },
              {
                time: "09:24",
                message: "party mode — Kitsu sings first",
                diff: "+180 −44",
                delay: 60,
              },
              {
                time: "08:51",
                message: "fox head reframed",
                diff: "+12 −9",
                delay: 120,
              },
            ].map((row) => (
              <ActivityRow
                key={row.time}
                time={row.time}
                message={row.message}
                diff={row.diff}
                visible={step >= 4}
                delay={row.delay}
              />
            ))}
          </ul>
        </section>

        {/* CTA */}
        <NewSessionCTA visible={step >= 5} />
      </div>
    </>
  );
}
