"use client";

/**
 * KitsuV4CardDeck — HYBRID, PLAYFUL.
 *
 * Hero top: fox + painted den. Below: horizontally-scrolling deck of "facet"
 * cards — Soul · Memory · Tools · Persona · Voice · Decisions. Tap a card to
 * expand into a sheet. Chat lives in a docked bottom drawer (full-tab variant
 * of MarvisCorner). The most explorable variant: each facet is its own surface.
 */

import { useState } from "react";
import { useMarvis } from "../cockpit/useMarvis";
import { CockpitLive2D } from "../cockpit/skins/CockpitLive2D";
import { useMode } from "../../ModeProvider";
import { phaseForMode } from "../../bento/emakiContext";
import { FoxfireLayer } from "../../emaki/materials";
import {
  KITSU_C,
  Transcript,
  ChatComposer,
  StatePill,
  useSoul,
} from "./KitsuShared";

type FacetKey = "soul" | "memory" | "tools" | "persona" | "voice" | "decisions";

const FACETS: { key: FacetKey; label: string; kanji: string; glyph: string }[] = [
  { key: "soul",      label: "Soul",      kanji: "心", glyph: "✦" },
  { key: "memory",    label: "Memory",    kanji: "記", glyph: "◉" },
  { key: "tools",     label: "Tools",     kanji: "具", glyph: "⌬" },
  { key: "persona",   label: "Persona",   kanji: "面", glyph: "❖" },
  { key: "voice",     label: "Voice",     kanji: "声", glyph: "♪" },
  { key: "decisions", label: "Decisions", kanji: "断", glyph: "△" },
];

