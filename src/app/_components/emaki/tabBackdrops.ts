/**
 * Per-tab painted backdrop registry (bespoke art, 2026-05-21).
 *
 * Each tab now has its OWN painted scene generated per phase via Legnext/MJ
 * (scripts/gen-tab-art.py), saved at /art/tabs/<tab>-<phase>.png. The 3-phase
 * day/twilight/night system is preserved (one image per phase per tab).
 *
 * prominence: "prominent" lets more sky show (calm tabs); "subtle" dims it
 * harder behind a scrim so data-dense tabs stay legible.
 */

import type { Phase } from "./theme";

export type Prominence = "subtle" | "prominent";

export interface TabBackdrop {
  prominence: Prominence;
}

// Keyed by the tab id from useActiveTab(). Every tab has bespoke 3-phase art.
const REGISTRY: Record<string, TabBackdrop> = {
  home: { prominence: "prominent" },
  cockpit: { prominence: "prominent" },
  habits: { prominence: "prominent" },
  flow: { prominence: "subtle" },
  projects: { prominence: "subtle" },
  claude: { prominence: "subtle" },
  stack: { prominence: "subtle" },
  timeline: { prominence: "subtle" },
  brain: { prominence: "subtle" },
};

export function backdropForTab(tab: string): TabBackdrop | null {
  return REGISTRY[tab] ?? null;
}

/** Resolve the bespoke painted scene for a tab in the current phase. */
export function backdropImage(phase: Phase, tab: string): string {
  return `/art/tabs/${tab}-${phase}.png`;
}
