"use client";
import React from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   ImpeccableSlice — Nioh · Night
   Direction: Nioh night palette — sumi-e ink, kintsugi gold, foxfire ember.
   Fonts: Noto Serif JP (display) · IBM Plex Sans (body) · JetBrains Mono (meta)
   Color strategy: Committed — ink surface carries the page, one gold accent.
   Scene: PG at 2am, forge-dark Japanese workshop, warm terminal glow on faces.
   Backdrop: /art/aesthetic-2026-05-20/nioh-hero_0.png (tonal dissolve to ink)
   ───────────────────────────────────────────────────────────────────────────── */

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700;900&family=IBM+Plex+Sans:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap');
`;

/* ── tokens (Nioh · night) ─────────────────────────────────── */
const T = {
  bg: "oklch(11% 0.008 60)", // sumi-e ink, warm tint
  bg2: "oklch(8% 0.006 58)", // deeper ink for scrim anchor
  surface: "oklch(16% 0.010 58)", // lifted surface — like lacquer over wood
  surfaceAlert: "oklch(18% 0.022 44)", // warm ember tint on blocked card
  fg: "oklch(84% 0.012 70)", // parchment warm white
  muted: "oklch(58% 0.012 68)", // aged ink muted
  accent: "oklch(76% 0.078 72)", // kintsugi gold
  accent2: "oklch(66% 0.045 72)", // deeper warm gold
  alertFg: "oklch(70% 0.120 42)", // foxfire ember for "blocked"
  border: "oklch(84% 0.012 70 / 0.10)", // barely-there hairline
  borderAlert: "oklch(70% 0.120 42 / 0.25)",
  radius: "5px",
  fontDisplay: "'Noto Serif JP', Georgia, serif",
  fontBody: "'IBM Plex Sans', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

/* ── micro motion ──────────────────────────────────────────── */
const CSS_EXTRA = `
  .imp-cta {
    transition: background 180ms cubic-bezier(0.16, 1, 0.3, 1),
                color      180ms cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .imp-cta:hover {
    background: ${T.accent} !important;
    color: oklch(10% 0.008 60) !important;
    box-shadow: 0 0 24px oklch(76% 0.078 72 / 0.28);
  }
  .imp-card {
    transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .imp-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 36px oklch(0% 0 0 / 0.35);
  }
  .imp-tab-active {
    position: relative;
  }
  .imp-tab-active::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    right: 0;
    height: 1.5px;
    background: ${T.accent};
    border-radius: 1px;
  }
  .imp-row {
    transition: background 120ms ease-out;
  }
  .imp-row:hover {
    background: oklch(84% 0.012 70 / 0.04);
  }
  @keyframes imp-ember {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 1; }
  }
  .imp-alert-dot {
    animation: imp-ember 2.4s ease-in-out infinite;
  }
