import { scholarStudy } from "./scholar-study";
import { skyWorld } from "./sky-world";
import { kodamaGrove } from "./kodama-grove";
import { scriptorium } from "./scriptorium";
import { midnightGospel } from "./midnight-gospel";
import { uxTable, uxSwipe, uxMap, uxChat, uxTimeline } from "./ux-neutral";
import type { BrainTheme } from "../shared/ThemeAssets";

export const UX_VARIANTS: BrainTheme[] = [
  uxTable,
  uxSwipe,
  uxMap,
  uxChat,
  uxTimeline,
];

export const AESTHETIC_VARIANTS: BrainTheme[] = [
  scholarStudy,
  skyWorld,
  kodamaGrove,
  scriptorium,
  midnightGospel,
];

export const THEMES: BrainTheme[] = [...UX_VARIANTS, ...AESTHETIC_VARIANTS];

export const THEME_BY_ID: Record<string, BrainTheme> = Object.fromEntries(
  THEMES.map((t) => [t.id, t]),
);

export const DEFAULT_THEME = uxTable;
