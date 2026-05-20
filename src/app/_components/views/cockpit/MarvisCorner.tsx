"use client";

/**
 * MarvisCorner — Marvis as a big, persistent corner-of-screen presence with a
 * speech bubble (the Jarvis/desktop-companion feel). Hosts the big Live2D face
 * (zoomed/bust-framed), shows his reply in a bubble, and carries the voice
 * controls. Swap the modelUrl when a warm/kitsune Live2D is picked.
 */

import { useState } from "react";
import { useMarvis } from "./useMarvis";
import { CockpitLive2D } from "./skins/CockpitLive2D";

export function MarvisCorner({ modelUrl }: { modelUrl?: string }) {
  const m = useMarvis();
  const [open, setOpen] = useState(true);
  const [typed, setTyped] = useState("");

  const bubble =
    m.state === "listening" && m.transcript
      ? m.transcript
      : m.reply || "Standing by. Ask me what's happening with the fleet.";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Wake Marvis"
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 9000,
          width: 56,
          height: 56,
          borderRadius: "50%",
          cursor: "pointer",
          border: "1px solid #D6A367",
          color: "#D6A367",
          fontSize: 20,
          background:
            "radial-gradient(circle at 50% 40%, #FBE8C8, #D6A367 60%, #8a5a2a)",
          boxShadow: "0 0 22px rgba(214,163,103,.5)",
        }}
      >
        ◆
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 9000,
        width: 300,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {/* speech bubble */}
      <div
        style={{
          pointerEvents: "auto",
          maxWidth: 300,
          background: "rgba(27,24,19,.96)",
          border: "1px solid rgba(214,163,103,.32)",
          borderRadius: 14,
          padding: "11px 14px",
          color: "#EFE6D4",
          boxShadow: "0 10px 34px rgba(0,0,0,.45)",
        }}
      >
        <div
          style={{
            fontFamily: "ui-monospace,monospace",
            fontSize: 9,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "#D6A367",
            marginBottom: 5,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>◆ Marvis · {m.state}</span>
          <span
            onClick={() => setOpen(false)}
            style={{ cursor: "pointer", color: "#9C8B70" }}
          >
            —
          </span>
        </div>
        <div
          style={{
            fontSize: 13.5,
            lineHeight: 1.45,
            fontStyle: m.reply ? "normal" : "italic",
          }}
        >
          {bubble}
        </div>
      </div>

      {/* the big Live2D face */}
      <div
        style={{
          pointerEvents: "auto",
          width: 280,
          height: 300,
          overflow: "hidden",
          position: "relative",
          filter: "drop-shadow(0 12px 34px rgba(0,0,0,.55))",
        }}
      >
        <CockpitLive2D
          state={m.state}
          size={300}
          zoom={1.9}
          align="top"
          modelUrl={modelUrl}
        />
      </div>

      {/* controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (typed.trim()) {
            m.ask(typed);
            setTyped("");
          }
        }}
        style={{
          pointerEvents: "auto",
          display: "flex",
          gap: 6,
          width: "100%",
          justifyContent: "flex-end",
        }}
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="ask Marvis…"
          style={{
            flex: 1,
            minWidth: 0,
            background: "#13110D",
            border: "1px solid rgba(214,163,103,.22)",
            borderRadius: 6,
            padding: "7px 10px",
            color: "#EFE6D4",
            fontSize: 12,
          }}
        />
        <button
          type="button"
          onClick={() => m.toggleWake(!m.wakeArmed)}
          title="Hands-free 'Hey Marvis'"
          style={btn(m.wakeArmed ? "#7C9A6E" : "#9C8B70", m.wakeArmed)}
        >
          👂
        </button>
        <button
          type="button"
          onMouseDown={m.startListening}
          onMouseUp={m.stopListening}
          title="Hold to talk"
          style={btn("#D6A367", m.state === "listening")}
        >
          🎙
        </button>
      </form>
    </div>
  );
}

function btn(color: string, on: boolean): React.CSSProperties {
  return {
    background: on ? "rgba(214,163,103,.2)" : "transparent",
    border: `1px solid ${color}`,
    color,
    borderRadius: 6,
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: 13,
  };
}
