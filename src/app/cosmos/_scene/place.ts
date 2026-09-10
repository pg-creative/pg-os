/**
 * Rooms into props: the placement layer.
 *
 * REPLACES `dressing.ts`, deleted this round. That file furnished a room by
 * looking for English words in its id, and the Critic found exactly what that
 * costs: the cartographer called the yard `the-yard`, which matched nothing, so
 * the ordinary sacred had no boat, no dog and no couch; and she called the
 * mirror's room `lake-edge`, which matched `lake`, so the quiet practice grew a
 * dock and a rowing boat the vault never mentions. "Vault is data, never the
 * surface" cannot survive a renderer that reads room names for meaning.
 *
 * So a room says what stands in it, in `props:`, in a vocabulary SCHEMA.md
 * names. This file places that list and nothing else. When a room carries no
 * `props:` at all (the vault is still being written while this ships) there is
 * one structural fallback, from `purpose` and from the KINDS of light the room
 * declares, never from its name; it is named below and it stops firing the
 * moment the keeper's `props:` lands.
 *
 * FOLLOWS `author-game-levels`: level data and visual geometry are separate
 * layers sharing stable ids; collision is derived from the prop registry's
 * declared blockers, never inferred from decoration; and every local light is
 * placed together with the emitter that motivates it, from the SAME row of
 * `room.lights`, so a light and its lamp can never drift apart.
 *
 * Placement is deterministic: a room's id hashes to a seed, so the grove has the
 * same nine pines on every load, on every machine, forever. That is what makes a
 * screenshot diff mean something (`test-playable-web-games`).
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
  /** Rooms whose prop needs the room's footprint (the hall) get it here. */
  w?: number;
  d?: number;
  /** Where a stair cuts this prop's floor, in the prop's own local frame. */
  gap?: { x: number; z: number } | null;
  /** Local x of the thing a painted interior must line up with (the hearth). */
  interiorAt?: number;
}

/** The nearest quarter turn. A building squares up; it does not lean. */
function snapYaw(a: number): number {
  return (Math.round(a / (Math.PI / 2)) * Math.PI) / 2;
}

