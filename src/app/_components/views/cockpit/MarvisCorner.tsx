"use client";

/**
 * MarvisCorner — Marvis as a corner chat widget: big fox avatar on top, a
 * scrollable transcript of the conversation (your messages + his replies,
 * transcribed), and a working editable input + mic/wake. Slides in, hideable.
 */

import { useEffect, useRef, useState } from "react";
import { useMarvis } from "./useMarvis";
import { CockpitLive2D } from "./skins/CockpitLive2D";
import { PartyMode } from "./PartyMode";

const C = {
  ink: "#13110D",
  panel: "rgba(20,17,13,0.97)",
  cream: "#EFE6D4",
  dim: "#9C8B70",
  amber: "#D6A367",
  emerald: "#7C9A6E",
  ruby: "#B8536F",
};

export function MarvisCorner({
  modelUrl = "/live2d/fox/standard_fox.model3.json",
}: {
  modelUrl?: string;
}) {
  const m = useMarvis();
  // Default COLLAPSED to the fox orb (still present bottom-right, but does not
  // occlude tab content). Click the orb to expand the panel. Auto-opens only
  // when Kitsu has something to say (speaking) or is actively listening.
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // "Teach Kitsu" correction affordance
  const [teachOpen, setTeachOpen] = useState(false);
  const [teachText, setTeachText] = useState("");
  const [teachStatus, setTeachStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  async function submitCorrection() {
    const v = teachText.trim();
    if (!v) return;
    setTeachStatus("saving");
    try {
      await fetch("/api/kitsu/correct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ correction: v }),
      });
      setTeachStatus("saved");
      setTeachText("");
      setTimeout(() => {
        setTeachStatus("idle");
        setTeachOpen(false);
      }, 1800);
    } catch {
      setTeachStatus("idle");
    }
  }

  useEffect(() => {
    if (m.state === "speaking" || m.state === "listening") setOpen(true);
  }, [m.state]);

  // Auto-scroll the transcript on new content.
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [m.turns, m.reply, m.transcript, m.state]);

  if (!open) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          title="Summon Kitsu"
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 9000,
            width: 60,
            height: 60,
            borderRadius: "50%",
            cursor: "pointer",
            border: "1px solid #D6A367",
            color: "#13110D",
            fontSize: 22,
            background:
              "radial-gradient(circle at 45% 40%, #FBE8C8, #D6A367 60%, #8a5a2a)",
            boxShadow: "0 0 26px rgba(214,163,103,.6)",
          }}
        >
          🦊
        </button>
        <PartyMode
          active={m.party}
          onClose={() => m.setParty(false)}
          speak={m.speak}
        />
      </>
    );
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 9000,
          width: 360,
          maxHeight: "calc(100vh - 130px)",
          display: "flex",
          flexDirection: "column",
          background: C.panel,
          border: "1px solid rgba(214,163,103,.28)",
          borderRadius: 16,
          boxShadow: "0 18px 50px rgba(0,0,0,.55)",
          overflow: "hidden",
          transform: open ? "translateY(0)" : "translateY(110%)",
          transition: "transform .45s cubic-bezier(.22,1,.36,1)",
          backdropFilter: "blur(6px)",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 13px",
            borderBottom: "1px solid rgba(214,163,103,.16)",
          }}
        >
          <span
            style={{
              fontFamily: "ui-monospace,monospace",
              fontSize: "var(--text-xs)",
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: C.amber,
            }}
          >
            ◆ Kitsu
          </span>
          <span
            style={{
              fontFamily: "ui-monospace,monospace",
              fontSize: "var(--text-2xs)",
              color:
                m.state === "speaking"
                  ? C.amber
                  : m.state === "listening"
                    ? C.emerald
                    : C.dim,
            }}
          >
            · {m.state}
          </span>
          <span style={{ flex: 1 }} />
          <span
            onClick={() => setOpen(false)}
            title="hide"
            style={{
              cursor: "pointer",
              color: C.dim,
              fontSize: "var(--text-md)",
              lineHeight: 1,
            }}
          >
            —
          </span>
        </div>

        {/* big fox avatar */}
        <div
          style={{
            height: 210,
            overflow: "hidden",
            position: "relative",
            background:
              "radial-gradient(circle at 50% 38%, rgba(214,163,103,.14), transparent 72%)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              transform: "translateX(-50%)",
            }}
          >
            <CockpitLive2D
              state={m.state}
              size={280}
              zoom={1.42}
              align="top"
              modelUrl={modelUrl}
            />
          </div>
        </div>

        {/* transcript */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            minHeight: 80,
            maxHeight: 200,
            overflowY: "auto",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {m.turns.length === 0 && m.state === "idle" && (
            <div
              style={{
                color: C.dim,
                fontSize: "var(--text-sm)",
                fontStyle: "italic",
                textAlign: "center",
                padding: "12px 4px",
              }}
            >
              Ask me what&apos;s happening with the fleet — type below or hold
              the mic.
            </div>
          )}
          {m.turns.map((t, i) => (
            <Bubble key={i} role={t.role} text={t.text} />
          ))}
          {/* live streaming reply */}
          {(m.state === "thinking" || m.state === "speaking") && m.reply && (
            <Bubble role="assistant" text={m.reply} live />
          )}
          {/* tool-activity indicator: shows while Kitsu is using a tool */}
          {m.state === "thinking" && m.activeTool && (
            <div
              style={{
                alignSelf: "flex-start",
                display: "flex",
                alignItems: "center",
                gap: 7,
                color: C.amber,
                fontFamily: "ui-monospace,monospace",
                fontSize: "var(--text-2xs)",
                letterSpacing: ".04em",
                opacity: 0.85,
                padding: "2px 2px",
              }}
            >
              <span className="kitsu-tool-dot" aria-hidden>
                ◇
              </span>
              checking {m.activeTool}…
            </div>
          )}
          {m.state === "listening" && (
            <Bubble role="user" text={m.transcript || "listening…"} live />
          )}
        </div>

        {/* teach Kitsu inline drawer */}
        {teachOpen && (
          <div
            style={{
              padding: "8px 12px",
              borderTop: "1px solid rgba(214,163,103,.12)",
              background: "rgba(214,163,103,.05)",
            }}
          >
            {teachStatus === "saved" ? (
              <div
                style={{
                  color: C.emerald,
                  fontSize: "var(--text-xs)",
                  fontFamily: "ui-monospace,monospace",
                  textAlign: "center",
                  padding: "6px 0",
                }}
              >
                Kitsu will remember that.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitCorrection();
                }}
                style={{ display: "flex", gap: 6 }}
              >
                <input
                  autoFocus
                  value={teachText}
                  onChange={(e) => setTeachText(e.target.value)}
                  placeholder="what should Kitsu remember?"
                  aria-label="Teach Kitsu a correction"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: C.ink,
                    border: "1px solid rgba(214,163,103,.35)",
                    borderRadius: 7,
                    padding: "7px 10px",
                    color: C.cream,
                    fontSize: "var(--text-xs)",
                    fontFamily: "ui-monospace,monospace",
                  }}
                />
                <button
                  type="submit"
                  disabled={teachStatus === "saving" || !teachText.trim()}
                  aria-label="Save correction"
                  style={{
                    ...btn(C.emerald, false),
                    fontSize: "var(--text-xs)",
                    padding: "7px 10px",
                    opacity:
                      teachStatus === "saving" || !teachText.trim() ? 0.5 : 1,
                  }}
                >
                  {teachStatus === "saving" ? "…" : "save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTeachOpen(false);
                    setTeachText("");
                    setTeachStatus("idle");
                  }}
                  aria-label="Cancel correction"
                  style={{
                    ...btn(C.dim, false),
                    fontSize: "var(--text-xs)",
                    padding: "7px 10px",
                  }}
                >
                  ✕
                </button>
              </form>
            )}
          </div>
        )}

        {/* input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = typed.trim();
            if (v) {
              m.ask(v);
              setTyped("");
            }
          }}
          style={{
            display: "flex",
            gap: 6,
            padding: "10px 12px",
            borderTop: "1px solid rgba(214,163,103,.16)",
          }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="message Kitsu…"
            autoComplete="off"
            style={{
              flex: 1,
              minWidth: 0,
              background: C.ink,
              border: "1px solid rgba(214,163,103,.25)",
              borderRadius: 8,
              padding: "9px 11px",
              color: C.cream,
              fontSize: "var(--text-sm)",
            }}
          />
          <button type="submit" title="send" style={btn(C.amber, false)}>
            ➤
          </button>
          <button
            type="button"
            onClick={() => setTeachOpen((x) => !x)}
            title="Teach Kitsu something to remember"
            aria-label="Teach Kitsu"
            aria-pressed={teachOpen}
            style={btn(teachOpen ? C.emerald : C.dim, teachOpen)}
          >
            🦊
          </button>
          <button
            type="button"
            onClick={() => m.toggleWake(!m.wakeArmed)}
            title="Hands-free 'Hey Kitsu'"
            style={btn(m.wakeArmed ? C.emerald : C.dim, m.wakeArmed)}
          >
            👂
          </button>
          <button
            type="button"
            onMouseDown={m.startListening}
            onMouseUp={m.stopListening}
            onTouchStart={m.startListening}
            onTouchEnd={m.stopListening}
            title="Hold to talk"
            style={btn(C.amber, m.state === "listening")}
          >
            🎙
          </button>
        </form>
      </div>

      <PartyMode
        active={m.party}
        onClose={() => m.setParty(false)}
        speak={m.speak}
      />
    </>
  );
}

function Bubble({
  role,
  text,
  live,
}: {
  role: "user" | "assistant";
  text: string;
  live?: boolean;
}) {
  const me = role === "user";
  return (
    <div
      style={{
        alignSelf: me ? "flex-end" : "flex-start",
        maxWidth: "85%",
        background: me ? "rgba(214,163,103,.16)" : "rgba(255,248,231,.05)",
        border: `1px solid ${me ? "rgba(214,163,103,.3)" : "rgba(214,163,103,.14)"}`,
        borderRadius: 12,
        padding: "8px 11px",
        color: "#EFE6D4",
        fontSize: "var(--text-sm)",
        lineHeight: 1.45,
        opacity: live ? 0.85 : 1,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text}
    </div>
  );
}

function btn(color: string, on: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    background: on ? "rgba(214,163,103,.2)" : "transparent",
    border: `1px solid ${color}`,
    color,
    borderRadius: 8,
    padding: "9px 11px",
    cursor: "pointer",
    fontSize: "var(--text-base)",
  };
}
