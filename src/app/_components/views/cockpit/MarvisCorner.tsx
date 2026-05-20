"use client";

/**
 * MarvisCorner — Marvis as a BIG (~2x), slide-in corner-of-screen presence with
 * a speech bubble (Jarvis/desktop-companion). Slides in from the far bottom-right
 * on mount; hideable (slides out to a small tab you click to summon him back).
 * Hosts the big Live2D face (bust-framed); swap modelUrl when a model is picked.
 */

import { useEffect, useState } from "react";
import { useMarvis } from "./useMarvis";
import { CockpitLive2D } from "./skins/CockpitLive2D";
import { PartyMode } from "./PartyMode";

const FACE = 560; // big

export function MarvisCorner({
  modelUrl = "/live2d/fox/standard_fox.model3.json",
}: {
  modelUrl?: string;
}) {
  const m = useMarvis();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  // Slide in shortly after mount.
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(t);
  }, []);

  const bubble =
    m.state === "listening" && m.transcript
      ? m.transcript
      : m.reply || "Standing by. Ask me what's happening with the fleet.";

  return (
    <>
      {/* Summon tab — visible when hidden, anchored to the far edge */}
      <button
        onClick={() => setOpen(true)}
        title="Summon Marvis"
        style={{
          position: "fixed",
          right: 0,
          bottom: 110,
          zIndex: 8999,
          transform: "translateX(40%)",
          opacity: open ? 0 : 1,
          pointerEvents: open ? "none" : "auto",
          transition: "opacity .3s, transform .3s",
          background:
            "radial-gradient(circle at 40% 40%, #FBE8C8, #D6A367 60%, #8a5a2a)",
          border: "1px solid #D6A367",
          color: "#13110D",
          fontFamily: "ui-monospace,monospace",
          fontSize: 11,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          fontWeight: 600,
          borderRadius: "8px 0 0 8px",
          padding: "10px 14px 10px 18px",
          cursor: "pointer",
          boxShadow: "0 0 22px rgba(214,163,103,.5)",
        }}
      >
        ◆ Marvis
      </button>

      {/* The big presence — slides in/out from the far bottom-right */}
      <div
        style={{
          position: "fixed",
          right: 0,
          bottom: 0,
          zIndex: 9000,
          width: 480,
          transform: open ? "translate(0,0)" : "translate(108%, 6%)",
          opacity: open ? 1 : 0,
          transition:
            "transform .5s cubic-bezier(.22,1,.36,1), opacity .4s ease",
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          padding: "0 16px 14px 0",
          gap: 8,
        }}
      >
        {/* speech bubble */}
        <div
          style={{
            pointerEvents: "auto",
            maxWidth: 360,
            background: "rgba(27,24,19,.96)",
            border: "1px solid rgba(214,163,103,.32)",
            borderRadius: 16,
            padding: "12px 16px",
            color: "#EFE6D4",
            boxShadow: "0 12px 38px rgba(0,0,0,.5)",
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
              gap: 10,
            }}
          >
            <span>◆ Marvis · {m.state}</span>
            <span
              onClick={() => setOpen(false)}
              title="hide"
              style={{ cursor: "pointer", color: "#9C8B70" }}
            >
              — hide
            </span>
          </div>
          <div
            style={{
              fontSize: 14.5,
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
            width: 440,
            height: FACE,
            overflow: "hidden",
            position: "relative",
            filter: "drop-shadow(0 14px 40px rgba(0,0,0,.6))",
            marginBottom: -10,
          }}
        >
          <CockpitLive2D
            state={m.state}
            size={FACE}
            zoom={2.0}
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
          style={{ pointerEvents: "auto", display: "flex", gap: 6, width: 360 }}
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
              padding: "8px 11px",
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

      <PartyMode active={m.party} onClose={() => m.setParty(false)} />
    </>
  );
}

function btn(color: string, on: boolean): React.CSSProperties {
  return {
    background: on ? "rgba(214,163,103,.2)" : "transparent",
    border: `1px solid ${color}`,
    color,
    borderRadius: 6,
    padding: "8px 11px",
    cursor: "pointer",
    fontSize: 14,
  };
}
