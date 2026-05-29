"use client";

/**
 * KitsuV2Mission — FUNCTIONAL, TRANSPARENT ("under the hood").
 *
 * 3-column dashboard on desktop, stacked on mobile.
 *   LEFT  : avatar (smaller) + voice config + autonomy badge + session info
 *   CENTER: big chat transcript (generous bubbles)
 *   RIGHT : soul editor (tabbed: IDENTITY/SOUL/USER/MEMORY/log) + tool log + corrections feed
 *
 * The "show me everything" variant. For when PG wants to see + tune what's
 * driving Kitsu, not just talk to her.
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

export function KitsuV2Mission() {
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
          linear-gradient(180deg, rgba(20,17,13,0.85) 0%, rgba(20,17,13,0.95) 100%),
          url('/kitsu/den-${phase}.webp')
        `,
        backgroundColor: KITSU_C.ink,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        fontFamily: "var(--body), system-ui, sans-serif",
      }}
    >
      <style>{`
        .mission-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          padding: 16px;
          max-width: 1400px;
          margin: 0 auto;
        }
        @media (min-width: 900px) {
          .mission-grid {
            grid-template-columns: 280px 1fr 320px;
            grid-template-rows: minmax(calc(100dvh - 90px), 1fr);
            height: calc(100dvh - 56px);
            overflow: hidden;
          }
          .mission-col { overflow: hidden; }
        }
        .mission-col {
          background: rgba(20,17,13,0.55);
          border: 1px solid rgba(214,163,103,0.22);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
      `}</style>

      <div className="mission-grid">
        {/* LEFT: avatar + voice + autonomy + session */}
        <aside className="mission-col">
          <SectionHead label="Kitsu" kanji="狐" />
          <div
            style={{
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              alignItems: "center",
              overflowY: "auto",
            }}
          >
            <div style={{ height: 200, position: "relative", width: 200 }}>
              <CockpitLive2D
                state={marvis.state}
                size={200}
                zoom={1.42}
                align="top"
                modelUrl="/live2d/fox/standard_fox.model3.json"
              />
            </div>
            <StatePill state={marvis.state} />

            <Stat
              label="VOICE"
              kv={[
                ["model", "turbo_v2_5"],
                ["voice id", voice?.elevenVoiceId ?? "(env)"],
                ["stability", "0.35"],
                ["similarity", "0.85"],
                ["style", "0.40"],
              ]}
            />
            <Stat
              label="AUTONOMY"
              kv={[
                ["mode", "conservative"],
                ["read", "always"],
                ["launch", "yes"],
                ["kill", "needs ok"],
              ]}
            />
            <Stat
              label="WAKE"
              kv={[
                ["channel", "push-to-talk"],
                ["heard", marvis.wakeArmed ? "armed" : "off"],
              ]}
            />
          </div>
        </aside>

        {/* CENTER: chat */}
        <main className="mission-col">
          <SectionHead label="Transcript" kanji="話" />
          <Transcript
            marvis={marvis}
            bubbleSize="lg"
            emptyHint="Mission control. Ask Kitsu anything."
          />
          <ChatComposer marvis={marvis} />
        </main>

        {/* RIGHT: soul + tool log + corrections */}
        <aside className="mission-col">
          <SoulEditorPane soul={soul} />
          <ToolActivityPane
            activeTool={marvis.activeTool}
            state={marvis.state}
          />
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
            fontSize: 18,
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

function Stat({ label, kv }: { label: string; kv: [string, string][] }) {
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          fontFamily: "ui-monospace,monospace",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: KITSU_C.amber,
          marginBottom: 6,
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
          padding: "8px 11px",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "4px 12px",
        }}
      >
        {kv.map(([k, v]) => (
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

function SoulEditorPane({ soul }: { soul: ReturnType<typeof useSoul> }) {
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
                borderRadius: 6,
                color: on ? KITSU_C.amber : KITSU_C.dim,
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
                style={btnMission(KITSU_C.amber)}
              >
                {saveState === "saving" ? "saving…" : "save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                style={btnMission(KITSU_C.dim)}
              >
                cancel
              </button>
              {saveState === "error" && (
                <span
                  style={{ color: KITSU_C.ruby, fontSize: "var(--text-2xs)" }}
                >
                  save failed
                </span>
              )}
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
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                flex: 1,
                minHeight: 100,
                maxHeight: 260,
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
                style={{ ...btnMission(KITSU_C.dim), marginTop: 8 }}
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

function ToolActivityPane({
  activeTool,
  state,
}: {
  activeTool: string | null;
  state: string;
}) {
  return (
    <div
      style={{
        borderTop: "1px solid rgba(214,163,103,0.18)",
        padding: "10px 14px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontFamily: "ui-monospace,monospace",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: KITSU_C.amber,
          marginBottom: 6,
        }}
      >
        Activity
      </div>
      <div
        style={{
          fontFamily: "ui-monospace,monospace",
          fontSize: "var(--text-2xs)",
          color: activeTool ? KITSU_C.amber : KITSU_C.dim,
          background: "rgba(0,0,0,0.18)",
          border: "1px solid rgba(214,163,103,0.14)",
          borderRadius: 8,
          padding: "8px 11px",
        }}
      >
        {activeTool
          ? `▸ checking ${activeTool}…`
          : state === "thinking"
            ? "thinking…"
            : "idle"}
      </div>
    </div>
  );
}

function btnMission(color: string): React.CSSProperties {
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
