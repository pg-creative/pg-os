"use client";

/**
 * /dev/marvis — the 7 Marvis concepts, fully animated, pick one.
 * Each renders its PixelLab idle/talk frames; toggle state to feel them talk.
 * Pick persists to localStorage ("cockpit.marvisSkin") for the cockpit to read.
 */

import { useEffect, useState } from "react";
import {
  PixelSprite,
  type SpriteManifest,
} from "../../_components/views/cockpit/skins/PixelSprite";

const LABELS: Record<string, string> = {
  "marvis-wisp": "Hearth-Wisp",
  "marvis-sage": "Sage",
  "marvis-owl": "Clockwork Owl",
  "marvis-crystal": "Crystal Being",
  "marvis-kitsune": "Kitsune (Recursive Fox)",
  "marvis-lantern": "Lantern-Djinn",
  "marvis-construct": "Light Construct",
};

export default function MarvisPickerPage() {
  const [sprites, setSprites] = useState<SpriteManifest[]>([]);
  const [state, setState] = useState("idle");
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    try {
      setPicked(localStorage.getItem("cockpit.marvisSkin"));
    } catch {}
    const load = () =>
      fetch("/api/cockpit/sprites")
        .then((r) => r.json())
        .then((d) =>
          setSprites(
            (d.sprites || []).filter((s: SpriteManifest) =>
              s.slug.startsWith("marvis-"),
            ),
          ),
        )
        .catch(() => {});
    load();
    const iv = setInterval(load, 5000); // refresh as new sprites land
    return () => clearInterval(iv);
  }, []);

  const pick = (slug: string) => {
    setPicked(slug);
    try {
      localStorage.setItem("cockpit.marvisSkin", slug);
    } catch {}
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#13110D",
        color: "#EFE6D4",
        padding: "28px 30px 64px",
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
          Marvis — the 7
        </h1>
        <span
          style={{
            fontFamily: "ui-monospace,monospace",
            fontSize: 11,
            color: "#9C8B70",
          }}
        >
          {sprites.length}/7 generated · pick one · it flows into the cockpit
        </span>
        <div style={{ flex: 1 }} />
        {["idle", "thinking", "speaking"].map((s) => (
          <button
            key={s}
            onClick={() => setState(s)}
            style={{
              fontFamily: "ui-monospace,monospace",
              fontSize: 11,
              textTransform: "uppercase",
              background: state === s ? "rgba(214,163,103,.2)" : "transparent",
              border: "1px solid #D6A367",
              color: "#D6A367",
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            {s === "speaking" || s === "thinking" ? "talk" : s}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {sprites.length === 0 && (
          <div
            style={{
              color: "#9C8B70",
              fontStyle: "italic",
              gridColumn: "1/-1",
              padding: 40,
              textAlign: "center",
            }}
          >
            sprites still generating… (this page auto-refreshes)
          </div>
        )}
        {sprites.map((s) => {
          const isPicked = picked === s.slug;
          const frames = s.actions.idle?.length || s.actions.talk?.length || 0;
          return (
            <div
              key={s.slug}
              style={{
                background: isPicked
                  ? "rgba(214,163,103,.1)"
                  : "rgba(255,248,231,.03)",
                border: `1px solid ${isPicked ? "#D6A367" : "rgba(214,163,103,.16)"}`,
                borderRadius: 12,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 144,
                  height: 144,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 10,
                  background:
                    "radial-gradient(circle at 50% 40%, rgba(214,163,103,.12), transparent 70%)",
                }}
              >
                <PixelSprite manifest={s} state={state} size={128} />
              </div>
              <div
                style={{ fontFamily: '"Iowan Old Style",serif', fontSize: 15 }}
              >
                {LABELS[s.slug] || s.slug}
              </div>
              <div
                style={{
                  fontFamily: "ui-monospace,monospace",
                  fontSize: 9,
                  color: "#9C8B70",
                }}
              >
                {frames ? `${frames} frames · animated` : "static (animating…)"}
              </div>
              <button
                onClick={() => pick(s.slug)}
                style={{
                  fontFamily: "ui-monospace,monospace",
                  fontSize: 11,
                  textTransform: "uppercase",
                  background: isPicked ? "rgba(124,154,110,.2)" : "transparent",
                  border: `1px solid ${isPicked ? "#7C9A6E" : "#D6A367"}`,
                  color: isPicked ? "#7C9A6E" : "#D6A367",
                  borderRadius: 6,
                  padding: "6px 14px",
                  cursor: "pointer",
                }}
              >
                {isPicked ? "◆ Marvis" : "make Marvis"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
