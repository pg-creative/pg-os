/**
 * Deterministic scene geometry for a world.
 *
 * EXTENDS: `src/app/dev/backdrop-lab/page.tsx`, whose multiplane study proved the
 * shipped backdrop is "a double-image smear, not parallax" and whose depth ratios
 * [0.06, 0.24, 0.52, 1.0] are the depth cue. Those four ratios are ported verbatim
 * as DEPTHS below and drive the plate planes.
 *
 * Geometry is computed on the SERVER and travels in the manifest, so the client
 * bundle carries ids, numbers and URLs only. Positions are a pure function of the
 * page id: the same page sits in the same place on every reload, and a new page
 * never shuffles the world.
 */

/** backdrop-lab's depth ratios. 0 is furthest, 1 is the plane you can touch. */
export const DEPTHS = [0.06, 0.24, 0.52, 1.0] as const;

/** FNV-1a. Small, stable, and identical run to run. */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A deterministic 0..1 stream from one id. */
export function rng(id: string): () => number {
  let s = hashId(id) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export interface Placement {
  x: number;
  y: number;
  z: number;
  scale: number;
  spin: number;
}

/**
 * Vault objects scatter across the middle ground, between the mid and near plates,
 * on a shallow arc so none hides behind another from the default camera.
 */
export function placeObject(id: string, index: number, total: number): Placement {
  const r = rng(id);
  const spread = Math.max(total - 1, 1);
  // Arc across x, biased by index so the set never clumps, jittered by the hash.
  const t = total === 1 ? 0.5 : index / spread;
  const x = (t - 0.5) * 6.6 + (r() - 0.5) * 0.7;
  const y = 0.15 + Math.sin(t * Math.PI) * 0.5 + (r() - 0.5) * 0.28;
  // Between the mid plate (-6.3) and the near plate (-1.6), so a tag hangs INSIDE
  // the world rather than in front of the foreground it should be standing in.
  const z = -3.3 - r() * 1.5;
  return { x, y, z, scale: 0.5 + r() * 0.14, spin: (r() - 0.5) * 0.35 };
}

/**
 * Monuments stand on a path: a receding line, oldest ship furthest away.
 * A LEDGER line is a monument, and the path is the ledger read as ground.
 */
export function placeMonument(index: number, total: number): Placement {
  // t = 0 is the OLDEST ship, furthest into the valley; t = 1 is the newest,
  // nearest the step you are standing on.
  const t = total <= 1 ? 1 : index / (total - 1);

  // The path descends left into the mist and converges toward the horizon, so
  // the stones read as distance rather than as a row of objects across the view.
  // A gentle sine on top keeps it a path and not a ruler.
  const x = -0.15 - Math.pow(t, 1.5) * 3.5 + Math.sin(t * Math.PI * 2.2) * 0.42;
  const z = -13.5 + Math.pow(t, 1.25) * 9.0;
  const y = -0.62 - Math.pow(t, 1.4) * 1.35;
  return { x, y, z, scale: 0.14 + Math.pow(t, 1.3) * 0.2, spin: 0 };
}

/**
 * Mist per object is a function of days since touched, and it never deletes.
 * Untouched reads 1 (fully misted); touched today reads 0. Thirty days is full mist.
 */
export function untouchedFor(lastTouched: string | undefined, now = Date.now()): number {
  if (!lastTouched) return 1;
  const then = Date.parse(lastTouched);
  if (Number.isNaN(then)) return 1;
  const days = (now - then) / 86_400_000;
  return Math.min(Math.max(days / 30, 0), 1);
}
