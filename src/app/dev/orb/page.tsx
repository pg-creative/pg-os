"use client";

/**
 * /dev/orb — premium shader-orb redesign (real GLSL via @paper-design/shaders-react),
 * the upgrade from the hand-coded canvas. Circular-masked MeshGradient/DotOrbit in
 * warm Ghibli palettes, params react to Marvis state. Head-to-head vs pixel Marvis.
 */

import { useState } from "react";
import { MeshGradient, DotOrbit } from "@paper-design/shaders-react";

type S = "idle" | "listening" | "thinking" | "speaking";

const SPEED: Record<S, number> = {
  idle: 0.15,
  listening: 0.4,
  thinking: 0.3,
  speaking: 0.8,
};
const DIST: Record<S, number> = {
  idle: 0.7,
  listening: 1.0,
  thinking: 0.9,
  speaking: 1.4,
};

function Orb({ children, glow }: { children: React.ReactNode; glow: string }) {
  return (
    <div
      style={{
        width: 220,
        height: 220,
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow: `0 0 60px ${glow}, inset 0 0 40px rgba(0,0,0,.35)`,
        position: "relative",
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          boxShadow: "inset 0 0 50px rgba(0,0,0,.45)",
        }}
      />
    </div>
  );
}

const VARIANTS = [
  {
    name: "Hearth",
    glow: "rgba(214,163,103,.5)",
    desc: "Amber/gold molten gradient — the warm default.",
    render: (s: S) => (
      <MeshGradient
        colors={["#FDEFD2", "#E8B86A", "#D6A367", "#8a5a2a"]}
        distortion={DIST[s]}
        swirl={0.85}
        speed={SPEED[s]}
        style={{ width: 220, height: 220 }}
      />
    ),
  },
  {
    name: "Twilight",
    glow: "rgba(91,123,161,.45)",
    desc: "Gold meets deep-blue — Laputa dusk.",
    render: (s: S) => (
      <MeshGradient
        colors={["#FBE8C8", "#D6A367", "#5B7BA1", "#2C3E50"]}
        distortion={DIST[s]}
        swirl={0.7}
        speed={SPEED[s]}
        style={{ width: 220, height: 220 }}
      />
    ),
  },
  {
    name: "Ember",
    glow: "rgba(232,180,168,.5)",
    desc: "Coral + gold — warmest, most alive.",
    render: (s: S) => (
      <MeshGradient
        colors={["#FDEFD2", "#E8B4A8", "#D6A367", "#B8536F"]}
        distortion={DIST[s] * 1.1}
        swirl={1.0}
        speed={SPEED[s]}
        style={{ width: 220, height: 220 }}
      />
    ),
  },
  {
    name: "Constellation",
    glow: "rgba(214,163,103,.4)",
    desc: "DotOrbit — particulate energy field.",
    render: () => (
      <DotOrbit
        colors={["#D6A367", "#FBE8C8", "#5B7BA1", "#7C9A6E"]}
        colorBack={"#13110D"}
        scale={0.4}
        style={{ width: 220, height: 220 }}
      />
    ),
  },
];

export default function OrbPage() {
  const [state, setState] = useState<S>("idle");
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
          Marvis — shader orbs
        </h1>
        <span
          style={{
            fontFamily: "ui-monospace,monospace",
            fontSize: 11,
            color: "#9C8B70",
          }}
        >
          real GLSL (Paper Shaders) · params react to state
        </span>
        <div style={{ flex: 1 }} />
        {(["idle", "listening", "thinking", "speaking"] as S[]).map((s) => (
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
            {s}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          gap: 28,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {VARIANTS.map((v) => (
          <div
            key={v.name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Orb glow={v.glow}>{v.render(state)}</Orb>
            <div
              style={{ fontFamily: '"Iowan Old Style",serif', fontSize: 16 }}
            >
              {v.name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#9C8B70",
                maxWidth: 220,
                textAlign: "center",
              }}
            >
              {v.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