export function KitsuV4CardDeck() {
  const marvis = useMarvis();
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const soul = useSoul();
  const [openFacet, setOpenFacet] = useState<FacetKey | null>(null);
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "calc(100dvh - 56px)",
        color: KITSU_C.cream,
        background: KITSU_C.ink,
        fontFamily: "var(--body), system-ui, sans-serif",
        paddingBottom: chatOpen ? "min(360px, 50dvh)" : 88,
      }}
    >
      {/* HERO with the fox + painted den */}
      <section
        style={{
          position: "relative",
          height: "32dvh",
          minHeight: 220,
          maxHeight: 360,
          background: `
            linear-gradient(180deg, rgba(20,17,13,0.25) 0%, rgba(20,17,13,0.72) 100%),
            url('/kitsu/den-${phase}.webp')
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: KITSU_C.ink,
          overflow: "hidden",
        }}
      >
        <div aria-hidden style={{ position: "absolute", inset: 0, opacity: 0.45, pointerEvents: "none" }}>
          <FoxfireLayer phase={phase} />
        </div>
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 6,
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        >
          <CockpitLive2D
            state={marvis.state}
            size={210}
            zoom={1.45}
            align="top"
            modelUrl="/live2d/fox/standard_fox.model3.json"
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 18,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 22,
              color: KITSU_C.cream,
              letterSpacing: "0.06em",
              textShadow: "0 1px 12px rgba(0,0,0,.5)",
            }}
          >
            狐 Kitsu
          </span>
          <StatePill state={marvis.state} />
        </div>
      </section>

      {/* DECK: horizontal scrolling card carousel */}
      <section
        aria-label="Facets"
        style={{
          display: "flex",
          gap: 12,
          padding: "16px",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {FACETS.map((f) => (
          <button
            key={f.key}
            onClick={() => setOpenFacet(f.key)}
            style={{
              flexShrink: 0,
              width: "min(60vw, 220px)",
              minHeight: 130,
              scrollSnapAlign: "start",
              background: "linear-gradient(180deg, rgba(60,42,22,0.55) 0%, rgba(20,17,13,0.82) 100%)",
              border: "1px solid rgba(214,163,103,0.32)",
              borderRadius: 14,
              padding: "14px 14px 12px",
              color: KITSU_C.cream,
              textAlign: "left",
              cursor: "pointer",
              touchAction: "manipulation",
              boxShadow: "0 4px 18px rgba(0,0,0,.4), 0 0 18px rgba(214,163,103,.12) inset",
              transition: "transform 200ms ease, border-color 200ms ease",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 22,
                  color: KITSU_C.amber,
                  textShadow: "0 0 12px rgba(214,163,103,.4)",
                }}
              >
                {f.kanji}
              </span>
              <span style={{ color: KITSU_C.amber, fontSize: 16 }}>{f.glyph}</span>
            </div>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 19,
                letterSpacing: "0.06em",
                color: KITSU_C.cream,
              }}
            >
              {f.label}
            </div>
            <div
              style={{
                fontFamily: "ui-monospace,monospace",
                fontSize: "var(--text-2xs)",
                color: KITSU_C.dim,
                opacity: 0.85,
                marginTop: "auto",
              }}
            >
              {facetTeaser(f.key, soul.files)}
            </div>
          </button>
        ))}
      </section>

      {/* Tap-to-expand facet sheet */}
      {openFacet && (
        <FacetSheet facet={openFacet} files={soul.files} onClose={() => setOpenFacet(null)} />
      )}

      {/* BOTTOM-DOCKED CHAT DRAWER */}
      <aside
        aria-label="Chat"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(20,17,13,0.97)",
          borderTop: "1px solid rgba(214,163,103,0.24)",
          boxShadow: "0 -18px 50px rgba(0,0,0,.55)",
          zIndex: 40,
          transition: "transform 280ms cubic-bezier(.22,1,.36,1)",
          transform: chatOpen ? "translateY(0)" : "translateY(calc(100% - 56px))",
          maxHeight: "min(360px, 50dvh)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <button
          onClick={() => setChatOpen(!chatOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid rgba(214,163,103,0.18)",
            color: KITSU_C.cream,
            fontFamily: "ui-monospace,monospace",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
          }}
          aria-expanded={chatOpen}
        >
          <span style={{ color: KITSU_C.amber }}>{chatOpen ? "▾" : "▴"}</span>
          chat
          <span style={{ flex: 1 }} />
          <StatePill state={marvis.state} />
        </button>
        {chatOpen && (
          <>
            <Transcript marvis={marvis} emptyHint="Tap a card above, or just ask." />
            <ChatComposer marvis={marvis} />
          </>
        )}
      </aside>
    </div>
  );
}

function facetTeaser(
  key: FacetKey,
  files: ReturnType<typeof useSoul>["files"],
): string {
  if (!files) return "loading…";
  switch (key) {
    case "soul":      return firstLine(files.SOUL);
    case "memory":    return firstLine(files.MEMORY);
    case "tools":     return "19 in-process tools — read + act.";
    case "persona":   return firstLine(files.IDENTITY);
    case "voice":     return "turbo_v2_5 · stability 0.35 · style 0.40";
    case "decisions": return `${countDecisions(files["decision-log"])} entries`;
  }
}

function firstLine(text: string): string {
  const line = (text || "")
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").replace(/^>+\s*/, "").trim())
    .find((l) => l.length > 0);
  if (!line) return "(empty)";
  return line.length > 60 ? line.slice(0, 57) + "…" : line;
}

function countDecisions(log: string): number {
  return (log.match(/^- \*\*/gm) || []).length;
}

function FacetSheet({
  facet,
  files,
  onClose,
}: {
  facet: FacetKey;
  files: ReturnType<typeof useSoul>["files"];
  onClose: () => void;
}) {
  const body = facetBody(facet, files);
  const meta = FACETS.find((x) => x.key === facet)!;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, 100%)",
          maxHeight: "78dvh",
          background: "linear-gradient(180deg, rgba(40,28,18,0.98) 0%, rgba(20,17,13,0.98) 100%)",
          borderTop: "1px solid rgba(214,163,103,0.36)",
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -16px 50px rgba(0,0,0,.6)",
          padding: "18px 18px 24px",
          color: KITSU_C.cream,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontFamily: "Georgia, serif", color: KITSU_C.amber, fontSize: 26 }}>
            {meta.kanji}
          </span>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 22, color: KITSU_C.cream }}>
            {meta.label}
          </span>
          <span style={{ flex: 1 }} />
          <button
            onClick={onClose}
            aria-label="Close sheet"
            style={{
              background: "transparent",
              border: "1px solid rgba(214,163,103,0.32)",
              borderRadius: 8,
              color: KITSU_C.cream,
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            fontFamily: "ui-monospace,monospace",
            fontSize: "var(--text-xs)",
            color: KITSU_C.cream,
            opacity: 0.92,
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
          }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}

function facetBody(
  key: FacetKey,
  files: ReturnType<typeof useSoul>["files"],
): string {
  if (!files) return "loading…";
  switch (key) {
    case "soul":      return files.SOUL || "(empty)";
    case "memory":    return files.MEMORY || "(empty)";
    case "persona":   return files.IDENTITY || "(empty)";
    case "tools":     return [
      "Read tools (always auto-allow):",
      "  read_ships, read_queue, read_calendar, read_vitals,",
      "  read_signals, read_recent_archive, read_spotify,",
      "  monitor_fleet, read_agent_health, read_projects, read_habits",
      "",
      "Conservative actions (allowed at conservative autonomy):",
      "  launch_session, remember, update_user, update_soul, propose_action",
      "",
      "Trusted-only actions (need PG approval at conservative):",
      "  kill_session, complete_habit, add_ship, add_queue_item",
    ].join("\n");
    case "voice":     return [
      "TTS provider: ElevenLabs",
      "model_id   : eleven_turbo_v2_5 (sub-300ms TTFB)",
      "endpoint   : /v1/text-to-speech/{id}/stream",
      "stability  : 0.35",
      "similarity : 0.85",
      "style      : 0.40",
      "speaker boost: on",
      "",
      "Fallbacks: OpenAI gpt-4o-mini-tts → Web Speech.",
    ].join("\n");
    case "decisions": return files["decision-log"] || "(no decisions logged yet)";
  }
}
