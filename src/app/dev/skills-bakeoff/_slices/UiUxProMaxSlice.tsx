"use client";
import React, { useEffect, useRef } from "react";

// ─── Design System (ui-ux-pro-max output) ────────────────────────────────────
// Style:      Modern Dark Cinema — deep #020203 base, cinematic glassmorphism
// Typography: Dashboard Data — Fira Code (data/mono) + Fira Sans (labels/body)
// Color:      --bg-deep #020203, --bg-base #050506, --bg-elevated #0a0a0c,
//             --accent #5E6AD2, --surface rgba(255 255 255/0.05),
//             --foreground #EDEDEF, --muted #8A8F98, --border rgba(255 255 255/0.08)
// Motion:     cubic-bezier(0.16,1,0.3,1) easing, stagger 30-50ms, scale 0.97→1
// Backdrop:   /art/aesthetic-2026-05-20/ghibli-hero_0.png (ambient wash, 4% opacity)
// ─────────────────────────────────────────────────────────────────────────────

const DS = {
  bgDeep: "#020203",
  bgBase: "#050506",
  bgEl: "#0a0a0c",
  bgCard: "rgba(255,255,255,0.04)",
  surface: "rgba(255,255,255,0.05)",
  accent: "#5E6AD2",
  accentGlow: "rgba(94,106,210,0.22)",
  accentMid: "rgba(94,106,210,0.12)",
  fg: "#EDEDEF",
  fgMuted: "#8A8F98",
  fgDim: "#565B66",
  border: "rgba(255,255,255,0.08)",
  borderHi: "rgba(255,255,255,0.14)",
  danger: "#F87171",
  dangerBg: "rgba(248,113,113,0.10)",
  success: "#4ADE80",
  radius: "14px",
  radiusSm: "8px",
  easing: "cubic-bezier(0.16,1,0.3,1)",
  fontMono: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  fontSans: "'Fira Sans', 'Inter', system-ui, sans-serif",
};

// ─── Nav tabs ────────────────────────────────────────────────────────────────
const TABS = [
  { label: "Home", active: true },
  { label: "Habits", active: false },
  { label: "Projects", active: false },
  { label: "Cockpit", active: false },
];

// ─── Project cards ────────────────────────────────────────────────────────────
const PROJECTS = [
  {
    title: "personal-os",
    context: "cockpit",
    age: "2d",
    stat: "48% ctx",
    statAlert: false,
    body: "mcp_claude-in-chrome__browser_batch",
  },
  {
    title: "metrasens",
    context: "signal-hub",
    age: "4d",
    stat: "blocked",
    statAlert: true,
    body: "MRE bucket — UPGRADE or CURRENT?",
  },
];

// ─── Activity feed ────────────────────────────────────────────────────────────
const ACTIVITY = [
  {
    time: "09:58",
    label: "legibility foundation shipped",
    diff: "+711",
    neg: "−0",
    pos: true,
  },
  {
    time: "09:24",
    label: "party mode — Kitsu sings first",
    diff: "+180",
    neg: "−44",
    pos: true,
  },
  {
    time: "08:51",
    label: "fox head reframed",
    diff: "+12",
    neg: "−9",
    pos: true,
  },
];

