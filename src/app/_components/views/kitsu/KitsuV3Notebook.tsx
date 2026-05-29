"use client";

/**
 * KitsuV3Notebook — CHAT-FIRST, CALM.
 *
 * Chat takes 75% of the viewport, generous bubbles (Claude.ai-feel).
 * Top sub-tabs flip the right pane between Soul / Tools / Log — collapsed
 * to a drawer on mobile. Subtle painted den as backdrop. The "quietest"
 * variant: the page disappears so the conversation can be the point.
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

type Pane = "soul" | "tools" | "log";

export function KitsuV3Notebook() {
  const marvis = useMarvis();
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const soul = useSoul();
  const [pane, setPane] = useState<Pane>("soul");
  const [paneOpen, setPaneOpen] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "calc(100dvh - 56px)",
        color: KITSU_C.cream,
        // Very subtle den backdrop: heavy ink scrim so the chat dominates.
        background: `
          linear-gradient(180deg, rgba(20,17,13,0.92) 0%, rgba(20,17,13,0.97) 100%),
          url('/kitsu/den-${phase}.webp')
        `,
        backgroundColor: KITSU_C.ink,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "var(--body), system-ui, sans-serif",
      }}
    >
      <style>{`
        .nb-shell {
          display: grid;
          grid-template-columns: 1fr;
          height: calc(100dvh - 56px);
          max-width: 1280px;
          margin: 0 auto;
        }
        @media (min-width: 1024px) {
          .nb-shell { grid-template-columns: 1fr 320px; }
          .nb-pane-drawer { transform: none !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="nb-shell">
        {/* MAIN: header strip + transcript + composer */}
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid rgba(214,163,103,0.14)",
            minWidth: 0,
            height: "100%",
          }}
        >
          {/* slim header */}
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
            <span style={{ fontSize: 22, filter: "drop-shadow(0 0 6px rgba(214,163,103,.4))" }}>
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
              · notebook
            </span>
            <span style={{ flex: 1 }} />
            <StatePill state={marvis.state} />
            <button
              onClick={() => setPaneOpen((x) => !x)}
              style={{
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
              }}
              aria-expanded={paneOpen}
              aria-controls="kitsu-side-pane"
            >
              {paneOpen ? "close" : "drawer"}
            </button>
          </header>

          {/* transcript fills the rest */}
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
              emptyHint="A quiet notebook. Type or hold the mic to start."
            />
            <ChatComposer marvis={marvis} placeholder="write Kitsu a line…" />
          </div>
        </main>

        {/* SIDE PANE: drawer on mobile, fixed column at >=1024px */}
        <aside
          id="kitsu-side-pane"
          className="nb-pane-drawer"
          aria-hidden={!paneOpen}
          style={{
            position: "fixed",
            top: 56,
            right: 0,
            width: "min(360px, 92vw)",
            height: "calc(100dvh - 56px)",
            background: "rgba(20,17,13,0.97)",
            borderLeft: "1px solid rgba(214,163,103,0.22)",
            boxShadow: paneOpen ? "0 0 40px rgba(0,0,0,.6)" : "none",
            transform: paneOpen ? "translateX(0)" : "translateX(110%)",
            transition: "transform 280ms cubic-bezier(.22,1,.36,1)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {/* sub-tabs */}
          <div
            role="tablist"
            style={{ display: "flex", padding: "10px 12px 8px", gap: 4, flexShrink: 0 }}
          >
            {(["soul", "tools", "log"] as Pane[]).map((p) => {
              const on = p === pane;
              return (
                <button
                  key={p}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setPane(p)}
                  style={{
                    flex: 1,
                    background: on ? "rgba(214,163,103,0.2)" : "transparent",
                    border: `1px solid ${on ? KITSU_C.amber : "rgba(214,163,103,0.22)"}`,
                    color: on ? KITSU_C.amber : KITSU_C.dim,
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontFamily: "ui-monospace,monospace",
                    fontSize: "var(--text-2xs)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* pane body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 14px" }}>
            {pane === "soul" && <SoulQuickview files={soul.files} loading={soul.loading} />}
            {pane === "tools" && <ToolList />}
            {pane === "log" && <LogTail log={soul.files?.["decision-log"] || ""} loading={soul.loading} />}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SoulQuickview({
  files,
  loading,
}: {
  files: Record<SoulKey, string> | null;
  loading: boolean;
}) {
  const keys: { k: SoulKey; label: string; kanji: string }[] = [
    { k: "IDENTITY", label: "Identity", kanji: "魂" },
    { k: "SOUL", label: "Soul", kanji: "心" },
    { k: "USER", label: "User", kanji: "人" },
    { k: "MEMORY", label: "Memory", kanji: "記" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {keys.map(({ k, label, kanji }) => (
        <div
          key={k}
          style={{
            background: "rgba(0,0,0,0.22)",
            border: "1px solid rgba(214,163,103,0.18)",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <span style={{ fontFamily: "Georgia, serif", color: KITSU_C.amber, fontSize: 16 }}>
              {kanji}
            </span>
            <span
              style={{
                fontFamily: "ui-monospace,monospace",
                fontSize: "var(--text-2xs)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: KITSU_C.cream,
              }}
            >
              {label}
            </span>
          </div>
          <div
            style={{
              fontFamily: "ui-monospace,monospace",
              fontSize: "var(--text-2xs)",
              color: KITSU_C.cream,
              opacity: 0.85,
              lineHeight: 1.55,
              maxHeight: 110,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {loading ? "…" : (files?.[k] || "(empty)").split("\n").slice(0, 8).join("\n")}
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolList() {
  const tools = [
    "read_ships", "read_queue", "read_calendar", "read_vitals",
    "read_signals", "read_recent_archive", "read_spotify", "control_spotify",
    "monitor_fleet", "read_agent_health", "read_projects", "read_habits",
    "propose_action", "add_ship", "add_queue_item",
    "launch_session", "kill_session", "complete_habit",
    "remember", "update_user", "update_soul",
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 0" }}>
      <div
        style={{
          fontFamily: "ui-monospace,monospace",
          fontSize: "var(--text-2xs)",
          color: KITSU_C.dim,
          marginBottom: 6,
          opacity: 0.7,
        }}
      >
        {tools.length} in-process tools
      </div>
      {tools.map((t) => (
        <div
          key={t}
          style={{
            fontFamily: "ui-monospace,monospace",
            fontSize: "var(--text-2xs)",
            color: KITSU_C.amber,
            padding: "4px 10px",
            background: "rgba(0,0,0,0.18)",
            border: "1px solid rgba(214,163,103,0.14)",
            borderRadius: 6,
          }}
        >
          {t}
        </div>
      ))}
    </div>
  );
}

function LogTail({ log, loading }: { log: string; loading: boolean }) {
  const tail = log.split("\n").filter((l) => l.trim()).slice(-30).reverse();
  if (loading) return <div style={{ color: KITSU_C.dim }}>loading…</div>;
  if (tail.length === 0) return <div style={{ color: KITSU_C.dim, fontStyle: "italic" }}>(no decisions yet)</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {tail.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: "ui-monospace,monospace",
            fontSize: "var(--text-2xs)",
            color: KITSU_C.cream,
            opacity: 0.85,
            background: "rgba(0,0,0,0.18)",
            border: "1px solid rgba(214,163,103,0.14)",
            borderRadius: 6,
            padding: "5px 9px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            lineHeight: 1.45,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
