"use client";

/**
 * Home Layout Lab. 5 radically different Home compositions, all in the locked
 * Emaki x Laputa aesthetic. PG picks the layout. Deep link: ?v=1|2|3|4|5.
 *   1 Bento canvas (left rail)      2 Top bar + broadsheet bands
 *   3 Focal cockpit (no scroll)     4 Editorial emaki scroll (falsifier)
 *   5 HYBRID: V2 top bar + V3 focal core + V2 legibility satellites
 */

import { useState, useEffect } from "react";
import HomeEmaki from "../home-emaki/page";
import V2TopBar from "./_variants/V2TopBar";
import V3Cockpit from "./_variants/V3Cockpit";
import V4Editorial from "./_variants/V4Editorial";
import V5Hybrid from "./_variants/V5Hybrid";

const VARIANTS = [
  { id: "1", label: "1 · Bento", render: () => <HomeEmaki /> },
  { id: "2", label: "2 · Top-bar", render: () => <V2TopBar /> },
  { id: "3", label: "3 · Cockpit", render: () => <V3Cockpit /> },
  { id: "4", label: "4 · Editorial", render: () => <V4Editorial /> },
  { id: "5", label: "5 · Hybrid", render: () => <V5Hybrid /> },
];

export default function HomeLab() {
  const [v, setV] = useState("1");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("v");
    if (q && VARIANTS.some((x) => x.id === q)) setV(q);
  }, []);
  const pick = (id: string) => {
    setV(id);
    const u = new URL(window.location.href);
    u.searchParams.set("v", id);
    window.history.replaceState(null, "", u);
  };
  const active = VARIANTS.find((x) => x.id === v) ?? VARIANTS[0];

  return (
    <>
      {/* floating variant picker, above everything (dev tool) */}
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
            style={{
              padding: "4px 10px",
              borderRadius: 7,
              border: `1px solid ${x.id === v ? "#fff" : "transparent"}`,
              background: x.id === v ? "#fff" : "transparent",
              color: x.id === v ? "#000" : "#cbd",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            {x.label}
          </button>
        ))}
      </div>
      {active.render()}
    </>
  );
}
