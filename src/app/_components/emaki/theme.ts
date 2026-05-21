/**
 * Emaki x Laputa — Phase Token System
 * LOCKED direction: 2026-05-20. See research lock at:
 * ~/.claude/research/pgos-aesthetic-lock-2026-05.md
 *
 * Single source of truth for all 3 time-of-day palettes.
 * Import { PHASES, Phase, phaseForHour } into any surface
 * that needs the painted-world aesthetic.
 *
 * Luminance-aware CSS vars (--panel-blur, --hero-halo) are
 * applied via useEmakiVars() in materials.tsx:
 *   day    : --panel-blur = none, --hero-halo = none
 *   night  : --panel-blur = blur(10px), --hero-halo = heavy dark shadow
 *   twilight: same as night
 */

export type Phase = "night" | "twilight" | "day";

export interface PhaseTokens {
  backdropImg: string;
  bg: string;
  railBg: string;
  railBorder: string;
  panelBg: string;
  panelBorder: string;
  panelInkBorder: string;
  panelTint: string;
  textPrimary: string;
  textSub: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  gold: string;
  heroHalo: string;
  panelShadow: string;
  goldBright: string;
  foxfire: string;
  foxfireGlow: string;
  orbColor: string;
  orbGlow: string;
  divider: string;
  ctaBg: string;
  ctaBorder: string;
  ctaText: string;
  overlayGradient: string;
  ambientWash: string;
  eyebrow: string;
  eyebrowText: string;
  pillActive: string;
  pillInactive: string;
  pillTextActive: string;
  pillTextInactive: string;
  toggleBg: string;
  phaseName: string;
  eyebrowLabel: string;
  kanji: string;
  subtitle: string;
}

