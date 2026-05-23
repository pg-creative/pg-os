"use client";

/**
 * KitsuV5NotebookRail — NOTEBOOK + MISSION CONTROL hybrid.
 *
 * V3's calm chat-first center column (760px max, generous bubbles, slim
 * header) PLUS V2's always-visible right rail with the Soul editor and live
 * activity log. The drawer-on-demand of V3 becomes a permanent column on
 * desktop, while still collapsing to a slide-in on phones.
 *
 * Reads as: "I'm reading my agent's mind WHILE talking to her, not after."
 */

import { useState } from "react";
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

const SOUL_TABS: { key: SoulKey; label: string; kanji: string }[] = [
  { key: "IDENTITY", label: "Identity", kanji: "魂" },
  { key: "SOUL", label: "Soul", kanji: "心" },
  { key: "USER", label: "User", kanji: "人" },
  { key: "MEMORY", label: "Memory", kanji: "記" },
  { key: "decision-log", label: "Log", kanji: "歴" },
];

export function KitsuV5NotebookRail() {
  const marvis = useMarvis();
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const soul = useSoul();
  const [soulTab, setSoulTab] = useState<SoulKey>("SOUL");
  const [railOpen, setRailOpen] = useState(false);

  const currentSoul = soul.files?.[soulTab] ?? "";

  return (
    <div
      style={{
        position: "relative",
        minHeight: "calc(100dvh - 56px)",
        color: KITSU_C.cream,
        background: `
          linear-gradient(180deg, rgba(20,17,13,0.9) 0%, rgba(20,17,13,0.96) 100%),
          url('/kitsu/den-${phase}.webp')
        `,
        backgroundColor: KITSU_C.ink,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "var(--body), system-ui, sans-serif",
      }}
    >
      <style>{`
        .nbrail-shell {
          display: grid;
          grid-template-columns: 1fr;
          height: calc(100dvh - 56px);
          max-width: 1320px;
          margin: 0 auto;
        }
        @media (min-width: 980px) {
          .nbrail-shell { grid-template-columns: 1fr 340px; }
          .nbrail-rail-drawer { transform: none !important; box-shadow: none !important; position: relative !important; height: 100% !important; }
        }
      `}</style>

      <div className="nbrail-shell">
        {/* MAIN: header + chat */}
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid rgba(214,163,103,0.18)",
            minWidth: 0,
            height: "100%",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 18px",
              borderBottom: "1px solid rgba(214,163,103,0.18)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 22,
                filter: "drop-shadow(0 0 6px rgba(214,163,103,.4))",
              }}
            >
              🦊
            </span>
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
                fontFamily: "ui-monospace,monospace",
                fontSize: "var(--text-2xs)",
                color: KITSU_C.dim,
                opacity: 0.7,
              }}
            >
              · notebook + rail
            </span>
            <span style={{ flex: 1 }} />
            <StatePill state={marvis.state} />
            <button
              onClick={() => setRailOpen((x) => !x)}
              style={mobileToggle()}
              aria-expanded={railOpen}
              aria-controls="kitsu-rail"
              title="Toggle rail (mobile)"
            >
              {railOpen ? "close" : "rail"}
            </button>
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
              emptyHint="Quiet column to chat. The rail to the right is your view inside her mind."
            />
            <ChatComposer marvis={marvis} placeholder="write Kitsu a line…" />
          </div>
        </main>

        {/* RAIL: Soul + Activity (permanent on desktop, drawer on mobile) */}
        <aside
          id="kitsu-rail"
          className="nbrail-rail-drawer"
          aria-hidden={!railOpen}
          style={{
            position: "fixed",
            top: 56,
            right: 0,
            width: "min(360px, 92vw)",
            height: "calc(100dvh - 56px)",
            background: "rgba(20,17,13,0.97)",
            borderLeft: "1px solid rgba(214,163,103,0.22)",
            boxShadow: railOpen ? "0 0 40px rgba(0,0,0,.6)" : "none",
            transform: railOpen ? "translateX(0)" : "translateX(110%)",
            transition: "transform 280ms cubic-bezier(.22,1,.36,1)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {/* SOUL block (top half) */}
          <SectionHead label="Soul" kanji="魂" />
          <div
            style={{
              padding: "8px 10px",
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              flexShrink: 0,
            }}
          >
            {SOUL_TABS.map((t) => {
              const on = t.key === soulTab;
              return (
                <button
                  key={t.key}
                  onClick={() => setSoulTab(t.key)}
                  style={tabBtn(on)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div
            style={{
              padding: "0 12px 10px",
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              fontFamily: "ui-monospace,monospace",
              fontSize: "var(--text-2xs)",
              color: KITSU_C.cream,
              opacity: 0.92,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {soul.loading ? "loading…" : currentSoul || "(empty)"}
          </div>

          {/* ACTIVITY block (bottom strip) */}
          <SectionHead label="Activity" kanji="動" />
          <div
            style={{
              padding: "10px 14px",
              borderTop: "1px solid rgba(214,163,103,0.14)",
            }}
          >
            <div
              style={{
                fontFamily: "ui-monospace,monospace",
                fontSize: "var(--text-2xs)",
                color: marvis.activeTool ? KITSU_C.amber : KITSU_C.dim,
                background: "rgba(0,0,0,0.18)",
                border: "1px solid rgba(214,163,103,0.14)",
                borderRadius: 8,
                padding: "8px 11px",
                marginBottom: 8,
              }}
            >
              {marvis.activeTool
                ? `▸ checking ${marvis.activeTool}…`
                : marvis.state === "thinking"
                  ? "thinking…"
                  : marvis.state === "speaking"
                    ? "speaking"
                    : "idle"}
            </div>
            <div
              style={{
                fontFamily: "ui-monospace,monospace",
                fontSize: "var(--text-2xs)",
                color: KITSU_C.dim,
                opacity: 0.65,
                lineHeight: 1.5,
              }}
            >
              {marvis.turns.length} turns this session.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionHead({ label, kanji }: { label: string; kanji?: string }) {
  return (
    <div
      style={{
        padding: "11px 14px",
        borderBottom: "1px solid rgba(214,163,103,0.18)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}
    >
      {kanji && (
        <span
          style={{
            fontFamily: "Georgia, serif",
            color: KITSU_C.amber,
            fontSize: 16,
          }}
        >
          {kanji}
        </span>
      )}
      <span
        style={{
          fontFamily: "ui-monospace,monospace",
          fontSize: "var(--text-xs)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: KITSU_C.cream,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function tabBtn(on: boolean): React.CSSProperties {
  return {
    fontFamily: "ui-monospace,monospace",
    fontSize: "var(--text-2xs)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    background: on ? "rgba(214,163,103,0.2)" : "transparent",
    border: `1px solid ${on ? KITSU_C.amber : "rgba(214,163,103,0.22)"}`,
    color: on ? KITSU_C.amber : KITSU_C.dim,
    borderRadius: 6,
    padding: "4px 9px",
    cursor: "pointer",
  };
}

function mobileToggle(): React.CSSProperties {
  return {
    background: "transparent",
    border: "1px solid rgba(214,163,103,0.28)",
    borderRadius: 6,
    color: KITSU_C.amber,
    padding: "4px 10px",
    fontFamily: "ui-monospace,monospace",
    fontSize: "var(--text-2xs)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
  };
}
