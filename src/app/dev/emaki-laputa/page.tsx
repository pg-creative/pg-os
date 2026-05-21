"use client";

import React, { useState, useEffect } from "react";
import { MarvisCorner } from "../../_components/views/cockpit/MarvisCorner";
import { PHASES, Phase, phaseForHour } from "../../_components/emaki/theme";
import {
  EMAKI_CSS,
  useEmakiVars,
  PaintedBackdrop,
  FoxfireLayer,
  KintsugiSeam,
  WashiPanel,
  GlyphSun,
  GlyphDusk,
  GlyphMoon,
} from "../../_components/emaki/materials";

/* ─────────────────────────────────────────────────────────────────────────────
   Emaki x Laputa — v2
   SOUL: Emaki painted world, foxfire, kodama orbs, kintsugi gold, Noto Serif JP
   BODY: Laputa crisp legibility — washi paper panels, DM Sans data, sleek rail

   3 phases: night (default) · twilight · day
   Theme tokens and building-block components live in:
     src/app/_components/emaki/theme.ts     (PHASES object, Phase type, phaseForHour)
     src/app/_components/emaki/materials.tsx (PaintedBackdrop, WashiPanel, FoxfireLayer, ...)
───────────────────────────────────────────────────────────────────────────── */

/* ─── Shared content (prototype-local, not part of the shared module) ─── */
const NAV_ITEMS = [
  { label: "Home", active: true, glyph: "⌂" },
  { label: "Habits", active: false, glyph: "◎" },
  { label: "Projects", active: false, glyph: "⬡" },
  { label: "Flow", active: false, glyph: "∿" },
  { label: "Claude", active: false, glyph: "✦" },
];

const ACTIVITY = [
  {
    time: "09:58",
    msg: "legibility foundation shipped",
    diff: "+711 −0",
    positive: true,
  },
  {
    time: "09:24",
    msg: "party mode — Kitsu sings first",
    diff: "+180 −44",
    positive: true,
  },
  { time: "08:51", msg: "fox head reframed", diff: "+12 −9", positive: true },
];