`;

/* ── helpers ───────────────────────────────────────────────── */
function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {/* kintsugi crack glyph rendered as SVG — not decorative; signals "foxfire" */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M9 2 L5 9 L9 9 L7 16 L13 8 L9 8 Z"
          fill={T.accent}
          fillOpacity="0.9"
        />
      </svg>
      <span
        style={{
          fontFamily: T.fontDisplay,
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: "0.18em",
          color: T.fg,
          textTransform: "uppercase",
        }}
      >
        PG OS
      </span>
    </div>
  );
}

function Tab({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={active ? "imp-tab-active" : undefined}
      style={{
        fontFamily: T.fontMono,
        fontSize: 10.5,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: active ? T.fg : T.muted,
        fontWeight: active ? 500 : 400,
        paddingBottom: 3,
        cursor: "pointer",
        position: "relative",
      }}
    >
      {label}
    </span>
  );
}

function ProjectCard({
  title,
  meta,
  stat,
  body,
  alert,
}: {
  title: string;
  meta: string;
  stat: string;
  body: string;
  alert?: boolean;
}) {
  return (
    <div
      className="imp-card"
      style={{
        background: alert ? T.surfaceAlert : T.surface,
        border: `1px solid ${alert ? T.borderAlert : T.border}`,
        borderRadius: T.radius,
        padding: "20px 22px 18px",
        position: "relative",
      }}
    >
      {/* header row */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: T.fontDisplay,
            fontSize: 15,
            fontWeight: 700,
            color: T.fg,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: T.fontMono,
            fontSize: 10,
            color: T.muted,
            letterSpacing: "0.06em",
          }}
        >
          {meta}
        </span>
        <span style={{ flex: 1 }} />
        {/* stat badge — inline chip, not a side stripe */}
        <span
          style={{
            fontFamily: T.fontMono,
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: alert ? T.alertFg : T.accent2,
            background: alert
              ? "oklch(70% 0.120 42 / 0.12)"
              : "oklch(76% 0.078 72 / 0.10)",
            padding: "2px 7px",
            borderRadius: "3px",
          }}
        >
          {alert && (
            <span className="imp-alert-dot" style={{ marginRight: 4 }}>
              ●
            </span>
          )}
          {stat}
        </span>
      </div>
      {/* body */}
      <div
        style={{
          fontFamily: T.fontMono,
          fontSize: 11.5,
          color: T.muted,
          lineHeight: 1.55,
          letterSpacing: "0.01em",
        }}
      >
        {body}
      </div>
    </div>
  );
}

function ActivityRow({
  time,
  label,
  diff,
  last,
}: {
  time: string;
  label: string;
  diff: string;
  last?: boolean;
}) {
  return (
    <div
      className="imp-row"
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr auto",
        alignItems: "center",
        columnGap: 16,
        padding: "8px 6px",
        borderBottom: last ? "none" : `1px solid ${T.border}`,
        borderRadius: "3px",
        margin: "0 -6px",
      }}
    >
      <span
        style={{
          fontFamily: T.fontMono,
          fontSize: 10.5,
          color: T.muted,
          letterSpacing: "0.02em",
          lineHeight: 1,
        }}
      >
        {time}
      </span>
      <span
        style={{
          fontFamily: T.fontBody,
          fontSize: 13,
          color: T.fg,
          fontWeight: 400,
          letterSpacing: "-0.005em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: T.fontMono,
          fontSize: 10.5,
          color: T.accent2,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        {diff}
      </span>
    </div>
  );
}

export default function ImpeccableSlice() {
  return (
    <>
      <style>{FONTS}</style>
      <style>{CSS_EXTRA}</style>

      <div
        style={{
          position: "relative",
          background: T.bg,
          minHeight: 640,
          maxWidth: 1180,
          overflow: "hidden",
          fontFamily: T.fontBody,
          color: T.fg,
          isolation: "isolate",
        }}
      >
        {/* ── backdrop: nioh hero painting, tonal scrim into ink ── */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
          }}
        >
          {/* painting layer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "url('/art/aesthetic-2026-05-20/nioh-hero_0.png')",
              backgroundSize: "cover",
              backgroundPosition: "center top",
              opacity: 0.55,
            }}
          />
          {/* scrim: tight at top, fully opaque by ~55% */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(
                180deg,
                oklch(0% 0 0 / 0.12) 0%,
                oklch(11% 0.008 60 / 0.72) 38%,
                ${T.bg} 58%
              )`,
            }}
          />
          {/* vignette: warm left edge, cool right — forge glow from left */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(
                90deg,
                oklch(76% 0.078 72 / 0.04) 0%,
                transparent 30%,
                transparent 70%,
                oklch(0% 0 0 / 0.18) 100%
              )`,
            }}
          />
        </div>

        {/* ── content ── */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            padding: "28px 40px 36px",
          }}
        >
          {/* chrome bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 52,
            }}
          >
            <Wordmark />
            {/* hairline separator */}
            <div
              style={{
                width: 1,
                height: 14,
                background: T.border,
                flexShrink: 0,
              }}
            />
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
              }}
            >
              <Tab label="Home" active />
              <Tab label="Habits" />
              <Tab label="Projects" />
              <Tab label="Cockpit" />
            </nav>
            <span style={{ flex: 1 }} />
            {/* system status glyph */}
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 10,
                letterSpacing: "0.14em",
                color: T.muted,
                textTransform: "uppercase",
              }}
            >
              仁王 · NIGHT
            </span>
          </div>

          {/* ── hero section ── */}
          <div style={{ marginBottom: 38, maxWidth: 680 }}>
            {/* eyebrow */}
            <div
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: T.accent,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: T.accent,
                  flexShrink: 0,
                }}
              />
              Late night · Kitsu is watching the fleet
            </div>

            {/* H1 — Noto Serif JP, weight 900, tight track */}
            <h1
              style={{
                fontFamily: T.fontDisplay,
                fontSize: 50,
                fontWeight: 900,
                lineHeight: 1.02,
                letterSpacing: "-0.025em",
                color: T.fg,
                margin: "0 0 18px",
              }}
            >
              The forge is warm.
              <br />
              <span style={{ color: T.accent, fontWeight: 700, fontSize: 46 }}>
                Ship the work.
              </span>
            </h1>

            {/* subhead — IBM Plex Sans, 15px, generous leading */}
            <p
              style={{
                fontFamily: T.fontBody,
                fontSize: 15,
                lineHeight: 1.68,
                color: T.muted,
                margin: 0,
                maxWidth: 520,
                fontWeight: 400,
              }}
            >
              Three sessions live, one waiting on your call. The night is quiet
              — a good time to ship the thing you keep circling.
            </p>
          </div>

          {/* ── project cards ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 32,
              maxWidth: 720,
            }}
          >
            <ProjectCard
              title="personal-os"
              meta="cockpit · 2d"
              stat="48% ctx"
              body="mcp_claude-in-chrome__browser_batch"
            />
            <ProjectCard
              title="metrasens"
              meta="signal-hub · 4d"
              stat="blocked"
              body="MRE bucket — UPGRADE or CURRENT?"
              alert
            />
          </div>

          {/* ── activity ── */}
          <div style={{ maxWidth: 720, marginBottom: 32 }}>
            {/* section label — smaller, no uppercase shouting */}
            <div
              style={{
                fontFamily: T.fontMono,
                fontSize: 10,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                color: T.muted,
                marginBottom: 6,
                paddingLeft: 6,
              }}
            >
              Recent activity
            </div>
            {/* subtle top rule only — no bottom rule on last row */}
            <div
              style={{
                borderTop: `1px solid ${T.border}`,
                paddingTop: 4,
              }}
            >
              <ActivityRow
                time="09:58"
                label="legibility foundation shipped"
                diff="+711 −0"
              />
              <ActivityRow
                time="09:24"
                label="party mode — Kitsu sings first"
                diff="+180 −44"
              />
              <ActivityRow
                time="08:51"
                label="fox head reframed"
                diff="+12 −9"
                last
              />
            </div>
          </div>

          {/* ── CTA ── */}
          <button
            className="imp-cta"
            style={{
              fontFamily: T.fontMono,
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 500,
              padding: "11px 24px",
              borderRadius: T.radius,
              border: `1px solid oklch(76% 0.078 72 / 0.50)`,
              background: "oklch(76% 0.078 72 / 0.10)",
              color: T.accent,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>+ New session</span>
            <span style={{ fontSize: 14, lineHeight: 1 }}>→</span>
          </button>
        </div>
      </div>
    </>
  );
}