/** A world offset in a prop's own frame, after the prop's yaw. */
function local(dx: number, dz: number, yaw: number): { x: number; z: number } {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

/**
 * What a room may ask for: THE KEYS OF THE PROP REGISTRY, and nothing else.
 *
 * The Critic's deduction 11 was that this file kept a hand-written list beside
 * `vault.ts`'s and the two had drifted (`torch`, `hall`, `smithy`, `path`,
 * `fence`, `rock`, `grass` in one and not the other). A second list of the same
 * closed set can only ever drift again, so there is no second list: the words
 * the renderer knows are the words it can draw, derived, and a word the vault
 * invents is silently nothing rather than half a thing.
 */
export const VOCABULARY: readonly string[] = Object.keys(PROPS);

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

/** A room's `props:` list, when the manifest carries one. */
export function propsOf(room: Room): string[] {
  const p = (room as Room & { props?: unknown }).props;
  if (!Array.isArray(p)) return [];
  return p.filter((x): x is string => typeof x === "string");
}

/**
 * ONE ENTRY IS ONE PROP.
 *
 * The Critic's deduction 4, and it was the worst thing in the build: this file
 * multiplied a `pine` entry by nine, so `props: [.., pine, pine, pine]` in the
 * practice grew a hedge of twenty-seven trees with 0.62 m blockers scattered to
 * the room's edge, which is the hall's doorstep. Five separate walks toward the
 * hall stalled in it. The vault said three trees and the scene built a wall.
 *
 * SCHEMA.md's rule is the whole rule: "Repeats are allowed and mean two of the
 * thing". So a word appearing three times places three, scattered; once places
 * one. Nothing is invented, and a grove is nine lines of YAML when a grove is
 * what he wants.
 */

/** Props that face the room's long axis rather than a random bearing. */
const AXIAL = new Set(["torii", "hall", "smithy", "dock", "crypt-door", "smithy-door", "paper-window"]);

/**
 * One room's props. Anchor and size are absolute world coordinates already: the
 * vault writes rooms in the shared plane's own numbers, so nothing is offset
 * twice.
 */
function placeRoom(world: WorldManifest, r: Room): Placement[] {
  const rng = mulberry32(hash32(`${world.id}:${r.id}`));
  const out: Placement[] = [];
  const { x: cx, z: cz } = r.anchor;
  const hw = r.size.w / 2;
  const hd = r.size.d / 2;
  /** The room's long axis, in radians: what a gate or a hall squares up to. */
  const axis = r.size.w >= r.size.d ? 0 : Math.PI / 2;

  const put = (
    kind: string,
    x: number,
    z: number,
    rot = 0,
    scale = 1,
    extra?: Partial<Pick<Placement, "w" | "d" | "gap" | "interiorAt">>,
  ) => {
    out.push({
      key: `${r.id}:${kind}:${out.length}`,
      kind,
      x,
      z,
      rot,
      scale,
      v: rng(),
      ...extra,
    });
  };

  // The room's inventory. Emitters and doors are placed from their OWN rows
  // below, at their own coordinates, so an inventory that also names them (and
  // `world.yml` does, because the inventory is the room's full furniture list)
  // hands one entry each to those rows instead of standing a second copy in the
  // middle of the floor.
  const asked = propsOf(r);
  const list = asked.length ? [...asked] : fallbackProps(r);
  const claim = (kind: string): boolean => {
    const i = list.indexOf(kind);
    if (i < 0) return false;
    list.splice(i, 1);
    return true;
  };

  // 1. The emitters. One prop per light, at the light's own coordinates, AND
  //    ONLY WHEN THE ROOM CLAIMS IT.
  //
  //    The Critic's deduction 8: this loop stood a lit paper window under every
  //    `window` light in every world, so the depths got a glowing orange shoji
  //    panel on the ash beside the stair, against `world.yml`'s own words ("in
  //    the depths that emitter is moonlight through stone, never a paper
  //    window") and SCHEMA.md's exception. An inventory is an inventory: a room
  //    that lists no lamp gets no lamp, and its light comes from the sky, the
  //    stone or the fire, which is what the vault said in the first place.
  //
  //    A room with no `props:` at all is still being written, so the transitional
  //    fallback stands its lamps and stops the moment a list lands.
  for (const l of r.lights) {
    const kind = EMITTER_PROP[l.emitter];
    if (!kind) continue;
    if (!claim(kind) && asked.length) continue;
    // A window belongs on a wall, so it faces the room's centre.
    const rot =
      kind === "paper-window"
        ? Math.atan2(cx - l.at.x, cz - l.at.z)
        : rng() * Math.PI * 2;
    put(kind, l.at.x, l.at.z, rot);
  }

  // 2. The doors. A stair is a hole you can see; a mist border has no object.
  //    The stair is placed at the door's OWN coordinates (deduction 7: the vault
  //    put it at (-20, 0) and the hall cut its gap somewhere else entirely).
  const stairs = r.doors.filter((d) => d.kind === "stairs");
  for (const d of stairs) {
    claim("stair");
    put("stair", d.at.x, d.at.z, Math.atan2(cx - d.at.x, cz - d.at.z));
  }

  // 3. The room itself, when the room is a building.
  //
  //    Structural, from `purpose` and from the KINDS of light declared, never
  //    from a word in the id: a recovery room with a hearth fire burning in it
  //    is somewhere he sleeps, and somewhere he sleeps has walls and a roof. An
  //    inventory that names `hall` or `smithy` outright wins over this.
  const building = list.includes("hall")
    ? null
    : list.includes("smithy")
      ? null
      : r.purpose === "recovery" && r.lights.some((l) => l.emitter === "fire")
        ? "hall"
        : null;
  if (building) list.unshift(building);

  // 4. What the room says stands in it, one for one, repeats and all.
  const counts = new Map<string, number>();
  for (const kind of list) counts.set(kind, (counts.get(kind) ?? 0) + 1);

  for (const [kind, n] of counts) {
    if (!PROPS[kind]) continue;

    // A building squares up to its own door, and its footprint is the room's.
    //
    // THE STAIR, closed. The vault puts the practice's door at (-20, 0), which
    // is the WEST edge of a room anchored at (-14, 0); round two built the hall
    // facing north and cut its gap at local (0, -4.1), so the way down was two
    // pale stubs in a wall six metres from where the vault said it was. The
    // hall now turns to face the door, its footprint turns with it, and the
    // door's own coordinates come through as the hole in the floor.
    if (kind === "hall" || kind === "smithy") {
      const door = stairs[0] ?? null;
      // Local -z points at the door: the back wall is the wall the stair is in.
      const yaw = door ? snapYaw(Math.atan2(cx - door.at.x, cz - door.at.z)) : axis;
      const turned = Math.abs(Math.sin(yaw)) > 0.5;
      const bw = turned ? r.size.d : r.size.w;
      const bd = turned ? r.size.w : r.size.d;
      const gap = door ? local(door.at.x - cx, door.at.z - cz, yaw) : null;
      // Where the hearth stands inside the building, so the painting on the back
      // wall can put its painted fire over the real one.
      const fire = r.lights.find((l) => l.emitter === "fire");
      const interiorAt = fire ? local(fire.at.x - cx, fire.at.z - cz, yaw).x : 0;
      put(kind, cx, cz, yaw, 1, { w: bw, d: bd, gap, interiorAt });
      continue;
    }
    // Water fills its room and squares up to it.
    if (kind === "still-water") {
      put(kind, cx, cz, 0, 1, { w: r.size.w, d: r.size.d });
      continue;
    }

    if (n === 1) {
      // One of a kind, a step off the anchor, so a couch and a dog in the same
      // room do not stand in each other.
      const i = out.length;
      put(
        kind,
        cx + Math.cos(i * 2.4) * hw * 0.42,
        cz + Math.sin(i * 2.4) * hd * 0.42,
        AXIAL.has(kind) ? axis : rng() * Math.PI * 2,
      );
      continue;
    }
    // Two or more of a word: scattered around the room's edge, never in the
    // middle third where the walking happens. The position is RETRIED rather
    // than skipped, because a room that asks for three of a thing gets three.
    for (let i = 0; i < n; i++) {
      let ex = 0;
      let ez = 0;
      for (let tries = 0; tries < 12; tries++) {
        ex = (rng() * 2 - 1) * hw * 0.88;
        ez = (rng() * 2 - 1) * hd * 0.88;
        if (Math.abs(ex) > hw * 0.34 || Math.abs(ez) > hd * 0.34) break;
      }
      put(kind, cx + ex, cz + ez, rng() * Math.PI * 2, 0.8 + rng() * 0.5);
    }
  }

  // 4. A path down the long axis of anything you pass through, so the eye knows
  //    where the room leads. One feathered strip, not a chain of slabs.
  if (r.purpose === "traversal" || r.purpose === "transition") {
    put("path", cx, cz, axis, 1, { w: r.size.w, d: r.size.d });
  }

  return out;
}

/**
 * THE TRANSITIONAL FALLBACK, and the only inference in this file.
 *
 * Structural only: a room's purpose and the KINDS of light it declares, never a
 * word in its name. A recovery room with a hearth fire in it is a building; a
 * transition is a gate; everything else gets ground cover and nothing that
 * pretends to be furniture. It exists so the world is not empty while the vault
 * grows its `props:` lists, and it stops firing per room the moment one lands.
 */
function fallbackProps(r: Room): string[] {
  const has = (e: string) => r.lights.some((l) => l.emitter === e);
  // Repeats, written out, because one entry is one prop everywhere now and a
  // room the vault has not furnished should still read as ground cover.
  const tufts = ["grass", "grass", "grass", "grass", "grass", "grass"];
  if (has("fire")) return ["hall", ...tufts];
  if (r.purpose === "transition") return ["torii", ...tufts];
  return [...tufts, "rock", "rock", "rock"];
}

/** Every prop in one world, in a stable order. */
export function placeWorld(world: WorldManifest): Placement[] {
  const out: Placement[] = [];
  for (const r of world.layout.rooms) out.push(...placeRoom(world, r));
  return out;
}

/**
 * The collision layer. Circles in world space, from each prop's declared
 * blockers rotated and scaled by its placement. Decoration with no blocker (a
 * path, a mat, a grass tuft) contributes nothing, on purpose: a world you cannot
 * walk across is not a world.
 *
 * A prop whose blockers depend on its footprint (the hall, whose walls are now
 * SEGMENTS rather than four fat discs that overlapped into corner traps) asks
 * the registry for them with the placement's own width and depth.
 */
export function blockersFor(placements: Placement[]): Blocker[] {
  const out: Blocker[] = [];
  for (const pl of placements) {
    const def = PROPS[pl.kind];
    if (!def) continue;
    const list = def.blockersFor ? def.blockersFor(pl.w ?? 1, pl.d ?? 1) : def.blockers;
    const c = Math.cos(pl.rot);
    const s = Math.sin(pl.rot);
    for (const b of list) {
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
  return world.layout.rooms.flatMap((r) => {
    // The same claim the placer makes, so a light and its lamp agree about
    // whether there IS a lamp. A light whose room did not ask for its emitter
    // still burns (the vault put it there), but it burns ON THE GROUND rather
    // than at the height a lamp would have held it: a fire on the ash, not a
    // flame hanging in the air with nothing under it.
    const asked = propsOf(r);
    const list = asked.length ? [...asked] : fallbackProps(r);
    return r.lights.map((l, i) => {
      const kind = EMITTER_PROP[l.emitter];
      let lamp = false;
      if (kind) {
        const j = list.indexOf(kind);
        if (j >= 0) {
          list.splice(j, 1);
          lamp = true;
        } else if (!asked.length) {
          lamp = true;
        }
      }
      return { ...l, id: `${world.id}:${r.id}:${i}`, room: r.id, lamp };
    });
  });
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
