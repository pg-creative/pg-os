"use client";

/**
 * TopBarHome — Hero clock/greeting band + 12-col module grid.
 * Band 1 (hero) is kept intact. Bands 2-6 replaced with BentoGrid of live modules.
 * Each module fetches its own data and deep-links into its tab on tap.
 *
 * Emaki x Laputa aesthetic (LOCKED direction 2026-05-20).
 */

import React, { useState, useEffect } from "react";
import { PHASES } from "../../emaki/theme";
import { useMode } from "../../ModeProvider";
import { phaseForMode, EmakiProvider } from "../../bento/emakiContext";
import {
  EMAKI_CSS,
  useEmakiVars,
  KintsugiSeam,
  WashiPanel,
} from "../../emaki/materials";
import { BentoGrid } from "../../bento/BentoGrid";

// ── Modules (each fetches its own data, deep-links into its tab) ──
import { CalendarModule } from "./modules/CalendarModule";
import { MorningModule } from "./modules/MorningModule";
import { HabitsModule } from "./modules/HabitsModule";
import { FlowModule } from "./modules/FlowModule";
import { ProjectsModule } from "./modules/ProjectsModule";
import { VitalsModule } from "./modules/VitalsModule";
import { NowPlayingModule } from "./modules/NowPlayingModule";

/* ── Date/time helpers ── */

const DOW = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];
const MON = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

function liveDatestamp() {
  const d = new Date();
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return `${DOW[d.getDay()]} · ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · DAY ${dayOfYear} OF 365`;
}

function liveGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

/* ── Local CSS — hero band only ── */
const LOCAL_CSS = `
  /* ── Broadsheet layout shell ── */
  .v2-page {
    flex: 1;
    overflow-y: auto;
    position: relative;
    z-index: 10;
  }

  /* ── Band containers ── */
  .v2-band-inner {
    padding: 20px 32px;
  }
  @media (max-width: 640px) {
    .v2-band-inner { padding: 16px 16px; }
  }

  /* ── Band 1: Hero — clock + greeting + datestamp inline ── */
  .v2-hero-band {
    min-height: 96px;
    display: flex;
    align-items: center;
    gap: 0;
  }
  .v2-hero-clock {
    flex-shrink: 0;
    padding-right: 28px;
    border-right: 1px solid;
    margin-right: 28px;
    transition: border-color 0.5s ease;
  }
  .v2-clock-digits {
    font-family: 'DM Sans', monospace;
    font-size: clamp(36px, 5vw, 56px);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    letter-spacing: 0.04em;
    line-height: 1;
  }
  .v2-clock-tz {
    font-size: var(--text-2xs);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-top: 5px;
  }
  .v2-hero-greeting {
    flex: 1;
  }
  .v2-greeting-eyebrow {
    font-size: var(--text-2xs);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-family: 'Noto Serif JP', serif;
    margin-bottom: 5px;
  }
  .v2-greeting-main {
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(28px, 4vw, 42px);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .v2-greeting-date {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.05em;
    margin-top: 5px;
  }
  .v2-hero-kanji {
    flex-shrink: 0;
    padding-left: 28px;
    border-left: 1px solid;
    margin-left: 28px;
    text-align: right;
    transition: border-color 0.5s ease;
  }
  .v2-hero-kanji-text {
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(16px, 2vw, 22px);
    font-weight: 700;
    line-height: 1.2;
  }
  .v2-hero-kanji-sub {
    font-family: 'Noto Serif JP', serif;
    font-size: var(--text-2xs);
    font-weight: 400;
    letter-spacing: 0.06em;
    margin-top: 4px;
    text-align: right;
  }
  @media (max-width: 760px) {
    .v2-hero-kanji { display: none; }
  }

  /* ── Module grid wrapper ── */
  /* No scrim — the painted backdrop shows through; tiles float on the image. */
  .v2-modules-band {
    padding: 24px 32px 32px;
  }
  @media (max-width: 640px) {
    .v2-modules-band { padding: 16px 16px 24px; }
  }
`;

/* ── Page ── */

