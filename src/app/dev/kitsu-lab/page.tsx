"use client";
/**
 * Kitsu Lab — live-switchable bake-off of 4 paradigms for the dedicated
 * Kitsu tab. Open at /dev/kitsu-lab?v=1..4 (defaults to 1). PG picks one
 * and it becomes the production KitsuView.
 *
 * V1 Kitsune Shrine    — thematic / immersive (painted shrine + Live2D)
 * V2 Mission Control   — functional / transparent (3-column dashboard)
 * V3 Notebook          — chat-first / calm (chat 75% + side drawer)
 * V4 Companion Deck    — hybrid / playful (hero + card deck + docked chat)
 *
 * Designed to be tested at 390x844 (iPhone). All variants reuse useMarvis
 * directly so each variant has its own short-lived Kitsu session.
 */
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { KitsuV1Shrine } from "../../_components/views/kitsu/KitsuV1Shrine";
import { KitsuV2Mission } from "../../_components/views/kitsu/KitsuV2Mission";
import { KitsuV3Notebook } from "../../_components/views/kitsu/KitsuV3Notebook";
import { KitsuV4CardDeck } from "../../_components/views/kitsu/KitsuV4CardDeck";
import { KitsuV5NotebookRail } from "../../_components/views/kitsu/KitsuV5NotebookRail";
import { KitsuV6MissionNotebook } from "../../_components/views/kitsu/KitsuV6MissionNotebook";
import { KitsuV7Marginalia } from "../../_components/views/kitsu/KitsuV7Marginalia";
import { KitsuV8LanternPond } from "../../_components/views/kitsu/KitsuV8LanternPond";
import { KitsuV9LivingCodex } from "../../_components/views/kitsu/KitsuV9LivingCodex";
import { KitsuV10NohStage } from "../../_components/views/kitsu/KitsuV10NohStage";

const VARIANTS = [
  { id: "1", label: "V1 · Kitsune Shrine", Component: KitsuV1Shrine },
  { id: "2", label: "V2 · Mission Control", Component: KitsuV2Mission },
  { id: "3", label: "V3 · Notebook", Component: KitsuV3Notebook },
  { id: "4", label: "V4 · Companion Deck", Component: KitsuV4CardDeck },
  { id: "5", label: "V5 · Notebook + Rail", Component: KitsuV5NotebookRail },
  {
    id: "6",
    label: "V6 · Mission + Notebook",
    Component: KitsuV6MissionNotebook,
  },
  { id: "7", label: "V7 · Marginalia", Component: KitsuV7Marginalia },
  { id: "8", label: "V8 · Lantern Pond", Component: KitsuV8LanternPond },
  { id: "9", label: "V9 · Living Codex", Component: KitsuV9LivingCodex },
  { id: "10", label: "V10 · Noh Stage (FALSIFIER)", Component: KitsuV10NohStage },
] as const;

function LabBody() {
  const sp = useSearchParams();
  const v = sp.get("v") ?? "1";
  const active = VARIANTS.find((x) => x.id === v) ?? VARIANTS[0];
  const Variant = active.Component;
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#13110D",
        color: "#EFE6D4",
        fontFamily: "var(--body), system-ui, sans-serif",
      }}
    >
      {/* Lab switcher bar — slim, top-fixed, doesn't get in the way */}
      <div
        style={{
          position: "fixed",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          display: "flex",
          gap: 6,
          padding: "6px 8px",
          background: "rgba(20,17,13,0.92)",
          border: "1px solid rgba(214,163,103,0.28)",
          borderRadius: 999,
          backdropFilter: "blur(4px)",
          boxShadow: "0 4px 20px rgba(0,0,0,.5)",
        }}
      >
        {VARIANTS.map((variant) => (
          <a
            key={variant.id}
            href={`?v=${variant.id}`}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border:
                variant.id === active.id
                  ? "1px solid #D6A367"
                  : "1px solid transparent",
              background:
                variant.id === active.id
                  ? "rgba(214,163,103,.18)"
                  : "transparent",
              color: variant.id === active.id ? "#D6A367" : "#9C8B70",
              fontSize: 12,
              textDecoration: "none",
              fontFamily: "ui-monospace, monospace",
              letterSpacing: "0.08em",
              whiteSpace: "nowrap",
            }}
          >
            {variant.label}
          </a>
        ))}
      </div>

      {/* Render the active variant full-bleed below */}
      <main style={{ minHeight: "100dvh" }}>
        <Variant />
      </main>
    </div>
  );
}

export default function KitsuLabPage() {
  return (
    <Suspense fallback={null}>
      <LabBody />
    </Suspense>
  );
}
