"use client";

/**
 * KitsuV6MissionNotebook — MISSION CONTROL + NOTEBOOK hybrid (3-col but calm).
 *
 * Inverts the V5 priority: V2's 3-column dashboard structure is preserved
 * (slim avatar/state column on left + chat center + soul-editor column right),
 * but the center column gets V3's notebook treatment: generous bubbles
 * (`size="lg"`), 720px max-width inside its column, single thought per line.
 *
 * Reads as: "Mission Control where the center column slows down to breathe."
 * For when PG wants the full instrumentation visible but the conversation
 * still feels like a journal.
 */

import { useEffect, useState } from "react";
import { useMarvis } from "../cockpit/useMarvis";
import { CockpitLive2D } from "../cockpit/skins/CockpitLive2D";
import { useMode } from "../../ModeProvider";
import { phaseForMode } from "../../bento/emakiContext";
import {
  KITSU_C,
  Transcript,
  ChatComposer,
  StatePill,
  useSoul,
  useVoiceCfg,
  type SoulKey,
} from "./KitsuShared";

const SOUL_TABS: { key: SoulKey; label: string; editable: boolean }[] = [
  { key: "IDENTITY", label: "Identity", editable: true },
  { key: "SOUL", label: "Soul", editable: true },
  { key: "USER", label: "User", editable: true },
  { key: "MEMORY", label: "Memory", editable: true },
  { key: "decision-log", label: "Log", editable: false },
];

