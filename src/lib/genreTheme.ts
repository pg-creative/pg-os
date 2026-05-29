/**
 * genreTheme.ts — per-genre visual theming for the music player.
 *
 * Single source of truth that turns a station's `genre` into the colors the
 * player UI needs: an accent seed, a glow, orb tints, a scene-background
 * gradient, and a warmed "gold" for kintsugi seams. Seeds are the exact colors
 * already used by GenreBadge (src/app/_components/SourceBadge.tsx) so the badge
 * and the player theme always agree.
 *
 * All derived values are HARDCODED rgba (no color-mix) for iOS WebKit safety.
 * Pure data, no React imports — safe to import anywhere.
 */

import type { MusicGenre } from "./musicSources";

export interface GenreTheme {
  /** Genre name, e.g. for a small tag. */
  label: MusicGenre;
  /** Accent hex (matches the GenreBadge color). */
  seed: string;
  /** rgba of seed at ~40% — for box-shadow glows. */
  glow: string;
  /** rgba of seed at ~78% — for orb fills. */
  orbColor: string;
  /** rgba of seed at ~38% — for orb box-shadows. */
  orbGlow: string;
  /** A genre-moody multi-stop gradient (use over a panel base). */
  sceneBg: string;
  /** Subtle genre tint for the top of a panel/overlay. */
  topTint: string;
  /** Seed warmed 60/40 toward emaki amber — for kintsugi seams. */
  gold: string;
}

export const GENRE_THEMES: Record<MusicGenre, GenreTheme> = {
  Lofi: {
    label: "Lofi",
    seed: "#E5C58A",
    glow: "rgba(229,197,138,0.40)",
    orbColor: "rgba(229,197,138,0.78)",
    orbGlow: "rgba(229,197,138,0.38)",
    sceneBg:
      "linear-gradient(158deg, rgba(229,197,138,0.55) 0%, rgba(214,160,96,0.24) 48%, rgba(150,104,52,0.08) 100%)",
    topTint: "rgba(229,197,138,0.14)",
    gold: "#D9B35E",
  },
  Chill: {
    label: "Chill",
    seed: "#8FB8D8",
    glow: "rgba(143,184,216,0.40)",
    orbColor: "rgba(143,184,216,0.78)",
    orbGlow: "rgba(143,184,216,0.38)",
    sceneBg:
      "linear-gradient(158deg, rgba(143,184,216,0.52) 0%, rgba(120,158,196,0.22) 48%, rgba(70,104,150,0.08) 100%)",
    topTint: "rgba(143,184,216,0.14)",
    gold: "#A6AB8D",
  },
  Game: {
    label: "Game",
    seed: "#7BB58F",
    glow: "rgba(123,181,143,0.40)",
    orbColor: "rgba(123,181,143,0.78)",
    orbGlow: "rgba(123,181,143,0.38)",
    sceneBg:
      "linear-gradient(158deg, rgba(123,181,143,0.52) 0%, rgba(72,140,104,0.22) 48%, rgba(28,84,56,0.10) 100%)",
    topTint: "rgba(123,181,143,0.14)",
    gold: "#9AA961",
  },
  Jazz: {
    label: "Jazz",
    seed: "#D98A6A",
    glow: "rgba(217,138,106,0.40)",
    orbColor: "rgba(217,138,106,0.78)",
    orbGlow: "rgba(217,138,106,0.38)",
    sceneBg:
      "linear-gradient(158deg, rgba(217,138,106,0.52) 0%, rgba(190,96,96,0.22) 48%, rgba(120,52,56,0.10) 100%)",
    topTint: "rgba(217,138,106,0.14)",
    gold: "#D2904B",
  },
  Ambient: {
    label: "Ambient",
    seed: "#8190C0",
    glow: "rgba(129,144,192,0.40)",
    orbColor: "rgba(129,144,192,0.78)",
    orbGlow: "rgba(129,144,192,0.38)",
    sceneBg:
      "linear-gradient(158deg, rgba(129,144,192,0.50) 0%, rgba(90,100,150,0.22) 48%, rgba(40,48,90,0.12) 100%)",
    topTint: "rgba(129,144,192,0.14)",
    gold: "#9D937E",
  },
};

/** Resolve a genre to its theme, falling back to Lofi (neutral warm gold). */
export function genreTheme(genre: MusicGenre | null | undefined): GenreTheme {
  return genre ? GENRE_THEMES[genre] : GENRE_THEMES.Lofi;
}
