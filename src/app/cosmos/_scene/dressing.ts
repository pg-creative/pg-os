/**
 * Rooms into props: the placement layer.
 *
 * FOLLOWS: `author-game-levels`. Level data (the vault's `layout`) and visual
 * geometry are separate layers that share stable ids; collision is derived from
 * the prop registry's declared blockers, never inferred from decoration; and
 * every local light is placed together with the emitter that motivates it, from
 * the SAME row of `room.lights`, so a light and its lamp can never drift apart.
 *
 * Placement is deterministic: a room's id hashes to a seed, so the grove has the
 * same nine pines on every load, on every machine, forever. That is what makes a
 * screenshot diff mean something (`test-playable-web-games`) and it is also the
 * difference between a world and a screensaver.
 *
 * Room purpose drives the dressing. A keyword in the room id refines it, because
 * the vault's authors name rooms in English and "grove" should grow trees whoever
 * writes it. Unknown ids still get a correct room from `purpose` alone.
 */

import type { Room, WorldManifest } from "./contract";
import { EMITTER_PROP, PROPS, type Blocker } from "./props";

export interface Placement {
  key: string;
  kind: string;
  x: number;
  z: number;
  rot: number;
  scale: number;
  /** Deterministic 0..1 handed to the prop for its own variation. */
  v: number;
}

// ── Deterministic randomness ─────────────────────────────────────────────────

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── The recipe ───────────────────────────────────────────────────────────────

function has(id: string, ...words: string[]): boolean {
  const l = id.toLowerCase();
  return words.some((w) => l.includes(w));
}

/**
 * One room's props. Anchor and size are absolute world coordinates already: the
 * vault writes rooms in the shared plane's own numbers, so nothing is offset
 * twice.
 */
function dressRoom(world: WorldManifest, r: Room): Placement[] {
  const rng = mulberry32(hash32(`${world.id}:${r.id}`));
  const out: Placement[] = [];
  const { x: cx, z: cz } = r.anchor;
  const hw = r.size.w / 2;
  const hd = r.size.d / 2;

  const put = (kind: string, x: number, z: number, rot = 0, scale = 1) => {
    out.push({ key: `${r.id}:${kind}:${out.length}`, kind, x, z, rot, scale, v: rng() });
  };

  // 1. The emitters. One prop per light, at the light's own coordinates.
  for (const l of r.lights) {
    const kind = EMITTER_PROP[l.emitter];
    if (kind) put(kind, l.at.x, l.at.z, rng() * Math.PI * 2);
  }

  // 2. The doors. A stair is a hole you can see; a mist border has no object.
  for (const d of r.doors) {
    if (d.kind === "stairs") put("stairs", d.at.x, d.at.z, 0);
  }

  // 3. The room itself.
  if (has(r.id, "hall", "shrine", "home")) {
    put("hall", cx, cz, 0);
  } else if (has(r.id, "gate", "torii", "threshold")) {
    put("torii", cx, cz, r.size.w > r.size.d ? 0 : Math.PI / 2);
  } else if (has(r.id, "porch", "veranda")) {
    put("couch", cx, cz + 0.6, 0.2);
    put("dog", cx + 1.6, cz - 0.9, 0);
  } else if (has(r.id, "water", "lake", "pond")) {
    put("dock", cx - hw * 0.3, cz + hd * 0.8, 0);
    put("boat", cx - hw * 0.3 + 2.4, cz + hd * 0.3, 0);
  } else if (has(r.id, "grove", "wood", "forest")) {
    const n = 7 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      put(
        "pine",
        cx + (rng() * 2 - 1) * hw * 0.86,
        cz + (rng() * 2 - 1) * hd * 0.86,
        rng() * Math.PI * 2,
        0.85 + rng() * 0.5,
      );
    }
  }

  // 4. Purpose defaults, on top of whatever the id asked for.
  switch (r.purpose) {
    case "traversal":
    case "transition": {
      // A path down the long axis, so the eye knows where the room leads.
      const along = r.size.d >= r.size.w;
      const span = along ? hd : hw;
      const steps = Math.max(2, Math.floor(span / 2.6));
      for (let i = 0; i < steps; i++) {
        const t = (i / Math.max(1, steps - 1)) * 2 - 1;
        put(
          "path",
          cx + (along ? 0 : t * span * 0.8),
          cz + (along ? t * span * 0.8 : 0),
          along ? 0 : Math.PI / 2,
        );
      }
      break;
    }
    case "objective":
      if (world.monuments.length === 0) {
        put("brazier", cx, cz, 0);
      }
      break;
    case "recovery":
      if (!has(r.id, "porch", "grove")) {
        for (let i = 0; i < 3; i++) {
          put(
            "rock",
            cx + (rng() * 2 - 1) * hw * 0.7,
            cz + (rng() * 2 - 1) * hd * 0.7,
            rng() * 6,
            0.7 + rng() * 0.6,
          );
        }
      }
      break;
    default:
      break;
  }

  // 5. Scatter. Small, cheap, and it is the difference between a floor plan and
  // a place. Never inside the middle third, where the walking happens.
  const scatter = world.layout.ground === "ash" ? 4 : 9;
  for (let i = 0; i < scatter; i++) {
    const ex = (rng() * 2 - 1) * hw;
    const ez = (rng() * 2 - 1) * hd;
    if (Math.abs(ex) < hw * 0.34 && Math.abs(ez) < hd * 0.34) continue;
    const kind = rng() > (world.layout.ground === "grass" ? 0.35 : 0.7) ? "grass" : "rock";
    put(kind, cx + ex, cz + ez, rng() * 6, 0.5 + rng() * 0.7);
  }

  return out;
}

/** Every prop in one world, in a stable order. */
export function dressWorld(world: WorldManifest): Placement[] {
  const out: Placement[] = [];
  for (const r of world.layout.rooms) out.push(...dressRoom(world, r));
  return out;
}

/**
 * The collision layer. Circles in world space, from each prop's declared
 * blockers rotated and scaled by its placement. Decoration with no blocker (a
 * path, a mat, a grass tuft) contributes nothing, on purpose: a world you cannot
 * walk across is not a world.
 */
export function blockersFor(placements: Placement[]): Blocker[] {
  const out: Blocker[] = [];
  for (const pl of placements) {
    const def = PROPS[pl.kind];
    if (!def) continue;
    const c = Math.cos(pl.rot);
    const s = Math.sin(pl.rot);
    for (const b of def.blockers) {
      out.push({
        x: pl.x + (b.x * c - b.z * s) * pl.scale,
        z: pl.z + (b.x * s + b.z * c) * pl.scale,
        r: b.r * pl.scale,
      });
    }
  }
  return out;
}

/**
 * The lit inventory, flattened: every light in the world with the emitter it
 * hangs on. The scene mounts exactly these and nothing else, which is how a
 * floating unexplained light becomes impossible rather than merely discouraged.
 */
export function lightsFor(world: WorldManifest) {
  return world.layout.rooms.flatMap((r) =>
    r.lights.map((l, i) => ({ ...l, id: `${world.id}:${r.id}:${i}`, room: r.id })),
  );
}

/** Which room a point is in, or null. Drives the hearth, the stairs and the bed. */
export function roomAt(world: WorldManifest, x: number, z: number): Room | null {
  for (const r of world.layout.rooms) {
    if (
      Math.abs(x - r.anchor.x) <= r.size.w / 2 &&
      Math.abs(z - r.anchor.z) <= r.size.d / 2
    ) {
      return r;
    }
  }
  return null;
}