export const PHASES: Record<Phase, PhaseTokens> = {
  night: {
    backdropImg: "/art/aesthetic-2026-05-20/emaki-sky-night_0.png",
    /* Deep warm ink, not cold black */
    bg: "#0a0806",
    railBg: "rgba(12,9,7,0.94)",
    railBorder: "rgba(210,168,80,0.35)",
    /* Washi paper: warm dark amber tint */
    panelBg: "rgba(22,16,8,0.90)",
    panelBorder: "rgba(210,168,80,0.20)",
    panelInkBorder: "rgba(210,168,80,0.55)",
    panelTint: "rgba(180,130,40,0.04)",
    textPrimary: "#EFE4C8",
    textSub: "#B8A882",
    textMuted: "#B0A075",
    /* Accent: warm amber / foxfire gold, NOT teal */
    accent: "#E8A840",
    accentDim: "#A06C18",
    gold: "#C8981C",
    heroHalo: "0 0 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,1)",
    panelShadow: "none",
    goldBright: "#EFC040",
    foxfire: "#F0C060",
    foxfireGlow: "#E8A020",
    orbColor: "rgba(240,192,96,0.80)",
    orbGlow: "rgba(232,160,32,0.50)",
    divider: "rgba(210,168,80,0.22)",
    ctaBg: "rgba(232,168,64,0.10)",
    ctaBorder: "rgba(232,168,64,0.45)",
    ctaText: "#F0C060",
    overlayGradient:
      "linear-gradient(180deg, rgba(10,8,6,0.56) 0%, rgba(10,8,6,0.10) 30%, rgba(10,8,6,0.50) 72%, rgba(10,8,6,0.97) 100%)",
    ambientWash:
      "radial-gradient(ellipse at 28% 100%, rgba(232,168,48,0.12) 0%, transparent 60%), radial-gradient(ellipse at 72% 100%, rgba(200,152,28,0.08) 0%, transparent 55%)",
    eyebrow: "rgba(210,168,80,0.80)",
    eyebrowText: "#C8981C",
    pillActive: "rgba(232,168,64,0.18)",
    pillInactive: "rgba(12,9,7,0.5)",
    pillTextActive: "#F0C060",
    pillTextInactive: "#B0A075",
    toggleBg: "rgba(18,13,8,0.86)",
    phaseName: "Night",
    eyebrowLabel: "Late night · Kitsu watches the fleet by foxfire",
    kanji: "狐火の道",
    subtitle: "The Foxfire Path",
  },
  twilight: {
    backdropImg: "/art/aesthetic-2026-05-20/emaki-sky-twilight_0.png",
    /* Deeper indigo base, not gray/muddy */
    bg: "#0e0816",
    railBg: "rgba(18,10,26,0.92)",
    railBorder: "rgba(210,130,170,0.28)",
    /* Washi: subtle plum/rose tint */
    panelBg: "rgba(28,14,38,0.90)",
    panelBorder: "rgba(210,130,170,0.22)",
    panelInkBorder: "rgba(210,130,170,0.50)",
    panelTint: "rgba(160,80,130,0.04)",
    textPrimary: "#F4E8F8",
    textSub: "#C8A8D8",
    textMuted: "#C0A8D0",
    /* Cleaner rose, no muddy orange contamination */
    accent: "#E0A0D0",
    accentDim: "#A05888",
    gold: "#C88840",
    heroHalo: "0 0 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,1)",
    panelShadow: "none",
    goldBright: "#EAA050",
    foxfire: "#F0B0E0",
    foxfireGlow: "#E060C0",
    orbColor: "rgba(240,176,224,0.80)",
    orbGlow: "rgba(224,96,192,0.45)",
    divider: "rgba(200,136,64,0.22)",
    ctaBg: "rgba(224,160,208,0.08)",
    ctaBorder: "rgba(224,160,208,0.40)",
    ctaText: "#F0B0E0",
    overlayGradient:
      "linear-gradient(180deg, rgba(14,8,22,0.52) 0%, rgba(14,8,22,0.08) 30%, rgba(14,8,22,0.52) 72%, rgba(14,8,22,0.97) 100%)",
    ambientWash:
      "radial-gradient(ellipse at 32% 100%, rgba(224,96,192,0.11) 0%, transparent 60%), radial-gradient(ellipse at 68% 100%, rgba(200,136,64,0.10) 0%, transparent 55%)",
    eyebrow: "rgba(200,136,64,0.85)",
    eyebrowText: "#C88840",
    pillActive: "rgba(224,160,208,0.18)",
    pillInactive: "rgba(18,10,26,0.5)",
    pillTextActive: "#F0B0E0",
    pillTextInactive: "#C0A8D0",
    toggleBg: "rgba(22,12,32,0.86)",
    phaseName: "Twilight",
    eyebrowLabel: "Dusk settling · Kitsu tends the embers",
    kanji: "黄昏の刻",
    subtitle: "The Twilight Hour",
  },
  day: {
    backdropImg: "/art/aesthetic-2026-05-20/emaki-sky-day_0.png",
    /* Warm parchment base */
    bg: "#e8ddc8",
    railBg: "rgba(250,244,232,0.98)",
    railBorder: "rgba(140,100,30,0.40)",
    /* Crisp washi cards: nearly opaque, clearly defined */
    panelBg: "rgba(252,248,240,0.97)",
    panelBorder: "rgba(140,100,30,0.38)",
    panelInkBorder: "rgba(110,72,12,0.70)",
    panelTint: "rgba(200,152,40,0.05)",
    /* Deep warm ink: aim 7:1+ on cream panel surface */
    textPrimary: "#120d04",
    textSub: "#2e2008",
    textMuted: "#4a3410",
    /* Richer emerald accent for real contrast on light bg */
    accent: "#1a5c3a",
    accentDim: "#0e3d24",
    gold: "#8c5c08",
    goldBright: "#b87818",
    foxfire: "#145830",
    foxfireGlow: "#0c4020",
    heroHalo: "none",
    panelShadow:
      "0 2px 12px rgba(120,80,10,0.14), 0 1px 4px rgba(120,80,10,0.10)",
    orbColor: "rgba(20,88,48,0.65)",
    orbGlow: "rgba(12,64,32,0.32)",
    divider: "rgba(140,92,12,0.28)",
    ctaBg: "rgba(20,88,48,0.12)",
    ctaBorder: "rgba(20,88,48,0.55)",
    ctaText: "#0a2e18",
    /* Golden-hour warmth wash + gentle edge vignette */
    overlayGradient:
      "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 38%, transparent 74%, rgba(96,124,156,0.18) 100%), radial-gradient(ellipse at 50% 108%, rgba(80,112,150,0.14) 0%, transparent 58%)",
    ambientWash: "none",
    eyebrow: "rgba(140,92,12,0.90)",
    eyebrowText: "#7a4c08",
    pillActive: "rgba(20,88,48,0.18)",
    pillInactive: "rgba(250,244,232,0.70)",
    pillTextActive: "#0e3d24",
    pillTextInactive: "#4a3410",
    toggleBg: "rgba(248,242,228,0.96)",
    phaseName: "Day",
    eyebrowLabel: "Golden hour · Kitsu rests in the sun",
    kanji: "陽光の庭",
    subtitle: "The Golden Garden",
  },
};

/**
 * Derive the current Phase from an hour (0-23).
 * Mirrors the useEffect in the prototype page.
 *   6-17  -> day
 *   18-20 -> twilight
 *   else  -> night
 */
export function phaseForHour(h: number): Phase {
  if (h >= 6 && h < 18) return "day";
  if (h >= 18 && h < 21) return "twilight";
  return "night";
}
