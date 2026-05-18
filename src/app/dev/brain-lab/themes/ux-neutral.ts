import type { BrainTheme } from "../shared/ThemeAssets";

const NEUTRAL_PALETTE = {
  bg: "#fafaf8",
  surface: "#ffffff",
  surfaceAlt: "#f4f3ef",
  ink: "#1a1815",
  inkMuted: "#6b6760",
  accent: "#1e40af",
  accent2: "#b8770d",
  line: "rgba(26, 24, 21, 0.08)",
  tierHigh: "#7a1830",
  tierMid: "#b8770d",
  tierLow: "#2a5a7a",
  tierKill: "#9a958c",
};

const NEUTRAL_FONTS = {
  display:
    '"Inter Tight", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", Menlo, monospace',
  cssImports: [
    "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
  ],
};

const SHARED_MOTION = { transitionMs: 200, hoverLift: "translateY(-1px)" };
const NO_AUDIO = { pixabayLoopUrl: null, spotifyEmbedUrl: null };
const NO_HERO = { paths: [] };

function uxTheme(id: string, name: string, tagline: string): BrainTheme {
  return {
    id,
    name,
    tagline,
    palette: NEUTRAL_PALETTE,
    fonts: NEUTRAL_FONTS,
    hero: NO_HERO,
    audio: NO_AUDIO,
    motion: SHARED_MOTION,
  };
}

export const uxTable = uxTheme(
  "table",
  "Scan Table",
  "Linear-style dense grid — column sort, keyboard triage, inline mutate",
);

export const uxSwipe = uxTheme(
  "swipe",
  "Swipe Deck",
  "One card at a time — drag or arrow-key per decision",
);

export const uxMap = uxTheme(
  "map",
  "Spatial Map",
  "Pan / zoom canvas — nodes cluster by tag, size = score",
);

export const uxChat = uxTheme(
  "chat",
  "Chat Query",
  "Search-first — hero input, citation-style results, follow-up chips",
);

export const uxTimeline = uxTheme(
  "timeline",
  "Timeline Feed",
  "Chronological scroll — day dividers, what's new since last look",
);
