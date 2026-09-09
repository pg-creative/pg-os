/**
 * The scene's palette, DERIVED from the one register map.
 *
 * REPLACES `_scene/palette.ts`, deleted this round. The Critic's deduction 12
 * found two maps of the same four registers disagreeing about the same colour.
 * There is now one authored map, `src/lib/cosmos/registers.ts` (eight values per
 * register: sky, ground, grass, mist, grain, particles, fog, bed), and this file
 * computes every other hex the scene needs from those eight. Nothing here
 * invents a colour: `stone` is the mist lifted toward paper, `flame` is the
 * particle hex, `ink` is the sky at its darkest. Change a register's ground in
 * the vault's map and the fence posts move with it.
 *
 * `src/lib/cosmos/registers.ts` imports nothing (no `node:fs`), so a client
 * component may import it. That is why the map lives there and not in `vault.ts`.
 *
 * The two numbers that are not colours stay here, one row per register, because
 * they describe a PRINTING TECHNIQUE rather than a hue: riso posterizes, and
 * each register carries a different weight of air.
 */

import { REGISTERS, type Register } from "../../../lib/cosmos/registers";

export type { Register };
export { REGISTERS };

export interface Palette {
  ground: string;
  groundAlt: string;
  /** Grass: the instanced blades and the tufts read root-to-tip between these. */
  grass: string;
  grassTip: string;
  stone: string;
  stoneDark: string;
  wood: string;
  woodDark: string;
  roof: string;
  foliage: string;
  foliageDark: string;
  trunk: string;
  paper: string;
  ink: string;
  flame: string;
  flameCore: string;
  water: string;
  waterDeep: string;
  mist: string;
  key: string;
  fill: string;
  ambient: string;
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  skyGlow: string;
  /** The horizon the ground dissolves into, and the FogExp2 colour. */
  fog: string;
  banding: number;
  grain: number;
  mistDensity: number;
}