export default function EmakiLaputa() {
  const [phase, setPhase] = useState<Phase>("night");
  const tk = PHASES[phase];

  /* Apply luminance-aware CSS vars (--panel-blur, --hero-halo) to root */
  useEmakiVars(phase);

  /* Auto-detect time of day on first render */
  useEffect(() => {
    setPhase(phaseForHour(new Date().getHours()));
  }, []);

  return (
    <>
      <style>{EMAKI_CSS}</style>

      <div
        className="el-root"
        style={{
          background: tk.bg,
          transition: "background 0.6s ease",
          ["--hero-halo" as string]: tk.heroHalo,
          ["--panel-blur" as string]: phase === "day" ? "none" : "blur(10px)",
        }}
      >
        {/* ── World painting layers ── */}
        <PaintedBackdrop phase={phase} />

        {/* ── Drifting orbs (foxfire/kodama) + sakura petals ── */}
        <FoxfireLayer phase={phase} />

        {/* ── Left nav rail — Laputa sleek ── */}
        <nav
          className="el-rail"
          aria-label="Primary navigation"
          style={{
            background: tk.railBg,
            borderRight: `1px solid ${tk.railBorder}`,
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <div className="el-wordmark" style={{ color: tk.goldBright }}>
            PG OS
          </div>

          <div className="el-nav-items">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className={`el-nav-item${item.active ? " active" : ""}`}
                role="button"
                tabIndex={0}
                title={item.label}
                aria-pressed={item.active}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    e.currentTarget.click();
                }}
                style={{
                  background: item.active ? tk.pillActive : "transparent",
                  border: item.active
                    ? `1px solid ${tk.accentDim}`
                    : "1px solid transparent",
                }}
              >
                {item.active && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: 22,
                      borderRadius: "0 2px 2px 0",
                      background: `linear-gradient(180deg, ${tk.foxfireGlow}, ${tk.accent})`,
                      boxShadow: `0 0 8px ${tk.orbGlow}`,
                    }}
                  />
                )}
                <span
                  className="el-nav-glyph"
                  style={{ color: item.active ? tk.foxfire : tk.textMuted }}
                >
                  {item.glyph}
                </span>
                <span
                  className="el-nav-label"
                  style={{ color: item.active ? tk.accent : tk.textMuted }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </nav>

        {/* ── Main canvas ── */}
        <main className="el-main">
          {/* Hero section */}
          <section style={{ paddingTop: 8 }}>
            <p className="el-eyebrow" style={{ color: tk.eyebrowText }}>
              {tk.eyebrowLabel}
            </p>
            <h1 className="el-h1-kanji" style={{ color: tk.textPrimary }}>
              {tk.kanji}
            </h1>
            <p className="el-h1-sub" style={{ color: tk.accent }}>
              {tk.subtitle}
            </p>
            <p className="el-subhead" style={{ color: tk.textSub }}>
              Three sessions live, one waiting on your call. The night is quiet
              — a good time to ship the thing you keep circling.
            </p>

            {/* Stat strip — quick vitals inline with hero */}
            <div className="el-stat-strip">
              {[
                { val: "3", lbl: "active" },
                { val: "14", lbl: "shipped" },
                { val: "2", lbl: "blocked" },
                { val: "48%", lbl: "ctx" },
              ].map((s) => (
                <div
                  key={s.lbl}
                  className="el-stat"
                  style={{
                    background: tk.panelBg,
                    border: `1px solid ${tk.panelBorder}`,
                  }}
                >
                  <div className="el-stat-val" style={{ color: tk.foxfire }}>
                    {s.val}
                  </div>
                  <div className="el-stat-lbl" style={{ color: tk.textMuted }}>
                    {s.lbl}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="el-section-gap" />

          {/* Kintsugi divider */}
          <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />

          <div className="el-section-gap" />

          {/* Active sessions */}
          <section>
            <p
              className="el-panel-label"
              style={{ color: tk.gold, marginBottom: 12 }}
            >
              Active sessions
            </p>
            <div className="el-projects">
              {/* personal-os card */}
              <WashiPanel tk={tk}>
                <div className="el-project-header">
                  <span
                    className="el-project-name"
                    style={{ color: tk.textPrimary }}
                  >
                    personal-os
                  </span>
                  <span
                    className="el-pill"
                    style={{
                      background: `rgba(52,211,153,0.13)`,
                      border: `1px solid rgba(52,211,153,0.30)`,
                      color: "#34D399",
                    }}
                  >
                    <span
                      className="el-pill-dot"
                      style={{ background: "#34D399" }}
                    />
                    live
                  </span>
                </div>
                <div className="el-project-meta">
                  <span
                    className="el-pill"
                    style={{
                      background: `${tk.accent}16`,
                      border: `1px solid ${tk.accent}38`,
                      color: tk.foxfire,
                    }}
                  >
                    cockpit · 2d
                  </span>
                  <span
                    className="el-pill"
                    style={{
                      background: `${tk.accent}16`,
                      border: `1px solid ${tk.accent}38`,
                      color: tk.foxfire,
                    }}
                  >
                    48% ctx
                  </span>
                </div>
                <span
                  className="el-tool-chip"
                  style={{
                    background: `rgba(100,140,200,0.06)`,
                    border: `1px solid rgba(100,140,200,0.12)`,
                    color: tk.textMuted,
                  }}
                >
                  mcp_claude-in-chrome__browser_batch
                </span>
                <div
                  className="el-ctx-bar"
                  style={{ background: `${tk.accent}14` }}
                >
                  <div
                    className="el-ctx-fill"
                    style={{
                      background: `linear-gradient(90deg, ${tk.foxfireGlow}, ${tk.accent})`,
                      boxShadow: `0 0 6px ${tk.orbGlow}`,
                    }}
                  />
                </div>
              </WashiPanel>

              {/* metrasens card — blocked: red ink-rule override */}
              <WashiPanel tk={tk} inkColor="rgba(248,113,113,0.6)">
                <div className="el-project-header">
                  <span
                    className="el-project-name"
                    style={{ color: tk.textPrimary }}
                  >
                    metrasens
                  </span>
                  <span
                    className="el-pill"
                    style={{
                      background: "rgba(248,113,113,0.12)",
                      border: "1px solid rgba(248,113,113,0.30)",
                      color: "#F87171",
                    }}
                  >
                    <span
                      className="el-pill-dot"
                      style={{ background: "#F87171" }}
                    />
                    blocked
                  </span>
                </div>
                <div className="el-project-meta">
                  <span
                    className="el-pill"
                    style={{
                      background: `${tk.accent}16`,
                      border: `1px solid ${tk.accent}38`,
                      color: tk.foxfire,
                    }}
                  >
                    signal-hub · 4d
                  </span>
                </div>
                <p className="el-blocked-note" style={{ color: "#F87171" }}>
                  MRE bucket — UPGRADE or CURRENT?
                </p>
              </WashiPanel>
            </div>
          </section>

          <div className="el-section-gap" />

          {/* Kintsugi divider */}
          <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />

          <div className="el-section-gap" />

          {/* Recent activity */}
          <section>
            <WashiPanel tk={tk}>
              <p className="el-panel-label" style={{ color: tk.gold }}>
                Recent activity
              </p>
              {ACTIVITY.map((row, i) => (
                <div
                  key={i}
                  className="el-activity-row"
                  style={{ borderColor: `${tk.accent}16` }}
                >
                  <span className="el-time" style={{ color: tk.textMuted }}>
                    {row.time}
                  </span>
                  <span
                    className="el-activity-msg"
                    style={{ color: tk.textSub }}
                  >
                    {row.msg}
                  </span>
                  <span className="el-diff" style={{ color: tk.foxfire }}>
                    {row.diff}
                  </span>
                </div>
              ))}
            </WashiPanel>
          </section>

          <div className="el-section-gap" />

          {/* CTA */}
          <button
            className="el-cta"
            type="button"
            style={{
              background: tk.ctaBg,
              borderColor: tk.ctaBorder,
              color: tk.ctaText,
            }}
          >
            + New session →
          </button>
        </main>

        {/* ── Phase toggle — no overflow, no emoji ── */}
        <div
          className="el-toggle"
          style={{
            background: tk.toggleBg,
            borderColor: tk.divider,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {(["day", "twilight", "night"] as Phase[]).map((p) => (
            <button
              key={p}
              className="el-toggle-btn"
              type="button"
              onClick={() => setPhase(p)}
              aria-pressed={phase === p}
              style={{
                background: phase === p ? PHASES[p].pillActive : "transparent",
                color:
                  phase === p ? PHASES[p].pillTextActive : tk.pillTextInactive,
              }}
            >
              {p === "day" ? (
                <GlyphSun
                  color={
                    phase === p ? PHASES[p].pillTextActive : tk.pillTextInactive
                  }
                />
              ) : p === "twilight" ? (
                <GlyphDusk
                  color={
                    phase === p ? PHASES[p].pillTextActive : tk.pillTextInactive
                  }
                />
              ) : (
                <GlyphMoon
                  color={
                    phase === p ? PHASES[p].pillTextActive : tk.pillTextInactive
                  }
                />
              )}
              {PHASES[p].phaseName}
            </button>
          ))}
        </div>

        {/* ── Real Kitsu (MarvisCorner) — Live2D fox + chat widget ── */}
        <MarvisCorner modelUrl="/live2d/fox/standard_fox.model3.json" />
      </div>
    </>
  );
}