// ─── Blob SVG (ambient motion decoration) ────────────────────────────────────
function AmbientBlobs() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "60%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(94,106,210,0.08) 0%, transparent 70%)`,
          filter: "blur(40px)",
          animation: "blobDrift1 18s ease-in-out infinite alternate",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "-8%",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(94,106,210,0.06) 0%, transparent 70%)`,
          filter: "blur(50px)",
          animation: "blobDrift2 22s ease-in-out infinite alternate",
        }}
      />
    </div>
  );
}

// ─── Wordmark ────────────────────────────────────────────────────────────────
function Wordmark() {
  return (
    <div
      style={{
        fontFamily: DS.fontMono,
        fontWeight: 600,
        fontSize: "15px",
        letterSpacing: "0.08em",
        color: DS.fg,
        display: "flex",
        alignItems: "center",
        gap: 8,
        userSelect: "none",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 28,
          height: 28,
          borderRadius: 6,
          background: `linear-gradient(135deg, ${DS.accent} 0%, rgba(94,106,210,0.7) 100%)`,
          boxShadow: `0 0 14px ${DS.accentGlow}`,
          flexShrink: 0,
        }}
      />
      PG OS
    </div>
  );
}

// ─── Nav tab ─────────────────────────────────────────────────────────────────
function NavTab({ label, active }: { label: string; active: boolean }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      style={{
        fontFamily: DS.fontSans,
        fontSize: "13px",
        fontWeight: active ? 600 : 400,
        color: active ? DS.fg : DS.fgMuted,
        background: active ? DS.surface : "transparent",
        border: active ? `1px solid ${DS.borderHi}` : "1px solid transparent",
        borderRadius: DS.radiusSm,
        padding: "6px 14px",
        cursor: "pointer",
        transition: `color 200ms ${DS.easing}, background 200ms ${DS.easing}`,
        whiteSpace: "nowrap",
        position: "relative",
      }}
    >
      {label}
      {active && (
        <span
          style={{
            position: "absolute",
            bottom: -1,
            left: "50%",
            transform: "translateX(-50%)",
            width: 18,
            height: 2,
            borderRadius: 2,
            background: DS.accent,
          }}
        />
      )}
    </button>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ value, alert }: { value: string; alert: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: DS.fontMono,
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.04em",
        color: alert ? DS.danger : DS.accent,
        background: alert ? DS.dangerBg : DS.accentMid,
        borderRadius: 6,
        padding: "3px 8px",
        border: `1px solid ${alert ? "rgba(248,113,113,0.22)" : "rgba(94,106,210,0.22)"}`,
      }}
    >
      {alert && (
        <svg
          width="9"
          height="9"
          viewBox="0 0 9 9"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="4.5"
            cy="4.5"
            r="4"
            stroke={DS.danger}
            strokeWidth="1.2"
          />
          <line
            x1="4.5"
            y1="2.5"
            x2="4.5"
            y2="5"
            stroke={DS.danger}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="4.5" cy="6.5" r="0.5" fill={DS.danger} />
        </svg>
      )}
      {value}
    </span>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────
function ProjectCard({
  project,
  delay,
}: {
  project: (typeof PROJECTS)[0];
  delay: number;
}) {
  return (
    <div
      tabIndex={0}
      style={{
        flex: 1,
        minWidth: 0,
        background: DS.bgCard,
        border: `1px solid ${DS.border}`,
        borderRadius: DS.radius,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "pointer",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: `transform 220ms ${DS.easing}, border-color 220ms ${DS.easing}, box-shadow 220ms ${DS.easing}`,
        animation: `cardEnter 400ms ${DS.easing} ${delay}ms both`,
        outline: "none",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform =
          "scale(1.012) translateY(-1px)";
        (e.currentTarget as HTMLDivElement).style.borderColor = DS.borderHi;
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px ${DS.borderHi}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "";
        (e.currentTarget as HTMLDivElement).style.borderColor = DS.border;
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 0 0 2px ${DS.accent}`;
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: DS.fontMono,
              fontSize: "14px",
              fontWeight: 600,
              color: DS.fg,
              letterSpacing: "0.02em",
            }}
          >
            {project.title}
          </div>
          <div
            style={{
              fontFamily: DS.fontSans,
              fontSize: "11px",
              color: DS.fgMuted,
              marginTop: 3,
              letterSpacing: "0.03em",
            }}
          >
            {project.context} · {project.age}
          </div>
        </div>
        <StatPill value={project.stat} alert={project.statAlert} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: DS.border }} />

      {/* Body */}
      <div
        style={{
          fontFamily: DS.fontMono,
          fontSize: "12px",
          color: DS.fgMuted,
          lineHeight: 1.6,
          letterSpacing: "0.02em",
          wordBreak: "break-word",
        }}
      >
        {project.body}
      </div>
    </div>
  );
}

// ─── Activity row ─────────────────────────────────────────────────────────────
function ActivityRow({
  row,
  delay,
}: {
  row: (typeof ACTIVITY)[0];
  delay: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "48px 1fr auto",
        alignItems: "center",
        gap: "0 16px",
        padding: "10px 0",
        borderBottom: `1px solid ${DS.border}`,
        animation: `fadeSlideUp 300ms ${DS.easing} ${delay}ms both`,
      }}
    >
      <span
        style={{
          fontFamily: DS.fontMono,
          fontSize: "11px",
          color: DS.fgDim,
          letterSpacing: "0.03em",
        }}
      >
        {row.time}
      </span>
      <span
        style={{
          fontFamily: DS.fontSans,
          fontSize: "13px",
          color: DS.fgMuted,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {row.label}
      </span>
      <span
        style={{
          fontFamily: DS.fontMono,
          fontSize: "11px",
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: DS.success }}>{row.diff}</span>{" "}
        <span style={{ color: DS.fgDim }}>{row.neg}</span>
      </span>
    </div>
  );
}

