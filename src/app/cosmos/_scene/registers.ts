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
  /**
   * The moon's own colour, for a register that has one.
   *
   * DERIVED, not chosen. COSMOLOGY.md says the depths carry a red moon and the
   * register map has no red in it that is bright enough to hang in a sky: the
   * closest thing it holds is `fog` (#3A1C22 for the paperback), which is that
   * red at crypt value. This takes that hue and brings it to a value a light
   * source has, so the moon is the depths' own colour turned up rather than a
   * hex somebody liked. A register whose fog is not red gets a moon it will
   * never draw, which costs nothing.
   */
  moon: string;
  /** The horizon the ground dissolves into, and the FogExp2 colour. */
  fog: string;
  banding: number;
  grain: number;
  mistDensity: number;
  /**
   * WHAT HOUR THIS REGISTER IS PAINTED AT. 0 a cream page, 1 a midnight.
   *
   * The bug PG opened in bed. `KeyLight` asked `theme === "light"` and called
   * that daylight, so the OS's own light-mode default lit a register whose sky
   * is `#0e0816` with a 1.28 intensity pale-pink sun. A gouache twilight under a
   * noon key is exactly the grey-green murk he saw: full light on dark local
   * colour makes mud, and mud has no focal point in it.
   *
   * The register's own sky says what hour it was painted at, and it is the only
   * thing that ever should have. PG's light/dark toggle still moves the whole
   * picture up or down (see `themeLift`), because that is a reading preference,
   * and it can no longer turn night into day.
   */
  night: number;
  /**
   * The colour of unlit air at this hour: the sky, halfway to its own horizon.
   *
   * The one hex the night derivation hangs off. Everything that is not near a
   * flame moves toward it, which is what a painter does and what the plate does:
   * `04-twilight-shrine` has no local colour left in the far hills at all, only
   * plum, and the moss reads green because the lantern is standing on it.
   */
  air: string;
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

  /**
   * The horizon carries the register's own light in it. `fog` alone is the grey
   * of distance; a sky that meets the ground in pure grey has no hour in it. The
   * SAME hex is used for the FogExp2, the ground's haze stop and the sky's
   * bottom stop, so the seam where the plane runs out cannot be seen.
   *
   * How MUCH light depends on the register's own sky: a cream riso day carries a
   * lot of it, a paperback midnight almost none. At a flat 0.3 the depths came
   * out as a warm brown dusk instead of the near-black the red moon needs.
   */
  const skyLum = (sr * 0.299 + sg * 0.587 + sb * 0.114) / 255;
  const fog = mixHex(L.fog, L.particles, Math.min(0.34, Math.max(0.1, 0.1 + skyLum * 2.2)));

  // ── The hour, and what it does to every local colour ──────────────────────
  //
  // `night` is 0 for riso's cream page and 0.88 for the practice's twilight.
  // `air` is what the unlit world turns into: the sky, halfway to its horizon.
  const night = Math.min(1, Math.max(0, 1 - skyLum * 2.6));
  const air = mixHex(L.sky, fog, 0.5);

  /**
   * A local colour, taken to the hour.
   *
   * `pull` is how much of the air it takes on and `drop` is how far its value
   * falls, both scaled by the register's own night. Two moves rather than one
   * because they are different things: a green in plum air goes GREY-PLUM (the
   * pull) and a green at night goes DARK (the drop), and doing only the pull
   * gives the washed-out pastel round three shipped.
   */
  const atHour = (h: string, pull: number, drop: number) =>
    shade(mixHex(h, air, pull * night), -drop * night);

  /**
   * THE GROUND GOES DEEP AND PLUM, and the grass stays lighter over it.
   *
   * `#3A5B48` is a daylight forest green and `#7FA163` a spring one; they are
   * the practice's own hexes and they belong to a meadow at noon. Held at full
   * value under a `#0e0816` sky, they are the grey-green soup PG opened on his
   * phone. The ground takes most of the air and most of the drop; the grass
   * takes half of each. The GAP between them is the point: round three had the
   * ground and its cover eleven points of luminance apart, which is nothing, so
   * a meadow read as one flat wash with speckles on it. These are twenty-seven
   * apart and both sit above a fifth of a stop, which is the second half of the
   * lesson: the first pass at these numbers took the ground to 0.22 luminance
   * and the band between him and the hall went dead. Legible at night is not
   * the same as dark.
   */
  const ground = atHour(L.ground, 0.46, 0.22);
  const grass = atHour(L.grass, 0.24, 0.04);

  const stone = atHour(
    mixHex(desat(L.mist, 0.35), bright ? "#FFFFFF" : "#C8C4C0", 0.3),
    0.34,
    0.16,
  );
  /**
   * WOOD STAYS WARM. It is the only structural colour that does, and it is
   * doing the job the plate's own timber does: `04-twilight-shrine` holds one
   * warm post against a whole picture of plum, and that post is why the shrine
   * reads as shelter rather than as more rock. It takes the value drop of the
   * hour and almost none of the air.
   */
  const wood = atHour(warm(shade(L.ground, bright ? 0.1 : 0.24), 0.72), 0.1, 0.12);
  const paper = bright ? shade(desat(L.fog, 0.45), 0.72) : shade(desat(L.mist, 0.55), 0.62);
  /**
   * A FLAME IS WARM, whatever colour the air is. `particles` is the register's
   * drifting mote (sakura at twilight, foxfire at midnight, gold by day) and
   * deriving the fire straight from it lit the shrine's hearth sakura pink in
   * the first frame off this file. Every fire in every register is the particle
   * hue pulled most of the way to lamplight; the motes keep their own colour.
   *
   * AND IT GETS HOTTER AS THE HOUR GETS DARKER. Not because fire changes, but
   * because this hex is the emitter's own painted body and a lamp at midnight
   * has to be the brightest thing on the glass or the picture has no focus.
   */
  const flame = mixHex(mixHex(L.particles, "#EAA050", 0.62), "#FFB74A", 0.5 * night);

  return {
    ground,
    groundAlt: shade(ground, bright ? -0.08 : -0.14),
    grass,
    // Moonlight catches the tips. The one place a night value goes UP.
    grassTip: shade(mixHex(grass, air, 0.18 * night), bright ? 0.14 : 0.3),
    stone,
    stoneDark: shade(stone, -0.38),
    wood,
    woodDark: shade(wood, -0.34),
    // The one saturated architectural note: the particle hue at roof value.
    roof: atHour(mixHex(shade(L.particles, bright ? -0.36 : -0.52), L.mist, 0.34), 0.3, 0.16),
    foliage: shade(grass, -0.3),
    foliageDark: shade(grass, -0.52),
    trunk: shade(wood, -0.28),
    paper,
    ink: shade(L.sky, bright ? -0.62 : 0.06),
    flame,
    flameCore: shade(flame, 0.55),
    water: mixHex(L.fog, L.sky, 0.42),
    waterDeep: shade(mixHex(L.fog, L.sky, 0.72), -0.24),
    /**
     * THE MIST IS THE AIR, not a light lavender laid over it.
     *
     * `#9C86A4` sits at 0.55 of luminance and the practice's ground sat at 0.31,
     * so every metre of weather LIFTED the picture toward a flat pale band. That
     * band across the middle of the portrait frame is most of what PG saw. Mist
     * that reads as depth has to be the colour the distance already is, which is
     * the horizon, and only slightly lighter than what it veils.
     */
    mist: mixHex(L.mist, air, 0.62 * night),
    /**
     * THE KEY IS A MOON, and this is the line that fixes the murk.
     *
     * It used to be the particle hue taken almost to white: `#F5DFE9`, a pale
     * pink at 0.88 of luminance, driven at 1.28 intensity over a twilight
     * register because the OS was in light mode. Full pale light on dark local
     * colour is the definition of mud.
     *
     * At night it is the air itself lifted to moonlight: cool, violet, and
     * nowhere near white, so it models the form (a roof edge, his shoulders, the
     * rise of a hill) without arguing with the one warm thing on the glass. The
     * plate's whole engine is a warm lantern inside a cool picture; this is the
     * cool picture.
     */
    key: mixHex(
      shade(mixHex(L.particles, "#FFF0D8", 0.4), 0.5),
      shade(mixHex(air, "#C6C8EE", 0.6), 0.16),
      night,
    ),
    /** The bounce off the ground: the air, one step down. Never a grey. */
    fill: mixHex(shade(L.mist, 0.28), shade(air, 0.1), night),
    ambient: mixHex(shade(desat(L.mist, 0.3), up * 0.18), shade(air, -0.1), night),
    skyTop: L.sky,
    skyMid: mixHex(L.sky, fog, 0.42),
    skyHorizon: fog,
    skyGlow: L.particles,
    moon: vivid(L.fog),
    fog,
    night,
    air,
    banding: t.banding,
    grain: L.grain,
    mistDensity: t.air,
  };
}

/**
 * A hex at its own hue, taken to the saturation and value of something that
 * emits. Used for the moon, and nothing else.
 */
function vivid(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d > 1e-6) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + 360) % 360;
  const S = 0.7;
  const L = 0.54;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [rr, gg, bb] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(rr)}${to(gg)}${to(bb)}`;
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
