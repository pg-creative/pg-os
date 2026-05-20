"use client";

/**
 * /dev/live2d — full-size Live2D demo so PG feels the VTuber animation level.
 * Uses a free sample model; the real warm/kitsune Marvis model drops into the
 * same <CockpitLive2D modelUrl=...> once picked. Toggle/auto-loop to see lip-sync.
 */

import { useEffect, useState } from "react";
import { CockpitLive2D } from "../../_components/views/cockpit/skins/CockpitLive2D";

export default function Live2DDemoPage() {
  const [state, setState] = useState("idle");
  const [loop, setLoop] = useState(true);

  // Auto talk-loop so the lip-sync is obvious without clicking.
  useEffect(() => {
    if (!loop) return;
    const iv = setInterval(
      () => setState((s) => (s === "speaking" ? "idle" : "speaking")),
      1600,
    );
    return () => clearInterval(iv);
  }, [loop]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#13110D",
        color: "#EFE6D4",
        padding: "26px 30px 64px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: '"Iowan Old Style",Palatino,Georgia,serif',
            fontWeight: 500,
            fontSize: 26,
          }}
        >
          Marvis — Live2D (VTuber animation level)
        </h1>
        <span
          style={{
            fontFamily: "ui-monospace,monospace",
            fontSize: 11,
            color: "#9C8B70",
          }}
        >
          free sample model · your warm/kitsune Marvis drops into the same slot
        </span>
      </div>

      <div
        style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}
      >
        {["idle", "speaking"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setLoop(false);
              setState(s);
            }}
            style={{
              fontFamily: "ui-monospace,monospace",
              fontSize: 11,
              textTransform: "uppercase",
              background:
                state === s && !loop ? "rgba(214,163,103,.2)" : "transparent",
              border: "1px solid #D6A367",
              color: "#D6A367",
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
        <button
          onClick={() => setLoop((l) => !l)}
          style={{
            fontFamily: "ui-monospace,monospace",
            fontSize: 11,
            textTransform: "uppercase",
            background: loop ? "rgba(124,154,110,.2)" : "transparent",
            border: "1px solid #7C9A6E",
            color: "#7C9A6E",
            borderRadius: 6,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          {loop ? "◆ auto talk-loop" : "auto talk-loop"}
        </button>
      </div>

      <div
        style={{
          marginTop: 24,
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at 50% 35%, rgba(214,163,103,.1), transparent 70%)",
          borderRadius: 16,
          padding: 20,
          maxWidth: 560,
        }}
      >
        <CockpitLive2D state={state} size={460} />
      </div>
      <p
        style={{
          marginTop: 14,
          fontSize: 12.5,
          color: "#9C8B70",
          maxWidth: 560,
        }}
      >
        This is the medium — full face rig, head-sway, lip-sync on speak.
        Imagine this as a warm kitsune/fox-spirit (or your picked model)
        lip-syncing Marvis's ElevenLabs voice. Way more alive than the orbs or
        the small sprites.
      </p>
    </div>
  );
}