// ─── CTA button ───────────────────────────────────────────────────────────────
function CTAButton() {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      aria-label="Start new session"
      style={{
        fontFamily: DS.fontSans,
        fontSize: "14px",
        fontWeight: 600,
        color: "#fff",
        background: `linear-gradient(135deg, ${DS.accent} 0%, rgba(94,106,210,0.85) 100%)`,
        border: "none",
        borderRadius: "10px",
        padding: "12px 28px",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        letterSpacing: "0.02em",
        boxShadow: `0 0 24px ${DS.accentGlow}, 0 2px 8px rgba(0,0,0,0.4)`,
        transition: `transform 180ms ${DS.easing}, box-shadow 180ms ${DS.easing}`,
        touchAction: "manipulation",
        minWidth: 44,
        minHeight: 44,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.03) translateY(-1px)";
        e.currentTarget.style.boxShadow = `0 0 36px rgba(94,106,210,0.38), 0 4px 16px rgba(0,0,0,0.45)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = `0 0 24px ${DS.accentGlow}, 0 2px 8px rgba(0,0,0,0.4)`;
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.97)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1.03) translateY(-1px)";
      }}
    >
      + New session
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 7h8M7 3l4 4-4 4"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function UiUxProMaxSlice() {
  return (
    <>
      {/* ── Injected styles (Google Fonts + keyframes) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');

        @keyframes blobDrift1 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(-30px, 20px) scale(1.06); }
          100% { transform: translate(20px, -15px) scale(0.94); }
        }
        @keyframes blobDrift2 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(25px, -20px) scale(0.95); }
          100% { transform: translate(-10px, 25px) scale(1.05); }
        }
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* ── Outer shell ── */}
      <div
        style={{
          background: DS.bgDeep,
          color: DS.fg,
          fontFamily: DS.fontSans,
          minHeight: 640,
          maxWidth: 1180,
          margin: "0 auto",
          borderRadius: 18,
          overflow: "hidden",
          position: "relative",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* Ambient blobs */}
        <AmbientBlobs />

        {/* Ghibli hero tint — extremely subtle backdrop wash */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 380,
            backgroundImage: "url(/art/aesthetic-2026-05-20/ghibli-hero_0.png)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            opacity: 0.04,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Dark gradient over the tint for legibility */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 380,
            background: `linear-gradient(to bottom, transparent 0%, ${DS.bgDeep} 85%)`,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* ── CHROME: topbar ── */}
        <nav
          aria-label="Main navigation"
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 28px",
            borderBottom: `1px solid ${DS.border}`,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            background: "rgba(5,5,6,0.75)",
          }}
        >
          <Wordmark />

          {/* Tab bar */}
          <div role="tablist" style={{ display: "flex", gap: 4 }}>
            {TABS.map((t) => (
              <NavTab key={t.label} label={t.label} active={t.active} />
            ))}
          </div>

          {/* Status dot */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: DS.fontMono,
              fontSize: "11px",
              color: DS.fgDim,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: DS.success,
                boxShadow: `0 0 6px ${DS.success}`,
              }}
            />
            3 live
          </div>
        </nav>

        {/* ── HERO ── */}
        <header
          role="main"
          style={{
            position: "relative",
            zIndex: 2,
            padding: "48px 28px 36px",
            animation: `heroFade 500ms ${DS.easing} 60ms both`,
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              fontFamily: DS.fontMono,
              fontSize: "12px",
              color: DS.fgMuted,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="5" stroke={DS.fgDim} strokeWidth="1" />
              <path
                d="M6 3v3.5l2 1.5"
                stroke={DS.fgDim}
                strokeWidth="1"
                strokeLinecap="round"
              />
            </svg>
            Late night · Kitsu is watching the fleet
          </div>

          {/* H1 */}
          <h1
            style={{
              fontFamily: DS.fontMono,
              fontSize: "clamp(26px, 4vw, 38px)",
              fontWeight: 700,
              color: DS.fg,
              margin: "0 0 16px",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              maxWidth: 640,
            }}
          >
            The fleet is quiet.
            <br />
            <span
              style={{
                background: `linear-gradient(95deg, ${DS.fg} 0%, ${DS.accent} 120%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Ship the thing.
            </span>
          </h1>

          {/* Subhead */}
          <p
            style={{
              fontFamily: DS.fontSans,
              fontSize: "15px",
              color: DS.fgMuted,
              lineHeight: 1.65,
              maxWidth: 520,
              margin: "0 0 28px",
            }}
          >
            Three sessions live, one waiting on your call. The night is quiet —
            a good time to ship the thing you keep circling.
          </p>

          {/* CTA */}
          <CTAButton />
        </header>

        {/* ── CONTENT GRID ── */}
        <section
          aria-label="Project overview"
          style={{
            position: "relative",
            zIndex: 2,
            padding: "0 28px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* ── Project cards ── */}
          <div>
            <div
              style={{
                fontFamily: DS.fontMono,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: DS.fgDim,
                marginBottom: 12,
              }}
            >
              Active
            </div>
            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              {PROJECTS.map((p, i) => (
                <ProjectCard key={p.title} project={p} delay={80 + i * 50} />
              ))}
            </div>
          </div>

          {/* ── Activity feed ── */}
          <div
            style={{
              background: DS.bgCard,
              border: `1px solid ${DS.border}`,
              borderRadius: DS.radius,
              padding: "18px 20px",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                fontFamily: DS.fontMono,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: DS.fgDim,
                marginBottom: 2,
              }}
            >
              Recent activity
            </div>

            <div>
              {ACTIVITY.map((row, i) => (
                <ActivityRow
                  key={row.time + row.label}
                  row={row}
                  delay={180 + i * 40}
                />
              ))}
            </div>

            {/* Fade-out footer */}
            <div
              style={{
                paddingTop: 10,
                fontFamily: DS.fontMono,
                fontSize: "11px",
                color: DS.fgDim,
                letterSpacing: "0.04em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: `color 180ms ${DS.easing}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.color = DS.fgMuted;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.color = DS.fgDim;
              }}
            >
              view full log
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 5h6M5 2l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </section>

        {/* Bottom safe-area padding */}
        <div style={{ height: 12 }} aria-hidden="true" />
      </div>
    </>
  );
}
