"use client";

/**
 * Cockpit Tab Bake-off. 4 thematic framings for the tab where Kitsu watches +
 * commands the live Claude Code fleet, all in the locked Emaki x Laputa aesthetic.
 * PG picks the framing + layout. Deep link: ?v=1|2|3|4 and ?phase=day|twilight|night.
 *   1 Foxfire (狐火)     2 Nine Tails (九尾)
 *   3 The Den (狐の巣)   4 Shrine (稲荷, falsifier-leaning)
 */

import { useEffect, useState } from "react";
import type { Phase } from "../../_components/emaki/theme";
import { phaseForHour } from "../../_components/emaki/theme";
import V1Foxfire from "./_variants/V1Foxfire";
import V2NineTails from "./_variants/V2NineTails";
import V3Den from "./_variants/V3Den";
import V4Shrine from "./_variants/V4Shrine";

const VARIANTS = [
  {
    id: "1",
    label: "1 · Foxfire",
    render: (p: Phase) => <V1Foxfire phase={p} />,
  },
  {
    id: "2",
    label: "2 · Nine Tails",
    render: (p: Phase) => <V2NineTails phase={p} />,
  },
  { id: "3", label: "3 · The Den", render: (p: Phase) => <V3Den phase={p} /> },
  {
    id: "4",
    label: "4 · Shrine",
    render: (p: Phase) => <V4Shrine phase={p} />,
  },
];

const PHASES_LIST: Phase[] = ["day", "twilight", "night"];

export default function CockpitLab() {
  const [v, setV] = useState("1");
  const [phase, setPhase] = useState<Phase>("night");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const qv = q.get("v");
    const qp = q.get("phase") as Phase | null;
    if (qv && VARIANTS.some((x) => x.id === qv)) setV(qv);
    if (qp && PHASES_LIST.includes(qp)) setPhase(qp);
    else setPhase(phaseForHour(new Date().getHours()));
  }, []);

  const sync = (nextV: string, nextPhase: Phase) => {
    const u = new URL(window.location.href);
    u.searchParams.set("v", nextV);
    u.searchParams.set("phase", nextPhase);
    window.history.replaceState(null, "", u);
  };

  const pick = (id: string) => {
    setV(id);
    sync(id, phase);
  };
  const pickPhase = (p: Phase) => {
    setPhase(p);
    sync(v, p);
  };

  const active = VARIANTS.find((x) => x.id === v) ?? VARIANTS[0];

  const pill = (on: boolean): React.CSSProperties => ({
    padding: "4px 10px",
    borderRadius: 7,
    border: `1px solid ${on ? "#fff" : "transparent"}`,
    background: on ? "#fff" : "transparent",
    color: on ? "#000" : "#cbd",
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  });

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100000,
          display: "flex",
          gap: 4,
          padding: "5px 6px",
          borderRadius: 10,
          background: "rgba(8,8,10,0.86)",
          border: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {VARIANTS.map((x) => (
          <button
            key={x.id}
            onClick={() => pick(x.id)}
            style={pill(x.id === v)}
          >
            {x.label}
          </button>
        ))}
        <span
          style={{
            width: 1,
            background: "rgba(255,255,255,0.2)",
            margin: "0 3px",
          }}
        />
        {PHASES_LIST.map((p) => (
          <button
            key={p}
            onClick={() => pickPhase(p)}
            style={pill(p === phase)}
          >
            {p}
          </button>
        ))}
      </div>
      {active.render(phase)}
    </>
  );
}
