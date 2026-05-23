"use client";

/**
 * KitsuV7Marginalia — A VERTICAL KAKEMONO SCROLL.
 *
 * Structural metaphor: a scholar's annotated manuscript / emaki scroll.
 * The conversation breathes in the center column (V3's calm: 760px max,
 * generous bubbles, parchment-tinted page). The soul stack lives painted
 * into the LEFT margin as four illuminated kanji (魂 心 人 記). When Kitsu
 * draws on a soul facet, that kanji pulses with foxfire. Tap any kanji to
 * unfurl a quiet marginal footnote beside the chat.
 *
 * Tool activity paints itself into the RIGHT margin as a single
 * calligraphic brushstroke that appears the moment a tool fires, then
 * drifts down into a vertical decision log brushed along the bottom.
 *
 * What V1 through V6 missed: V1 wrapped runes in a busy circle around the
 * fox; V2 and V5 bolted on sidebars; V3 hid the soul in a drawer; V4 and
 * V6 reshuffled the same components. None painted the soul into the
 * negative space around the chat. None treated the page itself as the
 * surface of meaning. V7 does. Always-visible transparency without rails.
 * Calm because nothing is loud. Transparent because nothing is hidden.
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
import {
  KITSU_C,
  Transcript,
  ChatComposer,
  StatePill,
  useSoul,
  type SoulKey,
} from "./KitsuShared";

// ── Tool ↔ Soul mapping ────────────────────────────────────────────────
// When Kitsu fires one of these tools, the matching kanji in the left
// margin glows. Reads from the world don't touch the soul, so most tools
// only paint the right margin.
const TOOL_TO_SOUL: Record<string, SoulKey> = {
  remember: "MEMORY",
  update_user: "USER",
  update_soul: "SOUL",
};

const KANJI: Array<{ key: SoulKey; glyph: string; label: string }> = [
  { key: "IDENTITY", glyph: "魂", label: "Identity" },
  { key: "SOUL", glyph: "心", label: "Soul" },
  { key: "USER", glyph: "人", label: "User" },
  { key: "MEMORY", glyph: "記", label: "Memory" },
];

interface BrushEvent {
  id: number;
  tool: string;
  ts: number;
}

export function KitsuV7Marginalia() {
  const marvis = useMarvis();
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const soul = useSoul();
  const [openKanji, setOpenKanji] = useState<SoulKey | null>(null);
  const [brushes, setBrushes] = useState<BrushEvent[]>([]);
  const lastToolRef = useRef<string | null>(null);
  const brushIdRef = useRef(0);

  // Every distinct tool fire registers as a new calligraphic brushstroke.
  useEffect(() => {
    if (marvis.activeTool && marvis.activeTool !== lastToolRef.current) {
      lastToolRef.current = marvis.activeTool;
      brushIdRef.current += 1;
      const ev: BrushEvent = {
        id: brushIdRef.current,
        tool: marvis.activeTool,
        ts: Date.now(),
      };
      setBrushes((cur) => [ev, ...cur].slice(0, 6));
    } else if (!marvis.activeTool) {
      lastToolRef.current = null;
    }
  }, [marvis.activeTool]);

  // Which soul facet (if any) is being touched right now.
  const activeSoul = useMemo<SoulKey | null>(() => {
    if (!marvis.activeTool) return null;
    return TOOL_TO_SOUL[marvis.activeTool] ?? null;
  }, [marvis.activeTool]);

  // Decision log tail: most recent first, brushed down the right margin.
  const logTail = useMemo(() => {
    const raw = soul.files?.["decision-log"] ?? "";
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(-8)
      .reverse();
  }, [soul.files]);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "calc(100dvh - 56px)",
        color: KITSU_C.cream,
        // Painted den behind a parchment-tinted scrim. The scroll reads as
        // foreground, the den breathes through. iOS-safe: no oklab, no
        // backdrop-filter, hardcoded rgba.
        background: `
          radial-gradient(circle at 50% 18%, rgba(239,230,212,0.06) 0%, rgba(20,17,13,0) 55%),
          linear-gradient(180deg, rgba(20,17,13,0.90) 0%, rgba(20,17,13,0.98) 100%),
          url('/kitsu/den-${phase}.webp')
        `,
        backgroundColor: KITSU_C.ink,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        fontFamily: "var(--body), system-ui, sans-serif",
        overflowX: "clip",
      }}
    >
      <style>{`
        .v7-shell {
          display: grid;
          grid-template-columns: 56px 1fr 56px;
          column-gap: 0;
          max-width: 1100px;
          margin: 0 auto;
          min-height: calc(100dvh - 56px);
          position: relative;
        }
        @media (min-width: 720px) {
          .v7-shell {
            grid-template-columns: 92px 1fr 92px;
          }
        }

        .v7-margin {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 12px 0;
          min-height: 0;
        }
        .v7-margin-left {
          align-items: center;
          justify-content: flex-start;
          gap: 22px;
          border-right: 1px solid rgba(214,163,103,0.10);
        }
        .v7-margin-right {
          align-items: center;
          justify-content: space-between;
          border-left: 1px solid rgba(214,163,103,0.10);
        }
        @media (min-width: 720px) {
          .v7-margin { padding: 18px 0; }
          .v7-margin-left { gap: 28px; }
        }

        .v7-center {
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          height: calc(100dvh - 56px);
          background:
            linear-gradient(180deg,
              rgba(239,230,212,0.030) 0%,
              rgba(239,230,212,0.050) 60%,
              rgba(239,230,212,0.020) 100%),
            radial-gradient(circle at 50% 0%,
              rgba(214,163,103,0.10),
              rgba(0,0,0,0) 38%);
          box-shadow:
            inset 1px 0 0 rgba(214,163,103,0.16),
            inset -1px 0 0 rgba(214,163,103,0.16);
        }

        .v7-kanji {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: Georgia, serif;
          font-size: 22px;
          color: rgba(214,163,103,0.62);
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          touch-action: manipulation;
          transition: color 220ms ease, text-shadow 220ms ease, transform 220ms ease;
        }
        .v7-kanji:hover, .v7-kanji:focus-visible {
          color: rgba(251,232,200,0.95);
        }
        .v7-kanji[data-active="true"] {
          color: rgba(251,232,200,1);
          text-shadow: 0 0 14px rgba(214,163,103,0.70);
          transform: scale(1.06);
        }
        .v7-kanji[data-open="true"] {
          color: ${KITSU_C.amber};
          border-color: rgba(214,163,103,0.32);
          background: rgba(214,163,103,0.10);
        }

        .v7-kanji-glow { animation: v7KanjiGlow 1.4s ease-in-out; }
        @keyframes v7KanjiGlow {
          0%   { text-shadow: 0 0 0 rgba(214,163,103,0); }
          40%  { text-shadow: 0 0 18px rgba(214,163,103,0.85); color: rgba(251,232,200,1); }
          100% { text-shadow: 0 0 0 rgba(214,163,103,0); }
        }

        .v7-kanji-label {
          font-family: ui-monospace, monospace;
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${KITSU_C.dim};
          opacity: 0.55;
          margin-top: 4px;
          text-align: center;
          max-width: 56px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .v7-footnote {
          position: absolute;
          left: calc(100% + 4px);
          top: 0;
          width: min(280px, 70vw);
          max-height: 240px;
          overflow-y: auto;
          background: rgba(20,17,13,0.97);
          border: 1px solid rgba(214,163,103,0.32);
          border-radius: 10px;
          padding: 12px 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.55);
          z-index: 8;
          animation: v7Footnote 220ms cubic-bezier(.22,1,.36,1);
        }
        @keyframes v7Footnote {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: none; }
        }

        .v7-brush {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: ${KITSU_C.amber};
          font-family: Georgia, serif;
          font-size: 22px;
          line-height: 1;
          animation: v7Brush 1.6s ease-out;
        }
        @keyframes v7Brush {
          0%   { opacity: 0; transform: scale(0.4) rotate(-12deg); filter: blur(2px); }
          25%  { opacity: 1; transform: scale(1.15) rotate(0deg);  filter: blur(0);
                 text-shadow: 0 0 22px rgba(214,163,103,0.95); }
          100% { opacity: 0.85; transform: scale(1) rotate(0);
                 text-shadow: 0 0 8px rgba(214,163,103,0.40); }
        }

        .v7-foxfire {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(214,163,103,0.55);
          box-shadow: 0 0 8px rgba(214,163,103,0.60);
          pointer-events: none;
          animation: v7FoxfireRise 6s linear infinite;
          opacity: 0;
        }
        @keyframes v7FoxfireRise {
          0%   { transform: translateY(0); opacity: 0; }
          10%  { opacity: 0.55; }
          90%  { opacity: 0.55; }
          100% { transform: translateY(-220px); opacity: 0; }
        }

        .v7-header-seal {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid rgba(214,163,103,0.45);
          background:
            radial-gradient(circle at 30% 30%,
              rgba(214,163,103,0.45),
              rgba(20,17,13,0) 65%),
            rgba(20,17,13,0.60);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          filter: drop-shadow(0 0 8px rgba(214,163,103,0.45));
          flex-shrink: 0;
        }
        .v7-header-seal[data-state="speaking"]  { animation: v7SealPulse 1.6s ease-in-out infinite; }
        .v7-header-seal[data-state="listening"] { box-shadow: 0 0 0 2px rgba(124,154,110,0.50); }
        .v7-header-seal[data-state="thinking"]  { box-shadow: 0 0 0 2px rgba(214,163,103,0.55); }
        @keyframes v7SealPulse {
          0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 8px rgba(214,163,103,0.45)); }
          50%      { transform: scale(1.06); filter: drop-shadow(0 0 14px rgba(214,163,103,0.75)); }
        }

        .v7-composer-dowel {
          height: 6px;
          background: linear-gradient(180deg,
            rgba(214,163,103,0.38) 0%,
            rgba(94,68,38,0.65) 100%);
          flex-shrink: 0;
        }

        .v7-log-line {
          font-family: ui-monospace, monospace;
          font-size: 9px;
          letter-spacing: 0.02em;
          color: rgba(239,230,212,0.62);
          writing-mode: vertical-rl;
          text-orientation: mixed;
          max-height: 110px;
          overflow: hidden;
          white-space: nowrap;
          line-height: 1.2;
        }

        @media (prefers-reduced-motion: reduce) {
          .v7-foxfire,
          .v7-kanji-glow,
          .v7-footnote,
          .v7-brush,
          .v7-header-seal { animation: none !important; transition: none !important; }
          .v7-foxfire { opacity: 0.25; }
        }
      `}</style>

      <div className="v7-shell">
        {/* ── LEFT MARGIN: illuminated kanji + slide-out footnotes ─────── */}
        <aside className="v7-margin v7-margin-left" aria-label="Soul stack">
          <FoxfireParticles seed={1} />

          {KANJI.map(({ key, glyph, label }) => {
            const isActive = activeSoul === key;
            const isOpen = openKanji === key;
            return (
              <div
                key={key}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <button
                  className={`v7-kanji ${isActive ? "v7-kanji-glow" : ""}`}
                  data-active={isActive ? "true" : "false"}
                  data-open={isOpen ? "true" : "false"}
                  onClick={() => setOpenKanji(isOpen ? null : key)}
                  aria-label={`Open ${label}`}
                  aria-expanded={isOpen}
                  title={label}
                >
                  {glyph}
                </button>
                <div className="v7-kanji-label" aria-hidden>
                  {label}
                </div>

                {isOpen && (
                  <div
                    className="v7-footnote"
                    role="dialog"
                    aria-label={`${label} footnote`}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Georgia, serif",
                          color: KITSU_C.amber,
                          fontSize: 16,
                        }}
                      >
                        {glyph}
                      </span>
                      <span
                        style={{
                          fontFamily: "ui-monospace, monospace",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: KITSU_C.cream,
                        }}
                      >
                        {label}
                      </span>
                      <span style={{ flex: 1 }} />
                      <button
                        onClick={() => setOpenKanji(null)}
                        style={closeBtn}
                        aria-label="Close footnote"
                      >
                        ×
                      </button>
                    </div>
                    <div
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 11,
                        color: KITSU_C.cream,
                        opacity: 0.85,
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {soul.loading
                        ? "…"
                        : (soul.files?.[key] || "(empty)")
                            .split("\n")
                            .slice(0, 14)
                            .join("\n")}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        {/* ── CENTER: painted header + transcript page + composer ───── */}
        <main className="v7-center">
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderBottom: "1px solid rgba(214,163,103,0.18)",
              flexShrink: 0,
            }}
          >
            <span
              className="v7-header-seal"
              data-state={marvis.state}
              aria-hidden
            >
              🦊
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                lineHeight: 1.1,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 18,
                  letterSpacing: "0.06em",
                  color: KITSU_C.cream,
                }}
              >
                Kitsu
              </span>
              <span
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: KITSU_C.dim,
                  opacity: 0.65,
                }}
              >
                marginalia · {phase}
              </span>
            </div>
            <span style={{ flex: 1 }} />
            <AutonomyBadge mode="conservative" />
            <StatePill state={marvis.state} />
          </header>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              maxWidth: 760,
              width: "100%",
              alignSelf: "center",
            }}
          >
            <Transcript
              marvis={marvis}
              bubbleSize="lg"
              emptyHint="A scroll. Type or hold the mic to begin a marginal note."
            />
            <div className="v7-composer-dowel" aria-hidden />
            <ChatComposer marvis={marvis} placeholder="write Kitsu a line…" />
          </div>
        </main>

        {/* ── RIGHT MARGIN: live brushstrokes + brushed decision log ── */}
        <aside
          className="v7-margin v7-margin-right"
          aria-label="Tool activity and decision log"
        >
          <FoxfireParticles seed={2} />

          {/* TOP: most recent tool fires as calligraphic glyphs */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              minHeight: 64,
              paddingTop: 6,
              width: "100%",
            }}
            aria-live="polite"
          >
            {brushes.slice(0, 3).map((b, i) => (
              <div
                key={b.id}
                style={{
                  opacity: 1 - i * 0.28,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <span
                  className="v7-brush"
                  title={b.tool}
                  aria-label={b.tool}
                >
                  {brushGlyph(b.tool)}
                </span>
                <span
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 8,
                    letterSpacing: "0.04em",
                    color: KITSU_C.dim,
                    opacity: 0.7,
                    marginTop: -2,
                    maxWidth: 60,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.tool}
                </span>
              </div>
            ))}
            {brushes.length === 0 && (
              <span
                aria-hidden
                style={{
                  color: KITSU_C.dim,
                  opacity: 0.32,
                  fontSize: 18,
                  fontFamily: "Georgia, serif",
                }}
              >
                ◇
              </span>
            )}
          </div>

          {/* BOTTOM: decision log brushed vertically downward */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              paddingBottom: 16,
              paddingTop: 12,
              borderTop: "1px solid rgba(214,163,103,0.10)",
              width: "100%",
              maxHeight: "55%",
              overflow: "hidden",
            }}
            aria-label="Recent decisions"
          >
            <div
              style={{
                fontFamily: "Georgia, serif",
                color: KITSU_C.dim,
                opacity: 0.50,
                fontSize: 14,
                marginBottom: 4,
              }}
              aria-hidden
              title="decision log"
            >
              歴
            </div>
            {logTail.length === 0 && (
              <div
                style={{
                  color: KITSU_C.dim,
                  opacity: 0.4,
                  fontSize: 9,
                  writingMode: "vertical-rl",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                no decisions yet
              </div>
            )}
            {logTail.map((line, i) => (
              <div key={i} className="v7-log-line" title={line}>
                {line.length > 36 ? line.slice(0, 36) + "…" : line}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * One glyph per tool family. Reads are diamonds. Acts on world are
 * stars/triangles. Soul writes get their kanji directly.
 */
function brushGlyph(tool: string): string {
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

/**
 * Four deterministic foxfire particles drift up each margin. Particle
 * positions are seeded so they don't reshuffle on every render and don't
 * cluster (the seed offsets the column).
 */
function FoxfireParticles({ seed }: { seed: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        x: ((seed * 31 + i * 17) % 80) + 8,
        delay: ((seed * 7 + i * 11) % 60) / 10,
        duration: 5 + (i % 3),
        bottom: 20 + i * 80,
      })),
    [seed],
  );
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="v7-foxfire"
          style={{
            left: `${p.x}%`,
            bottom: `${p.bottom}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function AutonomyBadge({ mode }: { mode: string }) {
  return (
    <span
      style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: KITSU_C.emerald,
        border: `1px solid ${KITSU_C.emerald}`,
        borderRadius: 999,
        padding: "2px 8px",
        opacity: 0.78,
      }}
      title="Autonomy"
    >
      {mode}
    </span>
  );
}

const closeBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(214,163,103,0.32)",
  color: KITSU_C.dim,
  borderRadius: 6,
  padding: "2px 7px",
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
  cursor: "pointer",
  minHeight: 26,
  lineHeight: 1,
};
