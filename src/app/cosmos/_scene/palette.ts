/**
 * Every colour in the world, from PHASES and nowhere else.
 *
 * EXTENDS: `_components/emaki/theme.ts`. The registers do not invent hexes; they
 * arrange the ones the OS already uses, so the cosmos and the dashboard read as
 * one hand. Where a register needs a value PHASES has no name for (bare stone,
 * wet slate, pine), it is derived from a PHASES hex by hand and said so here.
 *
 * A register is a whole biome's grammar: sky, ground, ink, and what a flame
 * looks like inside it. Switching biome switches this record and nothing else.
 */

import { PHASES } from "../../_components/emaki/theme";
import type { Register } from "./contract";

export interface Palette {
  /** The ground itself. */
  ground: string;
  groundAlt: string;
  /** Cut stone: paths, steps, lantern bodies, monuments. */
  stone: string;
  stoneDark: string;
  /** Structural timber: posts, torii, docks, boats. */
  wood: string;
  woodDark: string;
  /** Roofs and awnings. The one saturated architectural note. */
  roof: string;
  foliage: string;
  foliageDark: string;
  trunk: string;
  /** Cream paper: page objects, the plaque a title sits on. */
  paper: string;
  ink: string;
  /** A lit flame and the light it throws. One hex, two jobs. */
  flame: string;
  flameCore: string;
  water: string;
  waterDeep: string;
  /** The mist that eats the borders. */
  mist: string;
  /** Directional key light and the hemisphere fill under it. */
  key: string;
  fill: string;
  ambient: string;
  /** Sky ramp: three stops plus one low sun. */
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  skyGlow: string;
  /** Riso posterizes to flat ink steps; every other register is 0. */
  banding: number;
  grain: number;
  mistDensity: number;
}

const twilight = PHASES.twilight;
const day = PHASES.day;
const night = PHASES.night;

export const PALETTES: Record<Register, Palette> = {
  /**
   * Painted gouache at twilight. The quiet practice, the home base. Every hex is
   * a literal PHASES.twilight or PHASES.day value: plum, sakura, gold.
   */
  painted: {
    ground: "#3A5B48", // day accent #1a5c3a lifted toward the plum air
    groundAlt: "#4E6A54",
    stone: "#B3AFAC",
    stoneDark: "#76727A",
    wood: "#9C7C5E",
    woodDark: "#6B5340",
    // Not twilight.accentDim (#A05888): at roof scale that hex is a hot magenta
    // slab and it eats the frame. A slate carrying the same plum, half as loud.
    roof: "#5E3F52",
    foliage: "#2E5540",
    foliageDark: "#1E3A2C",
    trunk: "#5A4436",
    paper: "#EFE2C6",
    ink: "#2A2233",
    flame: twilight.goldBright, // #EAA050
    flameCore: "#FFE2B0",
    water: "#4A5E80",
    waterDeep: "#26324A",
    // Not twilight.textSub (#C8A8D8): as a fullscreen air colour that pale lilac
    // turns the whole frame to candy floss. The same plum with the chroma pulled
    // out, so distance reads as distance.
    mist: "#9C86A4",
    key: "#F0C8A0",
    fill: twilight.accent, // #E0A0D0
    ambient: "#6A5878",
    skyTop: twilight.bg, // #0e0816
    skyMid: "#3b1f4a",
    skyHorizon: twilight.accent,
    skyGlow: twilight.goldBright,
    banding: 0,
    grain: 0.055,
    mistDensity: 0.42,
  },

  /**
   * Riso: cream paper, three inks, halftone, no gradients. The ordinary sacred
   * by day. Banding 1 posterizes the sky and the ramp into flat steps.
   */
  riso: {
    ground: "#E0D3B2",
    groundAlt: "#D2C29C",
    stone: "#E2D8C2",
    stoneDark: "#A89878",
    wood: day.gold, // #8c5c08
    woodDark: "#5E3A06",
    roof: "#B0521E",
    foliage: day.accent, // #1a5c3a
    foliageDark: day.accentDim, // #0e3d24
    trunk: "#7A5A28",
    paper: "#FCF8F0",
    ink: day.textPrimary, // #120d04
    flame: day.goldBright, // #b87818
    flameCore: "#F4D488",
    water: "#7EA0B0",
    waterDeep: "#4A7288",
    mist: "#D8C8A8",
    key: "#FFF3D8",
    fill: "#BFD8E4",
    ambient: "#C8B894",
    skyTop: "#ECE2CE",
    skyMid: "#E4D2B4",
    skyHorizon: "#D8BE94",
    skyGlow: day.gold,
    banding: 1,
    grain: 0.18,
    mistDensity: 0.16,
  },

  /** Ink-wash: teal-black and one golden light. The party. */
  watercolor: {
    ground: "#1E4A48",
    groundAlt: "#255450",
    stone: "#8FB0AC",
    stoneDark: "#456260",
    wood: "#6B5138",
    woodDark: "#3E2E20",
    roof: "#3E6260",
    foliage: "#2A6058",
    foliageDark: "#173C38",
    trunk: "#3E2E20",
    paper: "#E8E2D0",
    ink: "#0B2226",
    flame: "#E8C066",
    flameCore: "#FFEBC0",
    water: "#20585C",
    waterDeep: "#0B2A2E",
    mist: "#7FB3AC",
    key: "#F0DCA0",
    fill: "#8FC8BC",
    ambient: "#26504E",
    skyTop: "#06181c",
    skyMid: "#0b2a2e",
    skyHorizon: "#1c4a48",
    skyGlow: "#E8C066",
    banding: 0,
    grain: 0.03,
    mistDensity: 0.36,
  },

  /** Dark paperback: one red moon, heavy grain, midnight only. The depths. */
  paperback: {
    ground: "#31262B",
    groundAlt: "#3A2C31",
    stone: "#4A3E42",
    stoneDark: "#241C20",
    wood: "#4A3428",
    woodDark: "#2A1C16",
    roof: "#3A2228",
    foliage: "#2A2A26",
    foliageDark: "#1A1A18",
    trunk: "#2A1C16",
    paper: "#CEC2AE",
    ink: "#0B0810",
    flame: night.foxfire, // #F0C060
    flameCore: "#FFE8B8",
    water: "#1C1418",
    waterDeep: "#0A0810",
    mist: "#3a2028",
    key: "#C08050",
    fill: "#A02028",
    ambient: "#3A2830",
    skyTop: "#07060a",
    skyMid: "#150a10",
    skyHorizon: "#2a1016",
    skyGlow: "#A02028",
    banding: 0,
    grain: 0.14,
    mistDensity: 0.8,
  },
};

export function paletteFor(register: string | null | undefined): Palette {
  if (register && register in PALETTES) return PALETTES[register as Register];
  return PALETTES.painted;
}

/**
 * Blend two palettes. The border between biomes is a band, not a line: crossing
 * it moves every material through the mist rather than snapping the world to a
 * new register, which is what "borders are mist" has to mean on screen.
 */
export function mixPalettes(a: Palette, b: Palette, t: number): Palette {
  const k = Math.min(Math.max(t, 0), 1);
  const out = {} as Palette;
  for (const key of Object.keys(a) as (keyof Palette)[]) {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") {
      (out[key] as number) = av + (bv - av) * k;
    } else {
      (out[key] as string) = mixHex(av as string, bv as string, k);
    }
  }
  return out;
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}
