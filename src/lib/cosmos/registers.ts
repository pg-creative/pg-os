/**
 * The one register map. Every hex in the cosmos starts here.
 *
 * The Critic's deduction 12: `SCENE_PRESETS` in `vault.ts` and `PALETTES` in
 * `_scene/palette.ts` were two maps of the same four registers and they
 * disagreed (painted mist `#C8A8D8` against `#9C86A4`). This file is the
 * survivor. The scene derives its whole palette from these eight values
 * (`_scene/registers.ts`), and the vault check reads the same object, so a
 * register cannot mean two things again.
 *
 * SEEDED by the scene builder at 2026-09-09 because the scene needed the import
 * before this file existed; ADOPTED unchanged by the keeper the same hour. The
 * values are the hexes round two shipped in `_scene/palette.ts`, derived by hand
 * from `_components/emaki/theme.ts` PHASES, and they are the ones PG has actually
 * looked at, so replacing them with `SCENE_PRESETS`' untuned twins would have
 * been a downgrade dressed as a merge.
 *
 * IMPORTS NOTHING. No `node:fs`, no React, no PHASES: a client component, the
 * server reader and `scripts/cosmos-vault-check.ts` under bare node all read the
 * same object. That is what makes "one map" true rather than stated.
 *
 * Round 2.1 consumers: `_scene/registers.ts` derives the scene's whole palette
 * from these eight values, `vault.ts` maps a register to its ground material, and
 * `scripts/cosmos-vault-check.ts` asserts every register in `worlds.yml` is in
 * here with a full look.
 */

export type Register = "riso" | "painted" | "watercolor" | "paperback";

export interface RegisterLook {
  /** Zenith. The top of the sky ramp. */
  sky: string;
  /** The ground itself, at its most saturated. */
  ground: string;
  /** Grass tips over that ground. Instanced blades read from this. */
  grass: string;
  /** The mist that eats the borders and thickens with the weather. */
  mist: string;
  /** Film grain, 0 to 1. Riso wants a lot, watercolor almost none. */
  grain: number;
  /** Drifting motes: sakura at twilight, foxfire at midnight, gold by day. */
  particles: string;
  /** `FogExp2` colour, which is also the horizon the ground dissolves into. */
  fog: string;
  /** The synthesized ambient bed's voice, when the world names no audio file. */
  bed: string;
}

export const REGISTERS: Record<Register, RegisterLook> = {
  /** Painted gouache at twilight. The quiet practice, the home base. */
  painted: {
    sky: "#0e0816",
    ground: "#3A5B48",
    grass: "#7FA163",
    mist: "#9C86A4",
    grain: 0.055,
    particles: "#E0A0D0",
    fog: "#8E7FA0",
    bed: "painted",
  },

  /** Riso: cream paper, three inks, halftone, no gradients. The ordinary sacred. */
  riso: {
    sky: "#ECE2CE",
    ground: "#E0D3B2",
    grass: "#A8B072",
    mist: "#D8C8A8",
    grain: 0.18,
    particles: "#EAD6A0",
    fog: "#D8BE94",
    bed: "riso",
  },

  /** Ink-wash: teal-black and one golden light. The party. */
  watercolor: {
    sky: "#06181c",
    ground: "#1E4A48",
    grass: "#4E8A72",
    mist: "#7FB3AC",
    grain: 0.03,
    particles: "#E8C066",
    fog: "#2E6A64",
    bed: "watercolor",
  },

  /** Dark paperback: one red moon, heavy grain, midnight only. The depths. */
  paperback: {
    sky: "#07060a",
    ground: "#31262B",
    grass: "#4A4038",
    mist: "#3a2028",
    grain: 0.14,
    particles: "#F0C060",
    fog: "#3A1C22",
    bed: "paperback",
  },
};

export function registerLook(id: string | null | undefined): RegisterLook {
  if (id && id in REGISTERS) return REGISTERS[id as Register];
  return REGISTERS.painted;
}
