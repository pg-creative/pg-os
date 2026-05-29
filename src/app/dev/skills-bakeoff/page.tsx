"use client";

/**
 * Skills Bake-off — does running the 5 installed design skills (at vendor
 * defaults) on the SAME Home slice beat PG's hand-rolled /dev/aesthetic-lab
 * baseline? Each skill expressed FREELY (neutral brief, no taste imposed).
 *
 *   solo:   ui-ux-pro-max · huashu · impeccable · design-taste
 *   combos: full chain (ui-ux→huashu→impeccable) · system→architect
 *           (ui-ux design-system→design-taste) · build→polish (huashu→impeccable)
 *   judge:  taste-5dim scores every variant (filled in after the builds).
 *
 * Baseline is embedded via iframe so the comparison is one click apart.
 */

import { useState, useEffect } from "react";
import UiUxProMaxSlice from "./_slices/UiUxProMaxSlice";
import HuashuSlice from "./_slices/HuashuSlice";
import ImpeccableSlice from "./_slices/ImpeccableSlice";
import DesignTasteSlice from "./_slices/DesignTasteSlice";
import ComboFullSlice from "./_slices/ComboFullSlice";
import ComboSystemArchitectSlice from "./_slices/ComboSystemArchitectSlice";
import ComboBuildPolishSlice from "./_slices/ComboBuildPolishSlice";

type Variant = {
  key: string;
  label: string;
  group: "baseline" | "solo" | "combo";
  recipe: string;
  render: () => React.ReactNode;
};

// taste-5dim scores (0–10 per dimension), filled in after the judge runs.
// dims: Code · Architecture · Product · Design · Communication
// taste-5dim per-dimension scores (Code/Arch/Product/Design/Comm, 0–10).
// NOTE: the judge's *totals* were internally inconsistent (rows didn't sum to
// its printed totals), so only the per-dimension judgments are trusted here.
const SCORES: Record<string, { dims: number[]; note: string } | null> = {
  baseline: null,
  uiux: {
    dims: [7, 7, 7, 7, 8],
    note: "considered dark cinema; ambient blobs decorative",
  },
  huashu: {
    dims: [6, 6, 7, 9, 7],
    note: "strongest design direction; some <12px text",
  },
  impeccable: { dims: [8, 8, 8, 8, 9], note: "most technically complete solo" },
  designtaste: {
    dims: [7, 6, 7, 7, 6],
    note: "competent, not considered; grain near-invisible",
  },
  comboFull: {
    dims: [7, 7, 7, 7, 7],
    note: "production-ready, least distinctive",
  },
  comboSysArch: {
    dims: [8, 7, 7, 6, 8],
    note: "great craft; Caveat is the gamble",
  },
  comboBuildPolish: {
    dims: [9, 8, 8, 8, 9],
    note: "most coherent type-as-structure",
  },
};

const VARIANTS: Variant[] = [
  {
    key: "baseline",
    label: "Baseline (yours)",
    group: "baseline",
    recipe:
      "Your hand-rolled /dev/aesthetic-lab — 5 directions, token-swapped.",
    render: () => (
      <iframe
        src="/dev/aesthetic-lab"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        title="baseline aesthetic-lab"
      />
    ),
  },
  {
    key: "uiux",
    label: "ui-ux-pro-max",
    group: "solo",
    recipe:
      "Ran its search.py to generate a design system, then built from it.",
    render: () => <UiUxProMaxSlice />,
  },
  {
    key: "huashu",
    label: "huashu",
    group: "solo",
    recipe: "HTML-first builder, embodying a designer persona.",
    render: () => <HuashuSlice />,
  },
  {
    key: "impeccable",
    label: "impeccable",
    group: "solo",
    recipe: "Polished/critiqued the baseline slice into a committed design.",
    render: () => <ImpeccableSlice />,
  },
  {
    key: "designtaste",
    label: "design-taste",
    group: "solo",
    recipe: "Metric-rule frontend architect (variance/motion/density dials).",
    render: () => <DesignTasteSlice />,
  },
  {
    key: "comboFull",
    label: "Combo · full chain",
    group: "combo",
    recipe: "ui-ux-pro-max (direction) → huashu (build) → impeccable (polish).",
    render: () => <ComboFullSlice />,
  },
  {
    key: "comboSysArch",
    label: "Combo · system→architect",
    group: "combo",
    recipe:
      "ui-ux-pro-max design-system → design-taste builds to its metric rules.",
    render: () => <ComboSystemArchitectSlice />,
  },
  {
    key: "comboBuildPolish",
    label: "Combo · build→polish",
    group: "combo",
    recipe: "huashu builds → impeccable polishes.",
    render: () => <ComboBuildPolishSlice />,
  },
];

