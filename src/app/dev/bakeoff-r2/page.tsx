"use client";

/**
 * Bake-off Round 2 — 4 researched directions × 3 arms.
 *   Directions: Vellum (paper) · Observatory (glass/sky) · Reckoning (instrument) · Emaki (painted)
 *   Arms: A "as conceived" (neutral) · B "golden-hour" (PG taste) · C "Nioh kitsune" (suits the fox)
 * Each direction built its 3 arms off ONE shared structure, so A/B/C are true reskins.
 * Deep links: ?d=<dir>&a=<arm>.
 */

import { useState, useEffect } from "react";
import VellumA from "./_slices/VellumA";
import VellumB from "./_slices/VellumB";
import VellumC from "./_slices/VellumC";
import ObservatoryA from "./_slices/ObservatoryA";
import ObservatoryB from "./_slices/ObservatoryB";
import ObservatoryC from "./_slices/ObservatoryC";
import ReckoningA from "./_slices/ReckoningA";
import ReckoningB from "./_slices/ReckoningB";
import ReckoningC from "./_slices/ReckoningC";
import EmakiA from "./_slices/EmakiA";
import EmakiB from "./_slices/EmakiB";
import EmakiC from "./_slices/EmakiC";

type Dir = "vellum" | "observatory" | "reckoning" | "emaki";
type Arm = "A" | "B" | "C";

const DIRECTIONS: { id: Dir; label: string; blurb: string }[] = [
  {
    id: "vellum",
    label: "Vellum & Marginalia",
    blurb: "warm paper manuscript · type-driven",
  },
  {
    id: "observatory",
    label: "Laputa Observatory",
    blurb: "luminous glass · floating sky-station",
  },
  {
    id: "reckoning",
    label: "Dead Reckoning",
    blurb: "ship's instrument panel · dense gauges",
  },
  {
    id: "emaki",
    label: "Emaki Scroll",
    blurb: "full-bleed painted diorama · parallax",
  },
];

const ARMS: { id: Arm; label: string }[] = [
  { id: "A", label: "A · as conceived" },
  { id: "B", label: "B · golden-hour (your taste)" },
  { id: "C", label: "C · Nioh kitsune (for Kitsu)" },
];

const COMPONENTS: Record<Dir, Record<Arm, () => React.ReactNode>> = {
  vellum: { A: VellumA, B: VellumB, C: VellumC },
  observatory: { A: ObservatoryA, B: ObservatoryB, C: ObservatoryC },
  reckoning: { A: ReckoningA, B: ReckoningB, C: ReckoningC },
  emaki: { A: EmakiA, B: EmakiB, C: EmakiC },
};

export default function BakeoffR2() {
  const [dir, setDir] = useState<Dir>("vellum");
  const [arm, setArm] = useState<Arm>("C");

  // adopt ?d=/?a= only after mount (no hydration mismatch)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get("d") as Dir | null;
    const a = p.get("a") as Arm | null;
    if (d && DIRECTIONS.some((x) => x.id === d)) setDir(d);
    if (a && ARMS.some((x) => x.id === a)) setArm(a);
  }, []);

  const sync = (d: Dir, a: Arm) => {
    setDir(d);
    setArm(a);
    const u = new URL(window.location.href);
    u.searchParams.set("d", d);
    u.searchParams.set("a", a);
    window.history.replaceState(null, "", u);
  };

  const active = DIRECTIONS.find((x) => x.id === dir)!;
  const Active = COMPONENTS[dir][arm];

  const btn = (on: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    borderRadius: 7,
    border: `1px solid ${on ? "#fff" : "#333"}`,
    background: on ? "#fff" : "transparent",
    color: on ? "#000" : "#aaa",
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#eee",
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        overflowX: "hidden",
      }}
    >
      {/* control rail */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "12px 18px",
          background: "rgba(10,10,10,.95)",
          borderBottom: "1px solid #222",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <strong
            style={{ color: "#fff", fontSize: 13, letterSpacing: ".1em" }}
          >
            BAKE-OFF R2
          </strong>
          <span style={{ color: "#666", fontSize: 10 }}>
            direction × arm · grounded in your answers
          </span>
          <span style={{ flex: 1 }} />
          {DIRECTIONS.map((d) => (
            <button
              key={d.id}
              style={btn(d.id === dir)}
              onClick={() => sync(d.id, arm)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "#666", fontSize: 10, letterSpacing: ".1em" }}>
            ARM
          </span>
          {ARMS.map((a) => (
            <button
              key={a.id}
              style={btn(a.id === arm)}
              onClick={() => sync(dir, a.id)}
            >
              {a.label}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ color: "#888", fontSize: 11 }}>
            <span style={{ color: "#fff" }}>{active.label}</span> ·{" "}
            {active.blurb}
          </span>
        </div>
      </div>

      {/* stage */}
      <div style={{ padding: "0 22px 60px" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "18px auto 0",
            minHeight: 640,
            borderRadius: 12,
            border: "1px solid #222",
            overflow: "hidden",
            background: "#000",
          }}
        >
          <Active />
        </div>
      </div>
    </div>
  );
}
