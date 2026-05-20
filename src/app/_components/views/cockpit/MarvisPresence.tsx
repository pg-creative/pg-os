"use client";

/**
 * MarvisPresence — the orchestrator's living presence in the Cockpit.
 * Bound to useMarvis state (idle/listening/thinking/speaking). The CSS motion
 * here is the v1 of the Rive avatar (same state contract locked in the motion
 * study) — swap the orb for a .riv when authored, the states already match.
 */

import { useState } from "react";
import { useMarvis, type MarvisState } from "./useMarvis";

const STATE_COPY: Record<MarvisState, string> = {
  idle: "standing by",
  listening: "listening…",
  thinking: "thinking…",
  speaking: "speaking",
};

export function MarvisPresence() {
  const m = useMarvis();
  const [typed, setTyped] = useState("");
  const premium = m.config?.tts === "elevenlabs";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 16px",
        background: "rgba(214,163,103,0.05)",
        border: "1px solid rgba(214,163,103,0.18)",
        borderRadius: 12,
        marginBottom: 18,
      }}
    >
      {/* Orb */}
      <div
        style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}
      >
        <div
          data-state={m.state}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              m.state === "thinking"
                ? "radial-gradient(circle at 50% 38%, #fff, #5B7BA1)"
                : "radial-gradient(circle at 50% 38%, #FBE8C8, #D6A367 45%, #8a5a2a)",
            boxShadow:
              m.state === "speaking"
                ? "0 0 22px rgba(214,163,103,.7)"
                : m.state === "listening"
                  ? "0 0 18px rgba(124,154,110,.6)"
                  : "0 0 14px rgba(214,163,103,.3)",
            animation:
              m.state === "speaking"
                ? "marvis-speak .3s ease-in-out infinite"
                : m.state === "listening"
                  ? "marvis-pulse 1.4s ease-in-out infinite"
                  : m.state === "thinking"
                    ? "marvis-think 2s ease-in-out infinite"
                    : "marvis-breathe 4s ease-in-out infinite",
          }}
        />
        <style>{`
          @keyframes marvis-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
          @keyframes marvis-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
          @keyframes marvis-think { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.4)} }
          @keyframes marvis-speak { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(.88)} }
        `}</style>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "#D6A367",
            }}
          >
            ◆ Marvis
          </span>
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 10,
              color: "#9C8B70",
            }}
          >
            {STATE_COPY[m.state]}
          </span>
          {m.config && !premium && (
            <span
              title="ElevenLabs needs the $11/mo Creator plan for the real Marvis voice. Using Web Speech until then."
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 9,
                color: "#9C8B70",
                opacity: 0.7,
              }}
            >
              · voice: web-speech (upgrade ElevenLabs for Marvis)
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 13.5,
            color: "#EFE6D4",
            fontStyle: "italic",
            minHeight: 18,
            marginTop: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {m.state === "listening" && m.transcript
            ? `“${m.transcript}”`
            : m.reply
              ? m.reply
              : "Ask me what’s happening."}
        </div>
      </div>

      {/* Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (typed.trim()) {
            m.ask(typed);
            setTyped("");
          }
        }}
        style={{ display: "flex", gap: 8, flexShrink: 0 }}
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="ask Marvis…"
          style={{
            background: "#13110D",
            border: "1px solid rgba(214,163,103,0.2)",
            borderRadius: 6,
            padding: "7px 10px",
            color: "#EFE6D4",
            fontSize: 12,
            width: 180,
          }}
        />
        <button
          type="button"
          onClick={() => m.toggleWake(!m.wakeArmed)}
          title={
            m.wakeArmed
              ? "‘Hey Marvis’ listening — click to disarm"
              : "Arm hands-free ‘Hey Marvis’ wake word"
          }
          style={{
            background: m.wakeArmed ? "rgba(124,154,110,0.25)" : "transparent",
            border: `1px solid ${m.wakeArmed ? "#7C9A6E" : "#9C8B70"}`,
            borderRadius: 6,
            color: m.wakeArmed ? "#7C9A6E" : "#9C8B70",
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            padding: "7px 10px",
            cursor: "pointer",
          }}
        >
          {m.wakeArmed ? "👂 hey marvis" : "👂 wake"}
        </button>
        <button
          type="button"
          onMouseDown={m.startListening}
          onMouseUp={m.stopListening}
          onTouchStart={m.startListening}
          onTouchEnd={m.stopListening}
          title="Hold to talk"
          style={{
            background:
              m.state === "listening"
                ? "rgba(124,154,110,0.25)"
                : "transparent",
            border: `1px solid ${m.state === "listening" ? "#7C9A6E" : "#D6A367"}`,
            borderRadius: 6,
            color: m.state === "listening" ? "#7C9A6E" : "#D6A367",
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            padding: "7px 12px",
            cursor: "pointer",
          }}
        >
          🎙 hold
        </button>
        {(m.state === "speaking" || m.state === "thinking") && (
          <button
            type="button"
            onClick={m.interrupt}
            title="stop"
            style={{
              background: "transparent",
              border: "1px solid #B8536F",
              borderRadius: 6,
              color: "#B8536F",
              fontFamily: "ui-monospace, monospace",
              fontSize: 11,
              padding: "7px 10px",
              cursor: "pointer",
            }}
          >
            ◼
          </button>
        )}
      </form>
    </div>
  );
}