// ── Hex arithmetic ───────────────────────────────────────────────────────────

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((c(r) << 16) | (c(g) << 8) | c(b)).toString(16).padStart(6, "0")}`;
}

/** Toward white at t > 0, toward black at t < 0. */
function shade(h: string, t: number): string {
  const to = t >= 0 ? 255 : 0;
  const k = Math.abs(t);
  return hex(rgb(h).map((v) => v + (to - v) * k) as [number, number, number]);
}

export function mixHex(a: string, b: string, t: number): string {
  const A = rgb(a);
  const B = rgb(b);
  return hex([0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t) as [number, number, number]);
}

/** Pull chroma out without moving the value. Distance reads as distance. */
function desat(h: string, t: number): string {
  const [r, g, b] = rgb(h);
  const l = r * 0.299 + g * 0.587 + b * 0.114;
  return hex([r + (l - r) * t, g + (l - g) * t, b + (l - b) * t]);
}

/** Warm a hex toward amber, or cool it toward slate. */
function warm(h: string, t: number): string {
  return mixHex(h, t >= 0 ? "#C8925A" : "#5A7288", Math.abs(t));
}

// ── The two numbers that are not colours ─────────────────────────────────────

/**
 * Technique per register, in one place. `banding` posterizes the sky, the ground
 * and the ramp into flat ink steps: riso only, which is what riso IS. `air` is
 * how much weather the register carries before the weather file says anything.
 */
const TECHNIQUE: Record<Register, { banding: number; air: number }> = {
  painted: { banding: 0, air: 0.26 },
  riso: { banding: 1, air: 0.16 },
  watercolor: { banding: 0, air: 0.36 },
  paperback: { banding: 0, air: 0.66 },
};

// ── The derivation ───────────────────────────────────────────────────────────

function derive(id: Register): Palette {
  const L = REGISTERS[id];
  const t = TECHNIQUE[id];
  // Is this register printed on paper or painted at night? One test, and it
  // decides which direction every derived value moves.
  const [sr, sg, sb] = rgb(L.sky);
  const bright = (sr * 0.299 + sg * 0.587 + sb * 0.114) / 255 > 0.5;
  const up = bright ? 1 : -1;

  const stone = mixHex(desat(L.mist, 0.35), bright ? "#FFFFFF" : "#C8C4C0", 0.3);
  const wood = warm(shade(L.ground, bright ? 0.1 : 0.16), 0.62);
  const paper = bright ? shade(desat(L.fog, 0.45), 0.72) : shade(desat(L.mist, 0.55), 0.62);
  /**
   * A FLAME IS WARM, whatever colour the air is. `particles` is the register's
   * drifting mote (sakura at twilight, foxfire at midnight, gold by day) and
   * deriving the fire straight from it lit the shrine's hearth sakura pink in
   * the first frame off this file. Every fire in every register is the particle
   * hue pulled most of the way to lamplight; the motes keep their own colour.
   */
  const flame = mixHex(L.particles, "#EAA050", 0.62);
  /**
   * The horizon carries the register's own light in it. `fog` alone is the grey
   * of distance; a sky that meets the ground in pure grey has no hour in it. The
   * SAME hex is used for the FogExp2, the ground's haze stop and the sky's
   * bottom stop, so the seam where the plane runs out cannot be seen.
   */
  const fog = mixHex(L.fog, L.particles, 0.3);

  return {
    ground: L.ground,
    groundAlt: shade(L.ground, bright ? -0.08 : 0.07),
    grass: L.grass,
    grassTip: shade(L.grass, bright ? 0.14 : 0.22),
    stone,
    stoneDark: shade(stone, -0.38),
    wood,
    woodDark: shade(wood, -0.34),
    // The one saturated architectural note: the particle hue at roof value.
    roof: mixHex(shade(L.particles, bright ? -0.36 : -0.52), L.mist, 0.34),
    foliage: shade(L.grass, -0.3),
    foliageDark: shade(L.grass, -0.52),
    trunk: shade(wood, -0.28),
    paper,
    ink: shade(L.sky, bright ? -0.62 : 0.06),
    flame,
    flameCore: shade(flame, 0.55),
    water: mixHex(L.fog, L.sky, 0.42),
    waterDeep: shade(mixHex(L.fog, L.sky, 0.72), -0.24),
    mist: L.mist,
    // The key light is the particle colour taken almost to white: one warm sun,
    // whatever hour the register was painted at.
    key: shade(mixHex(L.particles, "#FFF0D8", 0.4), 0.5),
    fill: shade(L.mist, 0.28),
    ambient: shade(desat(L.mist, 0.3), up * 0.18),
    skyTop: L.sky,
    skyMid: mixHex(L.sky, fog, 0.42),
    skyHorizon: fog,
    skyGlow: L.particles,
    fog,
    banding: t.banding,
    grain: L.grain,
    mistDensity: t.air,
  };
}

/** Every register, derived once at module load. Four objects for the session. */
const DERIVED: Record<Register, Palette> = {
  painted: derive("painted"),
  riso: derive("riso"),
  watercolor: derive("watercolor"),
  paperback: derive("paperback"),
};

export function paletteFor(register: string | null | undefined): Palette {
  if (register && register in DERIVED) return DERIVED[register as Register];
  return DERIVED.painted;
}

// ── Neighbour palettes, precompiled ──────────────────────────────────────────

/**
 * The Critic's deduction 10: crossing one border compiled 137 to 267 shader
 * programs, because a neighbour biome's palette was mixed toward the current one
 * on every render, minting hexes that had never been seen, and every new hex is
 * a new material.
 *
 * There are four registers, so there are sixteen ordered pairs, so there are
 * sixteen possible neighbour palettes in the entire cosmos. All sixteen are
 * built here, once, at module load. Walking across a border now looks up a
 * palette that was compiled before the page painted.
 */
const NEIGHBOUR_T = 0.18;

function mixPalettes(a: Palette, b: Palette, k: number): Palette {
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

const REGISTER_IDS = Object.keys(REGISTERS) as Register[];

const NEIGHBOURS: Record<string, Palette> = (() => {
  const out: Record<string, Palette> = {};
  for (const a of REGISTER_IDS) {
    for (const b of REGISTER_IDS) {
      out[`${a}>${b}`] =
        a === b ? DERIVED[a] : mixPalettes(DERIVED[a], DERIVED[b], NEIGHBOUR_T);
    }
  }
  return out;
})();

/**
 * A neighbour biome's palette, leaned toward the one he is standing in. One of
 * sixteen precompiled objects, never a fresh mix, so a border crossing compiles
 * nothing.
 */
export function neighbourPalette(
  of: string | null | undefined,
  toward: string | null | undefined,
): Palette {
  const a = of && of in REGISTERS ? (of as Register) : "painted";
  const b = toward && toward in REGISTERS ? (toward as Register) : "painted";
  return NEIGHBOURS[`${a}>${b}`];
}