export default function TopBarHome() {
  // Phase comes from the GLOBAL theme (ModeProvider), so Home follows the
  // day/twilight/night toggle and its modules retint with everything else.
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const [clockStr, setClockStr] = useState("");
  const [datestamp, setDatestamp] = useState("");
  const [greeting, setGreeting] = useState("");
  const tk = PHASES[phase];

  useEmakiVars(phase);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setClockStr(`${h}:${m}:${s}`);
      setDatestamp(liveDatestamp());
      setGreeting(liveGreeting());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* Kintsugi underline color vars */
  const kintsugiVars = {
    "--v2-kintsugi-start": tk.gold,
    "--v2-kintsugi-peak": tk.goldBright,
  } as React.CSSProperties;

  return (
    <>
      <style>{EMAKI_CSS}</style>
      <style>{LOCAL_CSS}</style>

      <div
        className="el-root"
        style={{
          flexDirection: "column",
          background: "transparent",
          transition: "background 0.6s ease",
          ["--hero-halo" as string]: tk.heroHalo,
          ["--panel-blur" as string]: phase === "day" ? "none" : "blur(10px)",
          ...kintsugiVars,
        }}
      >
        {/* ── PAGE SCROLL CANVAS ── */}
        <main className="v2-page">
          {/* ──────────────────────────────────────────────────────────────────
              BAND 1 — HERO: clock + greeting + kanji title (tall, cinematic)
          ────────────────────────────────────────────────────────────────── */}
          <WashiPanel
            tk={tk}
            style={{
              borderRadius: 0,
              border: "none",
              borderBottom: `1px solid ${tk.divider}`,
            }}
          >
            <div className="v2-band-inner v2-hero-band">
              {/* Clock block */}
              <div
                className="v2-hero-clock"
                style={{ borderColor: tk.divider }}
              >
                <div
                  className="v2-clock-digits"
                  style={{
                    color: phase === "day" ? tk.textPrimary : tk.foxfire,
                    textShadow:
                      tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                  }}
                >
                  {clockStr || "00:00:00"}
                </div>
                <div className="v2-clock-tz" style={{ color: tk.textMuted }}>
                  UTC -05:00 · CDT
                </div>
              </div>

              {/* Greeting block */}
              <div className="v2-hero-greeting">
                <div
                  className="v2-greeting-eyebrow"
                  style={{ color: tk.eyebrowText }}
                >
                  {tk.eyebrowLabel}
                </div>
                <div
                  className="v2-greeting-main"
                  style={{
                    color: tk.textPrimary,
                    textShadow:
                      tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                  }}
                >
                  Good {greeting}, Patrick.
                </div>
                <div
                  className="v2-greeting-date"
                  style={{ color: tk.textMuted }}
                >
                  {datestamp}
                </div>
              </div>

              {/* Kanji title — right side */}
              <div
                className="v2-hero-kanji"
                style={{ borderColor: tk.divider }}
              >
                <div
                  className="v2-hero-kanji-text"
                  style={{
                    color: tk.textPrimary,
                    textShadow:
                      tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                  }}
                >
                  {tk.kanji}
                </div>
                <div className="v2-hero-kanji-sub" style={{ color: tk.accent }}>
                  {tk.subtitle}
                </div>
              </div>
            </div>
          </WashiPanel>

          <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />

          {/* ──────────────────────────────────────────────────────────────────
              MODULE GRID — 12-col BentoGrid of live tab-summary modules.
              Each module fetches its own data and opens its tab on tap.
          ────────────────────────────────────────────────────────────────── */}
          <EmakiProvider phase={phase}>
            <div className="v2-modules-band">
              <BentoGrid>
                {/* Row 1: Calendar (6) + Morning (6) */}
                <CalendarModule cols={6} />
                <MorningModule cols={6} />

                {/* Row 2: Habits (4) + Flow (4) + Projects (4) */}
                <HabitsModule cols={4} />
                <FlowModule cols={4} />
                <ProjectsModule cols={4} />

                {/* Row 3: Vitals (6) + Now Playing (6) */}
                <VitalsModule cols={6} />
                <NowPlayingModule cols={6} />
              </BentoGrid>
            </div>
          </EmakiProvider>

          {/* Footer padding */}
          <div style={{ height: 80 }} />
        </main>
      </div>
    </>
  );
}
