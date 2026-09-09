/**
 * The scene manifest: the only thing that crosses from server to client.
 *
 * EXTENDS: `_components/emaki/tabBackdrops.ts`, the registry that already proves a
 * new surface is a data entry rather than a code change. Same idea, one level up:
 * a second world is a folder in the vault plus a line in worlds.yml, and nothing
 * in `_scene/` learns its name.
 *
 * Ids, geometry and asset URLs only. Prose is rendered by the server component
 * straight into the DOM panel, never shipped as data, because `/_next` chunks are
 * served unauthenticated while `/cosmos` is not.
 */

import type { ScenePreset } from "../../../lib/cosmos/vault";

export interface ObjectSpec {
  id: string;
  /** Shown as troika text under the object. Titles are not prose. */
  title: string;
  type: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  spin: number;
  /** 0 = touched today, 1 = never touched. Drives the mist on this object. */
  untouched: number;
  plate: string | null;
}

export interface MonumentSpec {
  id: string;
  date: string;
  x: number;
  y: number;
  z: number;
  scale: number;
}

export interface SceneManifest {
  worldId: string;
  title: string;
  register: string;
  /** Pinned to the plate for round one, not computed from the hour. */
  phase: "day" | "twilight" | "night";
  preset: ScenePreset;
  hero: string;
  /** Same subject, same register, a second painter. Null when a world has one. */
  heroAlt: string | null;
  lqip: string | null;
  frames: string[];
  /** Frames per second the sequence was cut at. Scrub maps progress to index. */
  frameRate: number;
  objects: ObjectSpec[];
  monuments: MonumentSpec[];
  /** Sky, mist density and particle count only. No threshold, no streak, no grade. */
  weather: {
    recovery: number | null;
    pages_days_ago: number | null;
    days_since_ship: number | null;
    sky: string | null;
    season_day: number | null;
  };
  drafts: boolean;
}
