/**
 * The scene's half of the vault contract.
 *
 * The same shape as the `WorldManifest` block in `src/lib/cosmos/vault.ts`,
 * declared here so no client component ever imports a module that pulls in
 * `node:fs`. TypeScript is structural: the keeper's reader returns these, this
 * file names them, and nothing has to cross.
 *
 * Ids, geometry, titles and asset URLs only. A page body still reaches the
 * browser as server-rendered nodes, never as a string in a client chunk, because
 * `/_next` is served without the cosmos cookie and `/cosmos` is not.
 */

export type Register = "riso" | "painted" | "watercolor" | "paperback";
/**
 * `night-when-on` is the party's: a gathering is a gathering at night, whatever
 * the clock says, and the Critic found the heart light standing on a plinth in
 * four o'clock daylight because the world said `clock`. The vault decides which
 * worlds are like that; the scene only knows what to do when one says so.
 */
export type Phase = "day" | "twilight" | "night" | "midnight" | "clock" | "night-when-on";

export type RoomPurpose =
  | "traversal"
  | "orientation"
  | "recovery"
  | "reward"
  | "transition"
  | "objective";

export interface Light {
  emitter: "lantern" | "torch" | "brazier" | "altar" | "fire" | "window";
  at: { x: number; z: number };
  range: number;
  color: string;
  intensity: number;
}

export interface Door {
  to: string;
  kind: "mist" | "stairs";
  at: { x: number; z: number };
}

export interface Room {
  id: string;
  anchor: { x: number; z: number };
  size: { w: number; d: number };
  purpose: RoomPurpose;
  lights: Light[];
  objects: string[];
  doors: Door[];
  /**
   * The painting this room's back wall wears, when the vault names one
   * (`interior:` on the room in world.yml). READ, as of round three: the scene's
   * own world-id-to-plate map is deleted and a second world with an interior is
   * a line of YAML rather than a code edit.
   *
   * The object form carries `hearth_u`, where the painted hearth sits across the
   * image (0 to 1), so a painting can align itself. A bare string takes the
   * scene's default.
   */
  interior?: string | { url: string; hearth_u?: number } | null;
  /**
   * A recorded ambient loop for this room, over the world's own `bed:`. The hall
   * has one (`audio/bed-hall.mp3`); everywhere else falls through to the biome's
   * bed and then to the procedural floor.
   */
  bed?: string | null;
  /**
   * The frames this room breathes: `loop: plates/hall-loop` in the vault, cut to
   * 12 fps WebP by the keeper's `cut-frames.sh`. It hangs on the room's own
   * interior wall when it has one, and drives the world's painted horizon when
   * it does not, because that is what each of the four cut loops is a loop OF.
   */
  loop?: {
    base: string;
    count: number;
    fps: number;
    width: number;
    height: number;
  } | null;
}

export interface SceneObject {
  id: string;
  type: string;
  title: string;
  room: string;
  at: { x: number; z: number };
  plate: { url: string; lqip: string } | null;
  touched: string | null;
  weight: number;
}

export interface Monument {
  id: string;
  date: string;
  line: string;
  at: { x: number; z: number };
}

export interface Thread {
  season: string;
  chapter: { id: string; title: string; line: string } | null;
}

export interface Layout {
  origin: { x: number; z: number };
  size: { w: number; d: number };
  ground: string;
  rooms: Room[];
}

export interface WorldManifest {
  id: string;
  title: string;
  register: Register;
  phase: Phase;
  private: boolean;
  layout: Layout;
  objects: SceneObject[];
  monuments: Monument[];
  thread: Thread;
  weather: Record<string, number | string | null>;
  attention: Record<string, string>;
  hero: { world: string; x: number; z: number } | null;
  /**
   * The painted horizon. `crop` is the band of the plate that stands on the
   * horizon, 0 at the top of the image: a plate whose subject sits high (the
   * depths' red moon) says so here rather than being cut off by a default.
   */
  backdrop: { url: string; lqip: string; crop?: { from: number; to: number } } | null;
  bed: string | null;
  /**
   * The rigged hero for this world, when `model:` names one. `?hero=model` draws
   * it; the sprite stays the default until PG picks.
   */
  hero_model?: {
    url: string;
    static_url: string | null;
    height: number;
    clip: string | null;
  } | null;
  /**
   * Prop words this world has a painted cutout for on disk. The reader looks now
   * (`vault.ts:readCutouts`), so the scene asks for exactly these and misses
   * nothing: zero wasted requests, zero console 404s. Empty means "draw the
   * factories", and the scene sends no request at all.
   */
  cutouts?: string[];
}

/** Everything the client half needs, in one object. */
export interface CosmosManifest {
  worlds: WorldManifest[];
  /** Where the Wayfarer stands on this load. Never null: the hall is the floor. */
  hero: { world: string; x: number; z: number };
  thread: Thread;
  /** Which world the URL asked for, if any. */
  focus: string | null;
  /** The fixture name when one is driving, so the HUD can say so. */
  fixture: string | null;
  /** Ids already unfolded, newest last. The satchel reads it. */
  satchel: string[];
}

// ── Small shared helpers, used by both halves of the scene ───────────────────

/** Days since an ISO timestamp, or null when a thing was never touched. */
export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 86_400_000;
}

/**
 * 0 means touched today, 1 means never. Mist is a function of this and it never
 * deletes: at 1 the thing is still there, just behind weather.
 */
export function untouchedFor(iso: string | null): number {
  const d = daysSince(iso);
  if (d === null) return 1;
  return Math.min(Math.max(d / 21, 0), 1);
}

/** The world whose layout rectangle contains a point, or null out in the mist. */
export function worldAt(
  worlds: WorldManifest[],
  x: number,
  z: number,
): WorldManifest | null {
  for (const w of worlds) {
    const { origin, size } = w.layout;
    if (
      x >= origin.x - size.w / 2 &&
      x <= origin.x + size.w / 2 &&
      z >= origin.z - size.d / 2 &&
      z <= origin.z + size.d / 2
    ) {
      return w;
    }
  }
  return null;
}

/** The nearest world by centre distance. Used while crossing a border band. */
export function nearestWorld(
  worlds: WorldManifest[],
  x: number,
  z: number,
): WorldManifest {
  let best = worlds[0];
  let bestD = Infinity;
  for (const w of worlds) {
    const dx = w.layout.origin.x - x;
    const dz = w.layout.origin.z - z;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return best;
}
