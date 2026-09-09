"use client";

/**
 * EmakiBackdrop — global painted-sky layer (cohesion pass, 2026-05-21).
 *
 * Renders the per-tab Emaki sky behind the whole app at z-index 0 (above the
 * body fallback, below .particles (z1) and .shell (z2)). The sky shows through
 * panel gaps and margins, so data-dense tabs stay legible (heavier scrim) while
 * calm tabs feel more immersive (lighter scrim). Phase follows the live palette.
 *
 * WORLD MODE (cosmos, 2026-09-09). This one component owns the fixed inset-0 z0
 * slot on EVERY route, per plan 7h D7: "One component owns the slot on every
 * route: EmakiBackdrop gains a `world` mode keyed by the same registry."
 * PaintedBackdrop, the quadruple-stacked sky that backdrop-lab diagnosed as "a
 * double-image smear, not parallax", is deleted in the same commit rather than
 * left alongside as a fourth system.
 *
 * In world mode the slot paints in three steps so the first frame is never
 * empty and never a flash of the wrong palette:
 *   1. the phase gradient as a plain CSS background, before any network work
 *   2. the inline 32 px LQIP, which travels in the HTML and costs no round trip
 *   3. hero.webp, then the WebGL canvas fading in over 600 ms
 * The canvas arrives as `children`, so the scene never mounts its own slot.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useMode } from "../ModeProvider";
import { useActiveTab } from "../useActiveTab";
import { PHASES, type Phase } from "./theme";
import { backdropForTab, backdropImage } from "./tabBackdrops";

function phaseForMode(mode: string): Phase {
  if (mode === "laputa-day") return "day";
  if (mode === "laputa-twilight" || mode === "totoro") return "twilight";
  return "night"; // laputa-midnight, howls, mononoke
}

export interface WorldBackdrop {
  /** Pinned per world for round one, not computed from the hour. */
  phase: Phase;
  /** Extensionless asset URL for the 2048 px still. */
  hero: string;
  /** Inline data URI, 32 px wide. Present in the HTML, so it paints instantly. */
  lqip: string | null;
  /** Sky hexes from the world's register preset, used before the plate loads. */
  sky: { top: string; mid: string; horizon: string };
}

/** The 600 ms the OS already uses for a backdrop change. */
const FADE_MS = 600;

export function EmakiBackdrop({
  world,
  children,
}: {
  world?: WorldBackdrop;
  children?: ReactNode;
}) {
  return world ? (
    <WorldSlot world={world}>{children}</WorldSlot>
  ) : (
    <TabSlot />
  );
}

function WorldSlot({
  world,
  children,
}: {
  world: WorldBackdrop;
  children?: ReactNode;
}) {
  const [heroReady, setHeroReady] = useState(false);
  const tk = PHASES[world.phase];

  useEffect(() => {
    const img = new Image();
    img.onload = () => setHeroReady(true);
    // A missing plate must not leave the slot stuck on the LQIP forever.
    img.onerror = () => setHeroReady(true);
    img.src = world.hero;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [world.hero]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        // Step 1. Paints on the first frame, before any image request.
        background: `linear-gradient(180deg, ${world.sky.top} 0%, ${world.sky.mid} 52%, ${world.sky.horizon} 100%)`,
      }}
    >
      {/* Step 2. Inline LQIP, blurred up. */}
      {world.lqip && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("${world.lqip}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(28px)",
            transform: "scale(1.08)",
            opacity: heroReady ? 0 : 1,
            transition: `opacity ${FADE_MS}ms ease`,
          }}
        />
      )}
      {/* Step 3. The still plate. The canvas fades in over it. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${world.hero}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: heroReady ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      />
      {/* The scene. pointerEvents come back on so dwell can reach the objects. */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>
        {children}
      </div>
      {/* Phase-tinted floor wash, the same overlay the tabs use, at half weight:
          the world is the subject here, not a surface behind panels. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: tk.ambientWash,
          opacity: 0.5,
        }}
      />
    </div>
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