export function KitsuV6MissionNotebook() {
  const marvis = useMarvis();
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const soul = useSoul();
  const voice = useVoiceCfg();

  return (
    <div
      style={{
        position: "relative",
        minHeight: "calc(100dvh - 56px)",
        color: KITSU_C.cream,
        background: `
          linear-gradient(180deg, rgba(20,17,13,0.88) 0%, rgba(20,17,13,0.96) 100%),
          url('/kitsu/den-${phase}.webp')
        `,
        backgroundColor: KITSU_C.ink,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "var(--body), system-ui, sans-serif",
      }}
    >
      <style>{`
        .mn-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          padding: 16px;
          max-width: 1500px;
          margin: 0 auto;
        }
        @media (min-width: 1024px) {
          .mn-grid {
            grid-template-columns: 240px 1fr 320px;
            height: calc(100dvh - 56px);
            overflow: hidden;
          }
          .mn-col { overflow: hidden; }
        }
        .mn-col {
          background: rgba(20,17,13,0.55);
          border: 1px solid rgba(214,163,103,0.22);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
      `}</style>

      <div className="mn-grid">
        {/* LEFT: slim avatar + state + voice strip */}
        <aside className="mn-col">
          <SectionHead label="Kitsu" kanji="狐" />
          <div
            style={{
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              alignItems: "center",
              overflowY: "auto",
            }}
          >
            <div style={{ height: 170, position: "relative", width: 170 }}>
              <CockpitLive2D
                state={marvis.state}
                size={170}
                zoom={1.42}
                align="top"
                modelUrl="/live2d/fox/standard_fox.model3.json"
              />
            </div>
            <StatePill state={marvis.state} />
            <KvBox
              label="VOICE"
              rows={[
                ["model", "turbo_v2_5"],
                ["voice", voice?.elevenVoiceId?.slice(0, 8) ?? "—"],
                ["stab", "0.35"],
                ["style", "0.40"],
              ]}
            />
            <KvBox
              label="AUTONOMY"
              rows={[
                ["mode", "conservative"],
                ["launch", "yes"],
                ["kill", "ask"],
              ]}
            />
            <div
              style={{
                fontFamily: "ui-monospace,monospace",
                fontSize: "var(--text-2xs)",
                color: KITSU_C.dim,
                opacity: 0.7,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              {marvis.turns.length} turns
              <br />
              {marvis.activeTool ? `· using ${marvis.activeTool}` : ""}
            </div>
          </div>
        </aside>

        {/* CENTER: chat — Notebook-style generous bubbles, narrow content column */}
        <main className="mn-col">
          <SectionHead label="Transcript" kanji="話" />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              maxWidth: 720,
              width: "100%",
              alignSelf: "center",
            }}
          >
            <Transcript
              marvis={marvis}
              bubbleSize="lg"
              emptyHint="Mission Control with room to think. Type or hold the mic."
            />
            <ChatComposer marvis={marvis} placeholder="write Kitsu a line…" />
          </div>
        </main>

        {/* RIGHT: Soul editor */}
        <aside className="mn-col">
          <SoulEditor soul={soul} />
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

function KvBox({ label, rows }: { label: string; rows: [string, string][] }) {
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          fontFamily: "ui-monospace,monospace",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: KITSU_C.amber,
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "ui-monospace,monospace",
          fontSize: "var(--text-2xs)",
          color: KITSU_C.cream,
          background: "rgba(0,0,0,0.22)",
          border: "1px solid rgba(214,163,103,0.18)",
          borderRadius: 8,
          padding: "7px 10px",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "3px 10px",
        }}
      >
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <span style={{ opacity: 0.55 }}>{k}</span>
            <span style={{ textAlign: "right", color: KITSU_C.amber }}>
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SoulEditor({ soul }: { soul: ReturnType<typeof useSoul> }) {
  const [active, setActive] = useState<SoulKey>("SOUL");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const current = soul.files?.[active] ?? "";
  const meta = SOUL_TABS.find((t) => t.key === active)!;

  useEffect(() => {
    setEditing(false);
    setSaveState("idle");
  }, [active]);

  async function save() {
    setSaveState("saving");
    const ok = await soul.save(active, draft);
    setSaveState(ok ? "saved" : "error");
    if (ok) {
      setEditing(false);
      setTimeout(() => setSaveState("idle"), 1800);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: 1,
      }}
    >
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
          const on = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              style={{
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
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div
        style={{
          padding: "0 12px 12px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {editing ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{
                flex: 1,
                minHeight: 140,
                fontFamily: "ui-monospace,monospace",
                fontSize: "var(--text-2xs)",
                background: "rgba(0,0,0,0.28)",
                border: `1px solid ${KITSU_C.amber}`,
                borderRadius: 8,
                padding: "10px 12px",
                color: KITSU_C.cream,
                lineHeight: 1.55,
                resize: "vertical",
              }}
            />
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 8,
                alignItems: "center",
              }}
            >
              <button
                onClick={save}
                disabled={saveState === "saving"}
                style={btnSoul(KITSU_C.amber)}
              >
                {saveState === "saving" ? "saving…" : "save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                style={btnSoul(KITSU_C.dim)}
              >
                cancel
              </button>
              {saveState === "saved" && (
                <span
                  style={{
                    color: KITSU_C.emerald,
                    fontSize: "var(--text-2xs)",
                  }}
                >
                  saved
                </span>
              )}
              {saveState === "error" && (
                <span
                  style={{ color: KITSU_C.ruby, fontSize: "var(--text-2xs)" }}
                >
                  save failed
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                flex: 1,
                minHeight: 100,
                maxHeight: 320,
                overflowY: "auto",
                fontFamily: "ui-monospace,monospace",
                fontSize: "var(--text-2xs)",
                background: "rgba(0,0,0,0.18)",
                border: "1px solid rgba(214,163,103,0.18)",
                borderRadius: 8,
                padding: "10px 12px",
                color: KITSU_C.cream,
                lineHeight: 1.65,
                whiteSpace: "pre-wrap",
              }}
            >
              {soul.loading ? "loading…" : current || "(empty)"}
            </div>
            {meta.editable && (
              <button
                onClick={() => {
                  setDraft(current);
                  setEditing(true);
                }}
                style={{ ...btnSoul(KITSU_C.dim), marginTop: 8 }}
              >
                edit
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function btnSoul(color: string): React.CSSProperties {
  return {
    fontFamily: "ui-monospace,monospace",
    fontSize: "var(--text-2xs)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    background: "transparent",
    border: `1px solid ${color}`,
    color,
    borderRadius: 6,
    padding: "5px 12px",
    cursor: "pointer",
  };
}
