"use client";

/**
 * EmakiBackdrop — global painted-sky layer (cohesion pass, 2026-05-21).
 *
 * Renders the per-tab Emaki sky behind the whole app at z-index 0 (above the
 * body fallback, below .particles (z1) and .shell (z2)). The sky shows through
 * panel gaps and margins, so data-dense tabs stay legible (heavier scrim) while
 * calm tabs feel more immersive (lighter scrim). Phase follows the live palette.
 *
 * WORLD MODE: DELETED, round 2.1. Round two added a `world` prop and a
 * `WorldSlot` that painted a sky, a blur-up and a plate behind the cosmos canvas.
 * The Critic's amendment audit, D7: "the `world` mode is mounted by nothing, and
 * `/cosmos` paints its own slot, so the one-component rule is untrue of the one
 * route it was written for." Superseded code gets deleted rather than parked, so
 * it is gone, and with it `WorldBackdrop` and the world-level LQIP in
 * `lib/cosmos/vault.ts` that existed to feed it. The cosmos route owns its own
 * fixed slot in `cosmos.css`; this component owns every OTHER route's.
 *
 * PHASE MODE (dev labs, 2026-09-09). Round one shipped `dev/_shared/LabSky.tsx`
 * for the seven bake-off variants, and the Critic's never-restart check failed it
 * as "a new home for a job that had one": D7 says ONE component owns the slot on
 * every route. LabSky is deleted; `<EmakiBackdrop phase="twilight" />` is what the
 * labs mount. A lab passes its phase as a prop instead of reading the live palette,
 * which is the whole reason a lab exists.
 */

import { useMode } from "../ModeProvider";
import { useActiveTab } from "../useActiveTab";
import { PHASES, type Phase } from "./theme";
import { backdropForTab, backdropImage } from "./tabBackdrops";

function phaseForMode(mode: string): Phase {
  if (mode === "laputa-day") return "day";
  if (mode === "laputa-twilight" || mode === "totoro") return "twilight";
  return "night"; // laputa-midnight, howls, mononoke
}

export function EmakiBackdrop({
  phase,
}: {
  /** Dev labs: pin the slot to one phase instead of following the live palette. */
  phase?: Phase;
}) {
  if (phase) return <PhaseSlot phase={phase} />;
  return <TabSlot />;
}

/**
 * The pinned-phase slot the dev labs mount. Same four layers the tab slot paints,
 * driven by a prop rather than by `useMode`, and using the labs' own `el-*` classes
 * so a variant keeps its existing stylesheet.
 */
function PhaseSlot({ phase }: { phase: Phase }) {
  const tk = PHASES[phase];
  return (
    <>
      <div className="el-backdrop" style={{ background: tk.bg }} />
      <div
        className="el-backdrop-img"
        style={{ backgroundImage: `url('${tk.backdropImg}')` }}
      />
      <div className="el-overlay" style={{ background: tk.overlayGradient }} />
      <div className="el-ambient" style={{ background: tk.ambientWash }} />
    </>
  );
}

function TabSlot() {
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