const GROUP_LABEL: Record<Variant["group"], string> = {
  baseline: "BASELINE",
  solo: "SOLO",
  combo: "COMBO",
};

export default function SkillsBakeoff() {
  // Start "baseline" on both server and first client paint (no hydration
  // mismatch); adopt the ?v= variant only after mount.
  const [activeKey, setActiveKey] = useState("baseline");
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("v");
    if (v && VARIANTS.some((x) => x.key === v)) setActiveKey(v);
  }, []);
  const select = (k: string) => {
    setActiveKey(k);
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      u.searchParams.set("v", k);
      window.history.replaceState(null, "", u);
    }
  };
  const active = VARIANTS.find((v) => v.key === activeKey) ?? VARIANTS[0];
  const score = SCORES[active.key];

  let lastGroup: string | null = null;

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
          alignItems: "center",
          gap: 10,
          padding: "12px 18px",
          background: "rgba(10,10,10,.94)",
          borderBottom: "1px solid #222",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ color: "#fff", fontSize: 13, letterSpacing: ".1em" }}>
          SKILLS BAKE-OFF
        </strong>
        <span style={{ color: "#777", fontSize: 11 }}>
          same slice · skills at vendor defaults · neutral brief
        </span>
        <span style={{ flex: 1 }} />
        {VARIANTS.map((v) => {
          const showGroup = v.group !== lastGroup;
          lastGroup = v.group;
          return (
            <span
              key={v.key}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {showGroup && (
                <span
                  style={{
                    color: "#555",
                    fontSize: 9,
                    letterSpacing: ".15em",
                    marginLeft: 6,
                  }}
                >
                  {GROUP_LABEL[v.group]}
                </span>
              )}
              <button
                onClick={() => select(v.key)}
                style={{
                  padding: "6px 11px",
                  borderRadius: 6,
                  border: `1px solid ${v.key === activeKey ? "#fff" : "#333"}`,
                  background: v.key === activeKey ? "#fff" : "transparent",
                  color: v.key === activeKey ? "#000" : "#aaa",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {v.label}
              </button>
            </span>
          );
        })}
      </div>

      {/* caption + score */}
      <div
        style={{
          padding: "10px 22px",
          color: "#888",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span>
          <span style={{ color: "#fff" }}>{active.label}</span> ·{" "}
          {active.recipe}
        </span>
        <span style={{ flex: 1 }} />
        {score ? (
          <span style={{ color: "#FFD23F", fontSize: 11 }}>
            taste-5dim: {score.dims.join(" / ")} (C/A/P/D/Comm) — {score.note}
          </span>
        ) : (
          <span style={{ color: "#555", fontSize: 11 }}>
            taste-5dim: pending
          </span>
        )}
      </div>

      {/* stage */}
      <div style={{ padding: "0 22px 60px" }}>
        <div
          style={{
            maxWidth: active.key === "baseline" ? "100%" : 1180,
            margin: "0 auto",
            minHeight: 640,
            borderRadius: 12,
            border: "1px solid #222",
            overflow: "hidden",
            background: "#000",
            height: active.key === "baseline" ? "82vh" : undefined,
          }}
        >
          {active.render()}
        </div>
      </div>
    </div>
  );
}
