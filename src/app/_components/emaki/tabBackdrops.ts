/**
 * Per-tab painted backdrop registry (cohesion pass, 2026-05-21).
 *
 * Each tab gets a DISTINCT Emaki sky composition + a prominence judgment, so the
 * whole OS sits in the painted world while staying legible. All entries use the
 * locked 3-phase sky art (emaki-sky-{day,twilight,night}_{0..3}.png), choosing a
 * different variant per tab for visual variety. "prominent" lets more sky show
 * (calm tabs); "subtle" dims it heavily behind a scrim (data-dense tabs).
 *
 * NOTE: bespoke per-tab scenes (a unique painting per surface) are the upgrade
 * once the image pipeline (Legnext/MJ key) is available; the variant index is the
 * stand-in differentiator until then. "home" returns null because TopBarHome
 * paints its own backdrop.
 */

import type { Phase } from "./theme";

export type Prominence = "subtle" | "prominent";

export interface TabBackdrop {
  /** Which emaki-sky variant (0..3) this tab uses. */
  variant: 0 | 1 | 2 | 3;
  prominence: Prominence;
}

// Keyed by the tab id from useActiveTab(). "home" intentionally omitted.
const REGISTRY: Record<string, TabBackdrop> = {
  cockpit: { variant: 0, prominence: "prominent" },
  habits: { variant: 1, prominence: "prominent" },
  flow: { variant: 3, prominence: "prominent" },
  timeline: { variant: 3, prominence: "subtle" },
  projects: { variant: 2, prominence: "subtle" },
  claude: { variant: 1, prominence: "subtle" },
  stack: { variant: 2, prominence: "subtle" },
  brain: { variant: 0, prominence: "subtle" },
};

export function backdropForTab(tab: string): TabBackdrop | null {
  return REGISTRY[tab] ?? null;
}

/** Resolve the sky image path for a tab's variant in the current phase. */
export function backdropImage(phase: Phase, variant: number): string {
  return `/art/aesthetic-2026-05-20/emaki-sky-${phase}_${variant}.png`;
}
