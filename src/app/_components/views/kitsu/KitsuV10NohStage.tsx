"use client";

/**
 * KitsuV10NohStage — THE FALSIFIER.
 *
 * The Kitsu tab as a Noh stage. The painted Ghibli den is gone. So is the
 * dark dashboard chrome. The room is a brushed washi-cream proscenium with
 * one ink-stroke horizon, a wooden boards floor, and Kitsu — drawn here as
 * a sumi-e fox in calligraphic ink — seated downstage center, alone in
 * negative space.
 *
 * This variant falsifies the assumption that "Kitsu's room must be a
 * richly painted Ghibli interior." Here she IS the composition. Everything
 * else is sumi-e marginalia in the negative space around her.
 *
 * - SOUL: written in faint sumi-e brushwork on the back wall as four
 *   vertical kanji columns (魂 心 人 記). You find them by looking. Tap
 *   a column to lift it forward as a vellum scroll for closer reading.
 * - CHAT: floating dialogue cards (opera supertitles) drift IN from above
 *   her head and fade down after they're spoken. No bubbles, no avatars.
 *   The fox doesn't have a chat thread; she has dialogue.
 * - TOOLS: a single calligraphic ink glyph falls from the rafters,
 *   pirouettes, lands at her paw, and dissolves. The most recent glyph
 *   leaves a faint trace on the boards.
 * - DECISIONS: etched into the wooden stage floor as faint vertical
 *   columns of dim sumi-e text. You have to lean in.
 * - STATE: the fox's ink itself reports state. Idle = settled brush.
 *   Listening = the brushwork on her ear sharpens. Thinking = an extra
 *   tail flicker appears. Speaking = a soft breath plume rises from her
 *   mouth.
 * - COMPOSER: bottom-edge, framed as a sumi-e brushstroke prompt with
 *   a single ink line ("一") underlining the input field.
 *
 * Type-driven. Mostly negative space. Performance > information density.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useMarvis } from "../cockpit/useMarvis";
import { useMode } from "../../ModeProvider";
import { phaseForMode } from "../../bento/emakiContext";
import { PHASES } from "../../emaki/theme";
import {
  ChatComposer,
  useSoul,
  type SoulKey,
} from "./KitsuShared";

const PILLARS: Array<{ key: SoulKey; glyph: string; label: string }> = [
  { key: "IDENTITY", glyph: "魂", label: "Identity" },
  { key: "SOUL",     glyph: "心", label: "Soul" },
  { key: "USER",     glyph: "人", label: "User" },
  { key: "MEMORY",   glyph: "記", label: "Memory" },
];

function toolKanji(tool: string): string {
  // Single calligraphic ink glyph that falls from the rafters.
  if (tool.startsWith("read_")) return "見";       // see
  if (tool === "monitor_fleet") return "観";       // observe
  if (tool.startsWith("control_")) return "操";    // operate
  if (tool.startsWith("propose_")) return "案";    // proposal
  if (tool.startsWith("add_")) return "加";        // add
  if (tool.startsWith("launch_")) return "発";     // depart/launch
  if (tool.startsWith("kill_")) return "終";       // end
  if (tool === "remember") return "記";            // remember
  if (tool === "update_user") return "人";         // user
  if (tool === "update_soul") return "心";         // soul
  if (tool === "complete_habit") return "了";      // complete
  return "事"; // matter / thing
}

interface FallingGlyph {
  id: number;
  glyph: string;
  tool: string;
  startedAt: number;
}

interface Supertitle {
  id: number;
  role: "user" | "assistant";
  text: string;
  startedAt: number;
}

export function KitsuV10NohStage() {
  const marvis = useMarvis();
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const tk = PHASES[phase];
  const soul = useSoul();

  const [openPillar, setOpenPillar] = useState<SoulKey | null>(null);
  const [glyphs, setGlyphs] = useState<FallingGlyph[]>([]);
  const [traces, setTraces] = useState<string[]>([]); // last 3 glyphs etched into the boards
  const [supertitles, setSupertitles] = useState<Supertitle[]>([]);

  const lastToolRef = useRef<string | null>(null);
  const glyphIdRef = useRef(0);
  const lastTurnLenRef = useRef(0);
  const supertitleIdRef = useRef(0);

  // Drop a glyph from the rafters when a new tool fires.
  useEffect(() => {
    if (marvis.activeTool && marvis.activeTool !== lastToolRef.current) {
      lastToolRef.current = marvis.activeTool;
      glyphIdRef.current += 1;
      const g = toolKanji(marvis.activeTool);
      const ev: FallingGlyph = {
        id: glyphIdRef.current,
        glyph: g,
        tool: marvis.activeTool,
        startedAt: Date.now(),
      };
      setGlyphs((cur) => [ev, ...cur].slice(0, 4));
      // After ~3s the glyph dissolves; we move it into the traces row.
      setTimeout(() => {
        setTraces((cur) => [g, ...cur].slice(0, 5));
        setGlyphs((cur) => cur.filter((x) => x.id !== ev.id));
      }, 3200);
    } else if (!marvis.activeTool) {
      lastToolRef.current = null;
    }
  }, [marvis.activeTool]);

  // New chat turns become supertitles that drift in over the fox's head.
  useEffect(() => {
    const len = marvis.turns.length;
    if (len > lastTurnLenRef.current) {
      const fresh = marvis.turns.slice(lastTurnLenRef.current).map((t) => {
        supertitleIdRef.current += 1;
        return {
          id: supertitleIdRef.current,
          role: t.role,
          text: t.text,
          startedAt: Date.now(),
        } as Supertitle;
      });
      setSupertitles((cur) => [...fresh, ...cur].slice(0, 5));
      lastTurnLenRef.current = len;
    }
  }, [marvis.turns]);

  // Decision-log → etched into the wooden boards.
  const etchings = useMemo(() => {
    const raw = soul.files?.["decision-log"] ?? "";
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(-6)
      .reverse();
  }, [soul.files]);

  // Cream backdrop shifts a hair with phase but the stage stays austere.
  const cream =
    phase === "day"
      ? "#f3ead4"
      : phase === "twilight"
        ? "#ecdfd9"
        : "#e6d8b6";
  const ink =
    phase === "day" ? "#1a1108" : phase === "twilight" ? "#1c1018" : "#180f04";
  const inkSoft =
    phase === "day" ? "#5a4216" : phase === "twilight" ? "#52344e" : "#5e4612";
  const goldRule = tk.gold;
  const accent =
    phase === "day" ? "#7a4a08" : phase === "twilight" ? "#8a5a78" : "#a87018";

  return (
    <div
      style={{
        position: "relative",
        minHeight: "calc(100dvh - 56px)",
        background: cream,
        color: ink,
        fontFamily: "'Noto Serif JP', 'DM Sans', serif",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;700&family=DM+Sans:wght@400;500;600&display=swap');

        .v10-stage {
          position: relative;
          width: 100%;
          height: calc(100dvh - 56px);
          display: flex;
          flex-direction: column;
        }

        /* Back wall (sumi-e washi). The horizon is one ink stroke. */
        .v10-wall {
          position: absolute;
          inset: 0 0 200px 0;
          background:
            linear-gradient(180deg, ${cream} 0%, ${cream} 75%, ${cream}fa 100%),
            radial-gradient(circle at 50% 30%, ${accent}11 0%, transparent 60%);
          pointer-events: none;
        }
        .v10-horizon {
          position: absolute;
          top: 58%;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg,
            transparent 0%, ${ink}aa 6%, ${ink} 50%, ${ink}aa 94%, transparent 100%);
          clip-path: polygon(0% 50%, 2% 0%, 5% 100%, 9% 30%, 14% 70%, 19% 20%, 24% 80%, 29% 25%, 35% 70%, 41% 20%, 47% 75%, 54% 30%, 60% 70%, 66% 20%, 72% 75%, 78% 30%, 84% 70%, 90% 20%, 95% 100%, 98% 0%, 100% 50%);
          opacity: 0.4;
          filter: blur(0.5px);
        }

        /* Wooden floor downstage (the bottom 200px) */
        .v10-floor {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 88px;
          height: 200px;
          background:
            repeating-linear-gradient(180deg,
              ${accent}1a 0px,  ${accent}1a 38px,
              ${accent}26 39px, ${accent}26 40px),
            linear-gradient(180deg, ${accent}10 0%, ${accent}1d 100%);
          border-top: 1px solid ${ink}33;
          pointer-events: none;
        }

        /* Title at the top: Noh title card */
        .v10-titlecard {
          position: relative;
          z-index: 5;
          padding: 24px 32px 14px;
          display: flex;
          align-items: baseline;
          gap: 16px;
          flex-shrink: 0;
        }
        .v10-title-kanji {
          font-family: 'Noto Serif JP', serif;
          font-weight: 700;
          font-size: clamp(38px, 4vw, 56px);
          line-height: 1;
          color: ${ink};
          letter-spacing: 0.08em;
        }
        .v10-title-stack { display: flex; flex-direction: column; gap: 2px; }
        .v10-title-en {
          font-family: 'Noto Serif JP', serif;
          font-size: 18px;
          font-weight: 500;
          color: ${ink};
          letter-spacing: 0.06em;
        }
        .v10-title-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 0.20em;
          text-transform: uppercase;
          color: ${inkSoft};
        }
        .v10-act-badge {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${accent};
          border: 1px solid ${accent}88;
          border-radius: 999px;
          padding: 3px 10px;
          background: transparent;
        }

        /* Four sumi-e soul pillars on the back wall */
        .v10-pillars {
          position: absolute;
          inset: 110px 8% auto 8%;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          z-index: 4;
          pointer-events: none;
        }
        .v10-pillar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          width: 56px;
          cursor: pointer;
          padding: 0;
          background: transparent;
          border: none;
          font-family: inherit;
          color: inherit;
          pointer-events: auto;
          touch-action: manipulation;
        }
        .v10-pillar-col {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-family: 'Noto Serif JP', serif;
          font-size: 30px;
          font-weight: 700;
          color: ${ink};
          opacity: 0.20;
          letter-spacing: 0.10em;
          padding: 4px 8px;
          border-radius: 3px;
          transition: opacity 300ms ease, background 300ms ease;
        }
        .v10-pillar:hover .v10-pillar-col,
        .v10-pillar:focus-visible .v10-pillar-col {
          opacity: 0.60;
          background: ${accent}11;
        }
        .v10-pillar[data-open="true"] .v10-pillar-col {
          opacity: 0.85;
          background: ${accent}22;
        }
        .v10-pillar-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${inkSoft};
          opacity: 0.6;
        }

        /* Pillar scroll: when one is open, a vellum hangs forward */
        .v10-pillar-scroll {
          position: absolute;
          top: 100px;
          left: 50%;
          transform: translateX(-50%);
          width: min(420px, 80vw);
          max-height: 260px;
          overflow-y: auto;
          background: ${cream};
          border: 1px solid ${ink}55;
          border-radius: 4px;
          padding: 16px 20px 18px;
          color: ${ink};
          font-family: 'Noto Serif JP', serif;
          font-size: 14px;
          line-height: 1.7;
          box-shadow: 0 8px 28px rgba(0,0,0,0.18);
          z-index: 10;
          animation: v10ScrollDown 260ms cubic-bezier(.22,1,.36,1);
        }
        @keyframes v10ScrollDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* The fox: downstage center as a sumi-e illustration */
        .v10-fox {
          position: absolute;
          left: 50%;
          bottom: 200px;
          transform: translateX(-50%);
          z-index: 6;
          width: 220px;
          height: 220px;
          color: ${ink};
          transition: transform 600ms ease;
        }
        .v10-fox[data-state="listening"] { transform: translateX(-50%) translateY(-4px); }
        .v10-fox[data-state="thinking"]  { animation: v10FoxBreathe 4s ease-in-out infinite; }
        .v10-fox[data-state="speaking"]  { animation: v10FoxBreathe 1.6s ease-in-out infinite; }
        @keyframes v10FoxBreathe {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50%      { transform: translateX(-50%) scale(1.018); }
        }
        .v10-breath {
          position: absolute;
          left: 50%;
          bottom: 350px;
          transform: translateX(-50%);
          font-family: 'Noto Serif JP', serif;
          font-size: 14px;
          color: ${accent};
          opacity: 0;
          animation: v10Breath 2s ease-out infinite;
          letter-spacing: 0.20em;
          pointer-events: none;
        }
        @keyframes v10Breath {
          0%   { opacity: 0; transform: translate(-50%, 0) scale(0.8); }
          40%  { opacity: 0.7; }
          100% { opacity: 0; transform: translate(-50%, -30px) scale(1.2); }
        }

        /* Supertitles drift in from above */
        .v10-supertitles {
          position: absolute;
          left: 50%;
          bottom: 440px;
          transform: translateX(-50%);
          width: min(640px, 80vw);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          z-index: 7;
          pointer-events: none;
        }
        .v10-supertitle {
          font-family: 'Noto Serif JP', serif;
          font-size: 18px;
          line-height: 1.45;
          letter-spacing: 0.01em;
          color: ${ink};
          background: ${cream}f0;
          border-bottom: 1px solid ${ink}44;
          padding: 6px 14px 8px;
          max-width: 100%;
          text-align: center;
          animation: v10TitleDrift 7s ease-out forwards;
        }
        .v10-supertitle[data-role="user"] {
          color: ${inkSoft};
          font-style: italic;
          font-weight: 400;
          border-bottom-color: ${inkSoft}55;
        }
        @keyframes v10TitleDrift {
          0%   { opacity: 0; transform: translateY(-12px); }
          12%  { opacity: 1; transform: translateY(0); }
          82%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(36px); }
        }

        /* Falling tool glyphs from the rafters */
        .v10-glyph-rain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 8;
        }
        .v10-glyph {
          position: absolute;
          left: calc(50% + var(--gx, 0px));
          top: 0;
          font-family: 'Noto Serif JP', serif;
          font-weight: 700;
          font-size: 56px;
          color: ${ink};
          opacity: 0.85;
          text-shadow: 0 2px 8px ${cream};
          animation: v10GlyphFall 3.2s cubic-bezier(.55,.12,.62,.95) forwards;
        }
        @keyframes v10GlyphFall {
          0%   { top: -10%; opacity: 0;    transform: translateX(-50%) rotate(-8deg) scale(0.9); }
          20%  { opacity: 0.95; }
          70%  { top: 60%;  opacity: 0.95; transform: translateX(-50%) rotate(6deg)  scale(1); }
          88%  { top: 78%;  opacity: 0.85; transform: translateX(-50%) rotate(-2deg) scale(1.05); }
          100% { top: 80%;  opacity: 0;    transform: translateX(-50%) rotate(0deg)  scale(1.15); filter: blur(2px); }
        }

        /* Faint glyph traces on the boards */
        .v10-traces {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: 110px;
          display: flex;
          gap: 22px;
          z-index: 5;
          pointer-events: none;
        }
        .v10-trace {
          font-family: 'Noto Serif JP', serif;
          font-size: 18px;
          color: ${ink};
          opacity: 0.18;
        }

        /* Etched decision log on the boards (vertical columns) */
        .v10-etchings {
          position: absolute;
          left: 4%;
          bottom: 100px;
          display: flex;
          gap: 18px;
          z-index: 5;
          pointer-events: none;
        }
        .v10-etch {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          color: ${ink};
          opacity: 0.22;
          letter-spacing: 0.04em;
          max-height: 160px;
          overflow: hidden;
          white-space: nowrap;
          line-height: 1.4;
        }

        /* Composer at bottom — austere brush-prompt */
        .v10-composer {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 12;
          background: ${cream};
          border-top: 1px solid ${ink}33;
          padding: 8px 32px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex-shrink: 0;
        }
        .v10-prompt-tag {
          font-family: 'Noto Serif JP', serif;
          font-size: 14px;
          color: ${accent};
          letter-spacing: 0.18em;
        }
        /* Re-skin the imported composer to match Noh palette */
        .v10-composer form {
          background: transparent !important;
          border-top: none !important;
          padding: 0 !important;
        }
        .v10-composer input {
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid ${ink}66 !important;
          border-radius: 0 !important;
          color: ${ink} !important;
          font-family: 'Noto Serif JP', serif !important;
          font-size: 16px !important;
          padding: 6px 0 8px !important;
        }
        .v10-composer input::placeholder { color: ${inkSoft} !important; opacity: 0.7; }
        .v10-composer button {
          background: transparent !important;
          border: 1px solid ${ink}55 !important;
          color: ${ink} !important;
          border-radius: 4px !important;
          min-height: 40px !important;
          min-width: 40px !important;
        }
        .v10-prompt-rule {
          font-family: 'Noto Serif JP', serif;
          font-size: 11px;
          color: ${inkSoft};
          letter-spacing: 0.20em;
          text-transform: uppercase;
          opacity: 0.7;
        }

        @media (prefers-reduced-motion: reduce) {
          .v10-supertitle, .v10-glyph, .v10-fox, .v10-pillar-scroll,
          .v10-breath { animation: none !important; }
        }
      `}</style>

      <div className="v10-stage">
        {/* Title card */}
        <div className="v10-titlecard">
          <span className="v10-title-kanji">舞台</span>
          <div className="v10-title-stack">
            <span className="v10-title-en">Kitsu · The Stage</span>
            <span className="v10-title-sub">
              act i · {phase === "day" ? "morning" : phase === "twilight" ? "dusk" : "evening"} · conservative
            </span>
          </div>
          <span style={{ flex: 1 }} />
          <span className="v10-act-badge">{marvis.state}</span>
        </div>

        {/* Backdrop */}
        <div className="v10-wall" aria-hidden />
        <div className="v10-horizon" aria-hidden />

        {/* Soul pillars on the back wall */}
        <div className="v10-pillars">
          {PILLARS.map((p) => {
            const isOpen = openPillar === p.key;
            return (
              <button
                key={p.key}
                className="v10-pillar"
                data-open={isOpen ? "true" : "false"}
                onClick={() => setOpenPillar(isOpen ? null : p.key)}
                aria-label={`Open ${p.label}`}
              >
                <span className="v10-pillar-col">{p.glyph}</span>
                <span className="v10-pillar-label">{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* If a pillar is open, a sumi-e scroll hangs forward */}
        {openPillar && (
          <div className="v10-pillar-scroll" role="dialog">
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                marginBottom: 8,
                paddingBottom: 8,
                borderBottom: `1px dashed ${inkSoft}66`,
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 700 }}>
                {PILLARS.find((p) => p.key === openPillar)!.glyph}
              </span>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: inkSoft,
                }}
              >
                {PILLARS.find((p) => p.key === openPillar)!.label}
              </span>
              <span style={{ flex: 1 }} />
              <button
                onClick={() => setOpenPillar(null)}
                style={{
                  background: "transparent",
                  border: `1px solid ${inkSoft}66`,
                  color: inkSoft,
                  borderRadius: 4,
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
            <div style={{ whiteSpace: "pre-wrap" }}>
              {soul.loading
                ? "…"
                : (soul.files?.[openPillar] || "(this column has not been brushed yet)")
                    .split("\n")
                    .slice(0, 14)
                    .join("\n")}
            </div>
          </div>
        )}

        {/* Wooden floor */}
        <div className="v10-floor" aria-hidden />

        {/* Etched decisions on the boards */}
        <div className="v10-etchings" aria-label="Etched decisions">
          {etchings.length === 0 && (
            <div className="v10-etch">the boards are unmarked</div>
          )}
          {etchings.map((e, i) => (
            <div key={i} className="v10-etch" title={e}>
              {e.length > 56 ? e.slice(0, 56) + "…" : e}
            </div>
          ))}
        </div>

        {/* Glyph traces */}
        {traces.length > 0 && (
          <div className="v10-traces" aria-hidden>
            {traces.map((g, i) => (
              <span key={i} className="v10-trace" style={{ opacity: 0.18 - i * 0.025 }}>
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Falling glyphs */}
        <div className="v10-glyph-rain" aria-hidden>
          {glyphs.map((g, i) => (
            <span
              key={g.id}
              className="v10-glyph"
              style={
                {
                  "--gx": `${(i - 1) * 80 - 20}px`,
                } as CSSProperties
              }
              title={g.tool}
            >
              {g.glyph}
            </span>
          ))}
        </div>

        {/* The fox — sumi-e drawn in SVG */}
        <div className="v10-fox" data-state={marvis.state} aria-label="Kitsu (sumi-e)">
          <SumieFox ink={ink} accent={accent} state={marvis.state} />
        </div>
        {marvis.state === "speaking" && (
          <span className="v10-breath" aria-hidden>息</span>
        )}

        {/* Supertitles */}
        <div className="v10-supertitles">
          {supertitles.map((s) => (
            <div
              key={s.id}
              className="v10-supertitle"
              data-role={s.role}
            >
              {s.role === "user" ? "「" : ""}{s.text}{s.role === "user" ? "」" : ""}
            </div>
          ))}
          {marvis.state === "thinking" && marvis.reply && (
            <div
              className="v10-supertitle"
              data-role="assistant"
              style={{ opacity: 0.85, animation: "none" }}
            >
              {marvis.reply}
            </div>
          )}
          {marvis.state === "listening" && (
            <div
              className="v10-supertitle"
              data-role="user"
              style={{ opacity: 0.85, animation: "none" }}
            >
              「{marvis.transcript || "..."}」
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="v10-composer">
          <span className="v10-prompt-tag" aria-hidden>一</span>
          <ChatComposer marvis={marvis} placeholder="say a line to the stage…" />
          <span className="v10-prompt-rule" aria-hidden>act of speaking</span>
        </div>
      </div>
    </div>
  );
}

// ── SumieFox: a calligraphic ink fox drawn as SVG ──────────────────────────

interface SumieFoxProps {
  ink: string;
  accent: string;
  state: string;
}

function SumieFox({ ink, accent, state }: SumieFoxProps) {
  // The ear sharpens when listening; an extra tail flicker appears when thinking;
  // breath is rendered by the outer component when speaking.
  return (
    <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <filter id="v10-brush" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" />
        </filter>
      </defs>
      {/* Tail (curling behind) */}
      <path
        d="M 50 150 Q 30 130 35 100 Q 42 75 70 80 Q 88 84 92 110"
        fill="none"
        stroke={ink}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.92}
        filter="url(#v10-brush)"
      />
      {state === "thinking" && (
        <path
          d="M 38 100 Q 24 92 22 78"
          fill="none"
          stroke={ink}
          strokeWidth="3"
          strokeLinecap="round"
          opacity={0.65}
        />
      )}
      {/* Body */}
      <path
        d="M 70 155 Q 85 130 110 128 Q 140 128 158 148 Q 165 162 150 170 Q 110 178 80 174 Q 65 170 70 155 Z"
        fill={ink}
        opacity={0.92}
        filter="url(#v10-brush)"
      />
      {/* Front leg */}
      <path
        d="M 132 168 L 134 188"
        stroke={ink}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Back leg */}
      <path
        d="M 88 168 L 90 188"
        stroke={ink}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Head — perched alert */}
      <path
        d="M 145 130 Q 158 110 172 116 Q 184 122 180 138 Q 175 152 158 152 Q 142 148 145 130 Z"
        fill={ink}
        opacity={0.94}
        filter="url(#v10-brush)"
      />
      {/* Ears */}
      <path
        d={
          state === "listening"
            ? "M 158 108 L 152 86 L 168 100 Z M 174 110 L 180 88 L 184 106 Z"
            : "M 158 110 L 153 92 L 167 102 Z M 174 112 L 180 94 L 184 108 Z"
        }
        fill={ink}
        opacity={0.92}
      />
      {/* Snout + nose */}
      <path
        d="M 180 138 Q 192 138 196 132"
        stroke={ink}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="196" cy="134" r="2.4" fill={ink} />
      {/* Eye — closed crescent when idle, slit open when listening */}
      {state === "listening" ? (
        <path
          d="M 165 130 Q 170 126 175 130"
          stroke={accent}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <path
          d="M 165 132 Q 170 134 175 132"
          stroke={ink}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {/* Foxfire blush near the cheek when speaking */}
      {state === "speaking" && (
        <circle cx="170" cy="142" r="6" fill={accent} opacity={0.32} />
      )}
    </svg>
  );
}
