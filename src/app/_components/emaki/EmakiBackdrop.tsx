"use client";

/**
 * EmakiBackdrop — global painted-sky layer (cohesion pass, 2026-05-21).
 *
 * Renders the per-tab Emaki sky behind the whole app at z-index 0 (above the
 * body fallback, below .particles (z1) and .shell (z2)). The sky shows through
 * panel gaps and margins, so data-dense tabs stay legible (heavier scrim) while
 * calm tabs feel more immersive (lighter scrim). Phase follows the live palette.
 */

import { useMode } from "../ModeProvider";
import { useActiveTab } from "../useActiveTab";
import type { Phase } from "./theme";
import { backdropForTab, backdropImage } from "./tabBackdrops";

function phaseForMode(mode: string): Phase {
  if (mode === "laputa-day") return "day";
  if (mode === "laputa-twilight" || mode === "totoro") return "twilight";
  return "night"; // laputa-midnight, howls, mononoke
}

export function EmakiBackdrop() {
  const { mode } = useMode();
  const { active } = useActiveTab();

  const cfg = backdropForTab(active);
  if (!cfg) return null;

  const phase = phaseForMode(mode);
  const img = backdropImage(phase, active);
  // Scrim opacity: lightened 2026-05-21 so the bespoke painting actually reads
  // (PG: "on many tabs you can barely see the image"). Panels stay solid for
  // legibility, so the art shows through gaps/margins rather than behind text.
  const scrimOpacity = cfg.prominence === "prominent" ? 0.38 : 0.55;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        backgroundImage: `url("${img}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        transition: "background-image 0.6s ease",
      }}
    >
      {/* Phase-tinted scrim keeps text legible over the painting */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, rgba(var(--scrim-rgb), ${Math.min(
            scrimOpacity + 0.08,
            0.95,
          )}) 0%, rgba(var(--scrim-rgb), ${scrimOpacity}) 100%)`,
        }}
      />
    </div>
  );
}
