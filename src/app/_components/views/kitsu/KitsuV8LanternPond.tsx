"use client";

/**
 * KitsuV8LanternPond — SCENE / DIORAMA.
 *
 * The Kitsu tab as a still pond seen from above (a Ghibli garden at the hour
 * the lights come on). The room is composed as a single scene rather than a
 * dashboard of panels. Personhood lives in the WATER itself: Kitsu's
 * reflection sits at center, still when idle, rippling when she speaks,
 * glassy when she thinks.
 *
 * - SOUL: four paper lanterns (魂 心 人 記) drift on the surface. Tap a
 *   lantern and it floats closer to the camera while its inscription unfurls
 *   on the water beside it. When Kitsu touches a soul facet, that lantern's
 *   flame brightens.
 * - TOOLS: every tool call is a ripple expanding from the reflection. At
 *   the moment of impact a calligraphic glyph appears at the epicenter,
 *   then dissolves into concentric rings as it spreads.
 * - DECISIONS: paper boats drift along the bottom edge with the most recent
 *   decision-log entries written on their hulls. They drift right-to-left
 *   and fall off the edge.
 * - STATE: the surface itself reports state. Idle = mirror-still water.
 *   Listening = the reflection looks up, koi-ripple at the edge. Thinking
 *   = surface goes glassy and quiet. Speaking = a brief koi-rise sends
 *   slow circles outward.
 * - CHAT: text floats UP across the surface like calligraphy on water,
 *   then settles. Composer sits at the bottom on a small wooden pier.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMarvis } from "../cockpit/useMarvis";
import { useMode } from "../../ModeProvider";
import { phaseForMode } from "../../bento/emakiContext";
import { PHASES } from "../../emaki/theme";
import {
  KITSU_C,
  ChatComposer,
  StatePill,
  useSoul,
  type SoulKey,
} from "./KitsuShared";

const LANTERNS: Array<{ key: SoulKey; glyph: string; label: string; angle: number }> = [
  { key: "IDENTITY", glyph: "魂", label: "Identity", angle: -135 },
  { key: "SOUL",     glyph: "心", label: "Soul",     angle: -45  },
  { key: "USER",     glyph: "人", label: "User",     angle: 45   },
  { key: "MEMORY",   glyph: "記", label: "Memory",   angle: 135  },
];

// Tools that touch the soul. The matching lantern brightens.
const TOOL_TO_SOUL: Record<string, SoulKey> = {
  remember: "MEMORY",
  update_user: "USER",
  update_soul: "SOUL",
};

interface Ripple {
  id: number;
  tool: string;
  glyph: string;
  startedAt: number;
}

function rippleGlyph(tool: string): string {
  if (tool.startsWith("read_")) return "◇";
  if (tool === "monitor_fleet") return "◎";
  if (tool.startsWith("control_")) return "◈";
  if (tool.startsWith("propose_")) return "△";
  if (tool.startsWith("add_")) return "✦";
  if (tool.startsWith("launch_")) return "▷";
  if (tool.startsWith("kill_")) return "▽";
  if (tool === "remember") return "記";
  if (tool === "update_user") return "人";
  if (tool === "update_soul") return "心";
  if (tool === "complete_habit") return "✓";
  return "○";
}

export function KitsuV8LanternPond() {
  const marvis = useMarvis();
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const tk = PHASES[phase];
  const soul = useSoul();

  const [openLantern, setOpenLantern] = useState<SoulKey | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const lastToolRef = useRef<string | null>(null);
  const rippleIdRef = useRef(0);

  // Track every distinct tool fire as a new ripple on the water.
  useEffect(() => {
    if (marvis.activeTool && marvis.activeTool !== lastToolRef.current) {
      lastToolRef.current = marvis.activeTool;
      rippleIdRef.current += 1;
      const ev: Ripple = {
        id: rippleIdRef.current,
        tool: marvis.activeTool,
        glyph: rippleGlyph(marvis.activeTool),
        startedAt: Date.now(),
      };
      setRipples((cur) => [ev, ...cur].slice(0, 4));
    } else if (!marvis.activeTool) {
      lastToolRef.current = null;
    }
  }, [marvis.activeTool]);

  // Which lantern (if any) glows because Kitsu is touching that soul facet.
  const activeSoul = useMemo<SoulKey | null>(() => {
    if (!marvis.activeTool) return null;
    return TOOL_TO_SOUL[marvis.activeTool] ?? null;
  }, [marvis.activeTool]);

  // Decision-log → paper boats along the bottom edge (most recent first).
  const boats = useMemo(() => {
    const raw = soul.files?.["decision-log"] ?? "";
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(-5)
      .reverse();
  }, [soul.files]);

  // Water color shifts per phase (gold day, plum twilight, indigo night).
  const water =
    phase === "day"
      ? "radial-gradient(ellipse at 50% 50%, #d4c89e 0%, #a09060 70%, #6e5a30 100%)"
      : phase === "twilight"
        ? "radial-gradient(ellipse at 50% 50%, #3c2444 0%, #1e1230 60%, #0a0418 100%)"
        : "radial-gradient(ellipse at 50% 50%, #16243e 0%, #0a1226 60%, #03070f 100%)";

  // Chat: most recent assistant + user turn floating on the surface.
  const surfaceTurns = useMemo(() => {
    const turns = marvis.turns.slice(-4);
    return turns;
  }, [marvis.turns]);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "calc(100dvh - 56px)",
        color: tk.textPrimary,
        background: tk.bg,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        .v8-pond {
          position: absolute;
          inset: 0;
          background: ${water};
          overflow: hidden;
        }
        /* Painted-den whisper just outside the pond, framed cinematically */
        .v8-den-frame {
          position: absolute;
          inset: 0;
          background-image: url('/kitsu/den-${phase === "day" ? "day" : phase === "twilight" ? "twilight" : "night"}.webp');
          background-size: cover;
          background-position: center;
          opacity: 0.25;
          mix-blend-mode: ${phase === "day" ? "multiply" : "screen"};
          pointer-events: none;
        }
        /* Soft vignette so the pond reads as the focus */
        .v8-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%);
          pointer-events: none;
        }

        /* The reflection: Kitsu's face in the water */
        .v8-reflection {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 45%, ${tk.foxfire}66, transparent 60%),
            radial-gradient(circle at 50% 50%, rgba(0,0,0,0.0), rgba(0,0,0,0.35) 90%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 92px;
          filter: drop-shadow(0 0 26px ${tk.foxfireGlow}66) blur(0.4px);
          transition: filter 800ms ease, transform 800ms ease;
        }
        .v8-reflection[data-state="thinking"]  { filter: drop-shadow(0 0 18px ${tk.foxfireGlow}44) blur(0px); }
        .v8-reflection[data-state="speaking"]  { animation: v8KoiPulse 1.4s ease-in-out infinite; }
        .v8-reflection[data-state="listening"] { transform: translate(-50%, -52%) scale(1.04); }
        @keyframes v8KoiPulse {
          0%, 100% { transform: translate(-50%, -50%)   scale(1); }
          50%      { transform: translate(-50%, -50%)   scale(1.05); filter: drop-shadow(0 0 36px ${tk.foxfireGlow}99); }
        }

        /* Ripples: concentric expanding rings + central glyph */
        .v8-ripple {
          position: absolute;
          left: 50%;
          top: 50%;
          border-radius: 50%;
          border: 1.5px solid ${tk.foxfire}66;
          transform: translate(-50%, -50%);
          pointer-events: none;
          animation: v8Ripple 3.2s ease-out forwards;
        }
        @keyframes v8Ripple {
          0%   { width: 80px;  height: 80px;  opacity: 0.9; border-width: 2px; }
          60%  { opacity: 0.45; }
          100% { width: 760px; height: 760px; opacity: 0;   border-width: 0.5px; }
        }
        .v8-ripple-glyph {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          font-family: 'Noto Serif JP', serif;
          font-size: 38px;
          color: ${tk.foxfire};
          text-shadow: 0 0 22px ${tk.foxfireGlow};
          animation: v8GlyphFade 2.4s ease-out forwards;
          pointer-events: none;
        }
        @keyframes v8GlyphFade {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          18%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.4); }
        }

        /* Lanterns: paper boxes with a kanji painted on the side */
        .v8-lantern {
          position: absolute;
          width: 78px;
          padding: 16px 10px 12px;
          background: linear-gradient(180deg, ${tk.foxfire}33 0%, ${tk.gold}55 100%);
          border: 1px solid ${tk.gold}88;
          border-radius: 8px;
          box-shadow:
            0 0 24px ${tk.foxfireGlow}66,
            inset 0 0 12px ${tk.foxfire}44;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: transform 600ms cubic-bezier(.22,1,.36,1),
                      box-shadow 600ms ease,
                      background 600ms ease;
          animation: v8LanternBob 6s ease-in-out infinite;
          touch-action: manipulation;
        }
        .v8-lantern:hover, .v8-lantern:focus-visible {
          outline: none;
          box-shadow: 0 0 36px ${tk.foxfireGlow}aa, inset 0 0 16px ${tk.foxfire}66;
        }
        .v8-lantern[data-active="true"] {
          box-shadow: 0 0 48px ${tk.foxfireGlow}, inset 0 0 24px ${tk.foxfire}aa;
          animation: v8LanternFlare 1.6s ease-in-out infinite;
        }
        .v8-lantern[data-open="true"] {
          transform: scale(1.18);
          box-shadow: 0 0 60px ${tk.foxfireGlow}, inset 0 0 28px ${tk.foxfire}cc;
        }
        @keyframes v8LanternBob {
          0%, 100% { translate: 0 0;   }
          50%      { translate: 0 -6px;}
        }
        @keyframes v8LanternFlare {
          0%, 100% { filter: brightness(1);    }
          50%      { filter: brightness(1.30); }
        }
        .v8-lantern-glyph {
          font-family: 'Noto Serif JP', serif;
          font-size: 28px;
          line-height: 1;
          color: ${phase === "day" ? "#3a2410" : "#2a1808"};
          text-shadow: 0 0 6px ${tk.foxfire};
        }
        .v8-lantern-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${phase === "day" ? "#1a0e04" : tk.textPrimary};
          opacity: 0.85;
        }
        .v8-lantern-string {
          position: absolute;
          top: -12px;
          left: 50%;
          width: 1px;
          height: 12px;
          background: ${tk.gold}aa;
          transform: translateX(-50%);
        }

        /* Open-lantern inscription: floats next to its lantern */
        .v8-inscription {
          position: absolute;
          width: 320px;
          max-height: 260px;
          overflow-y: auto;
          padding: 14px 16px;
          background:
            linear-gradient(180deg, ${tk.panelBg} 0%, rgba(0,0,0,0.6) 100%);
          border: 1px solid ${tk.panelBorder};
          border-radius: 10px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.65), inset 0 0 0 0.5px ${tk.panelInkBorder}33;
          color: ${tk.textPrimary};
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          line-height: 1.55;
          z-index: 30;
          animation: v8InscriptionRise 280ms cubic-bezier(.22,1,.36,1);
        }
        @keyframes v8InscriptionRise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Floating chat — calligraphy on the surface */
        .v8-surface-line {
          position: absolute;
          font-family: 'Noto Serif JP', serif;
          font-size: 16px;
          line-height: 1.5;
          color: ${tk.textPrimary};
          text-shadow: 0 0 16px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,1);
          max-width: 360px;
          padding: 10px 16px;
          background: linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.25) 100%);
          border: 1px solid ${tk.gold}44;
          border-radius: 12px;
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          animation: v8SurfaceRise 600ms cubic-bezier(.22,1,.36,1);
        }
        .v8-surface-line[data-role="user"] {
          right: 6%;
          background: linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%);
          color: ${tk.textPrimary};
          border-color: ${tk.divider};
        }
        .v8-surface-line[data-role="assistant"] {
          left: 6%;
          color: ${tk.foxfire};
        }
        @keyframes v8SurfaceRise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }

        /* The pier (composer) sits at the bottom */
        .v8-pier {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          flex-direction: column;
          z-index: 12;
        }
        .v8-pier-plank {
          height: 8px;
          background: linear-gradient(180deg, ${tk.gold}aa 0%, #5a3818 100%);
          box-shadow: inset 0 -2px 0 rgba(0,0,0,0.4);
        }
        .v8-composer-wrap {
          background: rgba(8,5,3,0.86);
          border-top: 1px solid ${tk.gold}66;
        }

        /* Boats: decision log drifting bottom-left */
        .v8-boat-strip {
          position: absolute;
          bottom: 64px;
          left: 0;
          right: 0;
          height: 26px;
          display: flex;
          gap: 38px;
          padding-left: 24px;
          pointer-events: none;
          animation: v8BoatDrift 80s linear infinite;
          z-index: 5;
        }
        @keyframes v8BoatDrift {
          from { transform: translateX(0); }
          to   { transform: translateX(-30%); }
        }
        .v8-boat {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          padding: 3px 9px 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          color: ${tk.textSub};
          background: linear-gradient(180deg, ${tk.foxfire}1a 0%, transparent 100%);
          border-bottom: 2px solid ${tk.gold}88;
          border-radius: 50% 50% 4px 4px / 80% 80% 4px 4px;
          opacity: 0.75;
          white-space: nowrap;
          text-shadow: 0 1px 3px rgba(0,0,0,0.9);
          max-width: 280px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .v8-boat-glyph {
          font-family: 'Noto Serif JP', serif;
          font-size: 13px;
          color: ${tk.foxfire};
          opacity: 0.9;
        }

        /* Top eyebrow: "Pond" hero */
        .v8-hero {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 14;
          text-align: center;
          pointer-events: none;
        }
        .v8-hero-kanji {
          font-family: 'Noto Serif JP', serif;
          font-size: 38px;
          font-weight: 700;
          color: ${tk.foxfire};
          letter-spacing: 0.10em;
          text-shadow: 0 0 16px ${tk.foxfireGlow}, 0 2px 6px rgba(0,0,0,0.9);
          margin-bottom: 2px;
        }
        .v8-hero-sub {
          font-family: 'Noto Serif JP', serif;
          font-size: 13px;
          font-weight: 500;
          color: ${tk.textSub};
          letter-spacing: 0.20em;
          text-transform: uppercase;
          text-shadow: 0 1px 4px rgba(0,0,0,0.9);
        }
        .v8-hero-meta {
          margin-top: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${tk.eyebrow};
          opacity: 0.9;
          text-shadow: 0 1px 4px rgba(0,0,0,0.9);
        }

        /* Section eyebrow over the lanterns */
        .v8-section-tag {
          position: absolute;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: ${tk.eyebrow};
          opacity: 0.65;
          text-shadow: 0 1px 4px rgba(0,0,0,0.9);
          pointer-events: none;
          z-index: 13;
        }

        @media (prefers-reduced-motion: reduce) {
          .v8-lantern, .v8-boat-strip, .v8-ripple, .v8-ripple-glyph,
          .v8-reflection, .v8-surface-line, .v8-inscription { animation: none !important; }
        }
      `}</style>

      {/* ── Pond scene ── */}
      <div className="v8-pond">
        <div className="v8-den-frame" aria-hidden />
        <div className="v8-vignette" aria-hidden />

        {/* Hero */}
        <div className="v8-hero">
          <div className="v8-hero-kanji">池</div>
          <div className="v8-hero-sub">Kitsu · The Still Pond</div>
          <div className="v8-hero-meta">
            {tk.eyebrowLabel} · conservative
          </div>
        </div>

        {/* The reflection at center */}
        <div className="v8-reflection" data-state={marvis.state} aria-label="Kitsu's reflection">
          🦊
        </div>

        {/* Active state pill: small, floats at top-right */}
        <div
          style={{
            position: "absolute",
            top: 28,
            right: 28,
            zIndex: 16,
          }}
        >
          <StatePill state={marvis.state} />
        </div>

        {/* Ripples per tool call */}
        {ripples.map((r) => (
          <div key={r.id}>
            <div className="v8-ripple" />
            <div className="v8-ripple-glyph" title={r.tool}>{r.glyph}</div>
          </div>
        ))}

        {/* Lanterns positioned at four corners around the reflection */}
        <span
          className="v8-section-tag"
          style={{ top: 180, left: "calc(50% - 280px)" }}
          aria-hidden
        >
          02 // SOUL · 心
        </span>
        {LANTERNS.map((l, i) => {
          const isActive = activeSoul === l.key;
          const isOpen = openLantern === l.key;
          // Place at four diagonals 240px from center.
          const rad = (l.angle * Math.PI) / 180;
          const x = `calc(50% + ${Math.round(Math.cos(rad) * 240)}px - 39px)`;
          const y = `calc(50% + ${Math.round(Math.sin(rad) * 200)}px - 32px)`;
          return (
            <div
              key={l.key}
              style={{
                position: "absolute",
                left: x,
                top: y,
                zIndex: 18,
                animationDelay: `${i * 0.6}s`,
              }}
            >
              <span className="v8-lantern-string" aria-hidden />
              <button
                className="v8-lantern"
                data-active={isActive ? "true" : "false"}
                data-open={isOpen ? "true" : "false"}
                onClick={() => setOpenLantern(isOpen ? null : l.key)}
                style={{ animationDelay: `${i * 0.6}s` }}
                aria-label={`Open ${l.label}`}
              >
                <span className="v8-lantern-glyph">{l.glyph}</span>
                <span className="v8-lantern-label">{l.label}</span>
              </button>

              {isOpen && (
                <div
                  className="v8-inscription"
                  role="dialog"
                  aria-label={`${l.label} inscription`}
                  style={{
                    // Float the inscription on the side away from center.
                    left: l.angle > -90 && l.angle < 90 ? "calc(100% + 14px)" : "auto",
                    right: !(l.angle > -90 && l.angle < 90) ? "calc(100% + 14px)" : "auto",
                    top: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                      paddingBottom: 8,
                      borderBottom: `1px solid ${tk.divider}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Noto Serif JP', serif",
                        fontSize: 20,
                        color: tk.foxfire,
                      }}
                    >
                      {l.glyph}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Noto Serif JP', serif",
                        fontSize: 14,
                        letterSpacing: "0.10em",
                        color: tk.textPrimary,
                      }}
                    >
                      {l.label}
                    </span>
                    <span style={{ flex: 1 }} />
                    <button
                      onClick={() => setOpenLantern(null)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${tk.divider}`,
                        color: tk.textMuted,
                        borderRadius: 6,
                        padding: "2px 8px",
                        cursor: "pointer",
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 12,
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", color: tk.textSub }}>
                    {soul.loading
                      ? "…"
                      : (soul.files?.[l.key] || "(empty)")
                          .split("\n")
                          .slice(0, 14)
                          .join("\n")}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Floating chat lines on the surface */}
        <div
          aria-label="conversation surface"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11 }}
        >
          {surfaceTurns.map((t, i) => {
            // Stack them vertically from the bottom (most recent lowest).
            const offset = (surfaceTurns.length - 1 - i) * 76;
            return (
              <div
                key={`${i}-${t.text.slice(0, 12)}`}
                className="v8-surface-line"
                data-role={t.role}
                style={{
                  bottom: 200 + offset,
                  pointerEvents: "auto",
                }}
              >
                {t.text}
              </div>
            );
          })}
          {marvis.state === "thinking" && marvis.reply && (
            <div
              className="v8-surface-line"
              data-role="assistant"
              style={{ bottom: 160, opacity: 0.85, pointerEvents: "auto" }}
            >
              {marvis.reply}
            </div>
          )}
          {marvis.state === "thinking" && marvis.activeTool && !marvis.reply && (
            <div
              className="v8-surface-line"
              data-role="assistant"
              style={{
                bottom: 160,
                opacity: 0.7,
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
                letterSpacing: "0.06em",
                pointerEvents: "auto",
              }}
            >
              {rippleGlyph(marvis.activeTool)}  {marvis.activeTool}
            </div>
          )}
          {marvis.state === "listening" && (
            <div
              className="v8-surface-line"
              data-role="user"
              style={{ bottom: 160, opacity: 0.85, pointerEvents: "auto" }}
            >
              {marvis.transcript || "listening…"}
            </div>
          )}
        </div>

        {/* Paper boats at the bottom edge */}
        <div className="v8-boat-strip" aria-label="recent decisions drifting">
          {[...boats, ...boats].map((line, i) => (
            <span key={i} className="v8-boat">
              <span className="v8-boat-glyph" aria-hidden>歴</span>
              {line.length > 64 ? line.slice(0, 64) + "…" : line}
            </span>
          ))}
          {boats.length === 0 && (
            <span className="v8-boat">
              <span className="v8-boat-glyph" aria-hidden>歴</span>
              the pond is quiet
            </span>
          )}
        </div>

        {/* The pier (composer) */}
        <div className="v8-pier">
          <div className="v8-pier-plank" aria-hidden />
          <div className="v8-composer-wrap">
            <ChatComposer
              marvis={marvis}
              placeholder="whisper to the water…"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
