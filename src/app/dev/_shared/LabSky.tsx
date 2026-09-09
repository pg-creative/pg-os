"use client";

/**
 * LabSky — the single-plate sky for the cockpit bake-off variants.
 *
 * EXTENDS: `_components/emaki/EmakiBackdrop.tsx`, the one component that owns the
 * fixed inset-0 z0 slot on every real route. This is its dev-lab equivalent: same
 * recipe (one sky plate, one phase overlay, one ambient wash), no route context
 * needed, because a bake-off variant takes `phase` as a prop rather than reading
 * the live palette.
 *
 * It replaces PaintedBackdrop, deleted 2026-09-09. That component stacked the same
 * image four times at 0.06 to 0.2 opacity and moved the copies at different rates,
 * which `/dev/backdrop-lab` diagnosed as "a double-image smear, not parallax": the
 * ratio between rates is the depth cue, and opacity cannot fake it. Real parallax
 * now lives in the cosmos scene, on separated planes at real depth.
 */

import { PHASES, type Phase } from "../../_components/emaki/theme";

export function LabSky({ phase }: { phase: Phase }) {
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
