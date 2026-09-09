/**
 * Cosmos vault reader.
 *
 * EXTENDS: `src/lib/projectState.ts` and `src/lib/queueStore.ts`, the two readers
 * that already turn files under the workspace into typed objects for a route. Same
 * shape: pure parse functions, one IO layer on top, no cache, read at request time.
 * It does NOT extend `src/lib/paths.ts` PG_ROOT, because the vault has its own root
 * (`COSMOS_ROOT`) and lives beside the workspace rather than inside it.
 *
 * Contract, from SCHEMA.md "What the reader refuses":
 *   1. Throws if a page has no `plate`, or the file `plate` names is absent on disk.
 *   2. Ignores `status: draft` pages unless the caller passes drafts: true (?drafts=1).
 * Worlds are a separate, smaller schema and are NOT draft-filtered, so a round-one
 * world whose pages are all drafts still renders as a world.
 *
 * The reader runs at REQUEST time, never at build time (plan 7h, D3: a build-time
 * read freezes the layer that is supposed to evolve nightly).
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * gray-matter bundles js-yaml and exposes it as `matter.engines.yaml`, which its
 * shipped types omit. Using it keeps world.yml and worlds.yml on the same parser
 * as every page's frontmatter, and adds no dependency: js-yaml is only a
 * transitive package here, so importing it directly would not resolve.
 */
const yamlEngine = (
  matter as unknown as {
    engines: { yaml: { parse: (s: string) => unknown } };
  }
).engines.yaml;

// ── Roots ────────────────────────────────────────────────────────────────────

/** The vault. Everything the cosmos owns lives under here. */
export function cosmosRoot(): string {
  return process.env.COSMOS_ROOT || "/Users/pg/cortex/cosmos";
}

/**
 * The one sibling tree the vault is allowed to point into: the wall's plates.
 * `sources.yml` says nothing moves, so `plate:` paths of the form
 * `../self/wall/plates/x.jpg` resolve here rather than being copied in.
 */
export function wallPlatesRoot(): string {
  return path.join(cosmosRoot(), "..", "self", "wall", "plates");
}

// ── Types ────────────────────────────────────────────────────────────────────

export type Register = "riso" | "painted" | "paperback" | "watercolor";
export type WorldStatus = "draft" | "unbuilt" | "canon";

export interface WorldEntry {
  id: string;
  title: string;
  status: WorldStatus;
  register: Register | null;
  phase: string | null;
  private: boolean;
  heroPlate: string | null;
  /** Same subject, same register, a second source. Live-switchable in the scene. */
  heroPlateAlt: string | null;
  loop: string | null;
  bed: string | null;
  worldFile: string | null;
}

export interface VaultPage {
  id: string;
  type: string;
  title: string;
  world: string;
  /** Empty string ONLY on the lenient path, where a plateless page mists. */
  plate: string;
  register: Register | null;
  private: boolean;
  status: "canon" | "draft";
  body: string;
  file: string;
  /** Which room of the world's layout this page stands in. */
  room: string | null;
  /** Where in the room, in world units. Null means "place me deterministically". */
  at: { x: number; z: number } | null;
  /** How much room the object takes. 1 is the default; see SCHEMA.md. */
  weight: number;
  /** The witness writes it, never a hand. Null when it has never been read back. */
  touched: string | null;
}

export interface ScenePreset {
  sky: {
    top: string;
    mid: string;
    horizon: string;
    glow: string;
    glowY: number;
    banding: number;
  };
  mist: { color: string; density: number; scale: number; speed: number };
  grain: { amount: number; scale: number };
  particles: {
    count: number;
    colors: [string, string, string];
    shape: "petal" | "mote";
    drift: number;
    wind: number;
  };
}

// ── Register to scene ────────────────────────────────────────────────────────

/**
 * EXTENDS: `_components/emaki/theme.ts` PHASES. The painted preset takes its hexes
 * from PHASES.twilight so the cosmos and the OS read as one hand, exactly the
 * Worldsmith's rule ("the painted hexes are the literal values the OS uses").
 *
 * Round one only needs `painted` complete (plan 7h, D11). The other three are
 * deliberate stubs: real hexes, real values, visibly different on screen, but not
 * yet tuned against a plate. A world can already declare them without new code.
 */
const SCENE_PRESETS: Record<Register, ScenePreset> = {
  painted: {
    // PHASES.twilight: bg #0e0816, accent #E0A0D0, gold #C88840, goldBright #EAA050.
    sky: {
      top: "#0e0816",
      mid: "#3b1f4a",
      horizon: "#E0A0D0",
      glow: "#EAA050",
      glowY: 0.3,
      banding: 0.0,
    },
    mist: { color: "#C8A8D8", density: 0.55, scale: 2.4, speed: 0.035 },
    grain: { amount: 0.055, scale: 1.0 },
    particles: {
      // Sakura on the wind, the twilight signature (emaki-ambient recipe).
      count: 46,
      colors: ["#E0A0D0", "#F4E8F8", "#E8B0D8"],
      shape: "petal",
      drift: -1,
      wind: 0.55,
    },
  },
  riso: {
    // Cream paper, 3 to 4 inks, halftone, NO gradients. banding 1.0 posterizes the sky.
    sky: {
      top: "#ECE2CE",
      mid: "#E4D2B4",
      horizon: "#D8BE94",
      glow: "#8C5C08",
      glowY: 0.22,
      banding: 1.0,
    },
    mist: { color: "#D8C8A8", density: 0.15, scale: 1.4, speed: 0.012 },
    grain: { amount: 0.18, scale: 2.6 },
    particles: {
      count: 18,
      colors: ["#8C5C08", "#FCF8F0", "#EAD6A0"],
      shape: "mote",
      drift: 1,
      wind: 0.1,
    },
  },
  paperback: {
    // Dark fantasy paperback: one red moon, heavy grain, midnight weather only.
    sky: {
      top: "#07060a",
      mid: "#150a10",
      horizon: "#2a1016",
      glow: "#A02028",
      glowY: 0.72,
      banding: 0.0,
    },
    mist: { color: "#3a2028", density: 0.82, scale: 3.2, speed: 0.02 },
    grain: { amount: 0.14, scale: 1.0 },
    particles: {
      count: 8,
      colors: ["#A02028", "#6a3038", "#D8A090"],
      shape: "mote",
      drift: -1,
      wind: 0.2,
    },
  },
  watercolor: {
    // Ink-wash: teal-black, one golden light.
    sky: {
      top: "#06181c",
      mid: "#0b2a2e",
      horizon: "#1c4a48",
      glow: "#E8C066",
      glowY: 0.4,
      banding: 0.0,
    },
    mist: { color: "#7FB3AC", density: 0.38, scale: 2.0, speed: 0.045 },
    grain: { amount: 0.03, scale: 1.2 },
    particles: {
      count: 24,
      colors: ["#E8C066", "#CFE8E0", "#8FC8BC"],
      shape: "mote",
      drift: 1,
      wind: 0.3,
    },
  },
};

/** Falls back to painted, the only complete preset this round. */
export function sceneForRegister(register: string | null): ScenePreset {
  if (register && register in SCENE_PRESETS) {
    return SCENE_PRESETS[register as Register];
  }
  return SCENE_PRESETS.painted;
}

// ── Pure parsers ─────────────────────────────────────────────────────────────

function asRegister(v: unknown): Register | null {
  return v === "riso" || v === "painted" || v === "paperback" || v === "watercolor"
    ? v
    : null;
}

/** Parse `worlds.yml` text into ordered world entries. Pure, unit-testable. */
export function parseWorldsYml(text: string): WorldEntry[] {
  const raw = yamlEngine.parse(text) as Record<
    string,
    Record<string, unknown>
  > | null;
  if (!raw || typeof raw !== "object") return [];
  return Object.entries(raw).map(([id, w]) => ({
    id,
    title: String(w.title ?? id),
    status: (w.status as WorldStatus) ?? "unbuilt",
    // A world may declare a list of registers (ordinary-sacred does); take the first.
    register: asRegister(Array.isArray(w.register) ? w.register[0] : w.register),
    phase: typeof w.phase === "string" ? w.phase : null,
    private: w.private === true,
    heroPlate: typeof w.hero_plate === "string" ? w.hero_plate : null,
    heroPlateAlt: typeof w.hero_plate_alt === "string" ? w.hero_plate_alt : null,
    loop: typeof w.loop === "string" ? w.loop : null,
    bed: typeof w.bed === "string" ? w.bed : null,
    worldFile: typeof w.world_file === "string" ? w.world_file : null,
  }));
}

/** Parse one world.yml. Its fields override the registry entry where present. */
export function parseWorldFile(text: string, fallback: WorldEntry): WorldEntry {
  const raw = yamlEngine.parse(text) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return fallback;
  return {
    ...fallback,
    title: typeof raw.title === "string" ? raw.title : fallback.title,
    status: (raw.status as WorldStatus) ?? fallback.status,
    register: asRegister(raw.register) ?? fallback.register,
    phase: typeof raw.phase === "string" ? raw.phase : fallback.phase,
    private: raw.private === true ? true : fallback.private,
    heroPlate:
      typeof raw.hero_plate === "string" ? raw.hero_plate : fallback.heroPlate,
    heroPlateAlt:
      typeof raw.hero_plate_alt === "string"
        ? raw.hero_plate_alt
        : fallback.heroPlateAlt,
    loop: typeof raw.loop === "string" ? raw.loop : fallback.loop,
    bed: typeof raw.bed === "string" ? raw.bed : fallback.bed,
  };
}

export class VaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultError";
  }
}

/** `at: { x: 3, z: -1 }`, or `at: [3, -1]`. Anything else is null. */
function asPoint(v: unknown): { x: number; z: number } | null {
  if (Array.isArray(v) && v.length >= 2) {
    const [x, z] = v;
    if (typeof x === "number" && typeof z === "number") return { x, z };
    return null;
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.x === "number" && typeof o.z === "number") {
      return { x: o.x, z: o.z };
    }
  }
  return null;
}

/** The fields shared by the strict and lenient parsers. Plate is handled above. */
function pageFrom(
  d: Record<string, unknown>,
  body: string,
  file: string,
  plate: string,
): VaultPage {
  const rel = path.basename(file);
  return {
    id: String(d.id ?? rel.replace(/\.md$/, "")),
    type: String(d.type ?? "lore"),
    title: String(d.title ?? d.id ?? rel),
    world: String(d.world),
    plate,
    register: asRegister(d.register),
    private: d.private === true,
    status: d.status === "canon" ? "canon" : "draft",
    body,
    file,
    room: typeof d.room === "string" ? d.room : null,
    at: asPoint(d.at),
    weight: typeof d.weight === "number" ? d.weight : 1,
    touched: typeof d.touched === "string" ? d.touched : null,
  };
}

/**
 * Parse one page's frontmatter and body. THROWS when `plate` is missing.
 * `plateExists` is injected so the rule is testable without touching disk.
 */
export function parsePage(
  text: string,
  file: string,
  plateExists: (plate: string) => boolean,
): VaultPage {
  const fm = matter(text);
  const d = fm.data as Record<string, unknown>;
  const rel = path.basename(file);

  if (!d.plate || typeof d.plate !== "string") {
    throw new VaultError(
      `no page without a plate: ${rel} has no \`plate:\` in its frontmatter`,
    );
  }
  if (!plateExists(d.plate)) {
    throw new VaultError(
      `no page without a plate: ${rel} names \`${d.plate}\`, which is not on disk`,
    );
  }
  if (!d.world || typeof d.world !== "string") {
    throw new VaultError(`page ${rel} has no \`world:\``);
  }

  return pageFrom(d, fm.content.trim(), file, d.plate);
}

/**
 * The same parse, refusing nothing but a page with no world.
 *
 * Critic round one, deduction 7: "Delete one `plate:` line anywhere and every
 * world becomes a Next 500 page." The rule is right and the blast radius was
 * wrong. `parsePage` still throws, `scripts/cosmos-vault-check.ts` still calls it
 * and still exits 1, and the pre-commit hook now runs that check. What changes is
 * the RENDERER: a page whose plate went missing comes back with `plate: ""` and
 * mists over in the scene, which is what an untended page is supposed to do.
 * The world stays up; the check is where the refusal lives.
 *
 * Returns null only when the page names no world, because a page that belongs to
 * no world cannot be placed anywhere at all.
 */
export function parsePageLenient(
  text: string,
  file: string,
  plateExists: (plate: string) => boolean,
): { page: VaultPage | null; error: string | null } {
  let fm: ReturnType<typeof matter>;
  try {
    fm = matter(text);
  } catch (err) {
    return { page: null, error: `${path.basename(file)}: ${(err as Error).message}` };
  }
  const d = fm.data as Record<string, unknown>;
  const rel = path.basename(file);

  if (!d.world || typeof d.world !== "string") {
    return { page: null, error: `${rel} has no \`world:\`` };
  }

  const named = typeof d.plate === "string" ? d.plate : null;
  const ok = named !== null && plateExists(named);
  return {
    page: pageFrom(d, fm.content.trim(), file, ok ? named! : ""),
    error: ok
      ? null
      : named === null
        ? `${rel} has no \`plate:\``
        : `${rel} names \`${named}\`, which is not on disk`,
  };
}

/**
 * Resolve a vault-relative path (SCHEMA.md: "relative to the cosmos root", and it
 * "may point into ../self/wall/plates/"). Returns an absolute path plus which of
 * the two allowlisted roots it belongs to, or null when it escapes both.
 */
export function resolveVaultPath(
  root: string,
  rel: string,
): { abs: string; scope: "vault" | "wall"; rel: string } | null {
  const vaultRoot = path.resolve(root);
  const wallRoot = path.resolve(path.join(root, "..", "self", "wall", "plates"));
  const abs = path.resolve(vaultRoot, rel);

  if (abs === vaultRoot || abs.startsWith(vaultRoot + path.sep)) {
    return { abs, scope: "vault", rel: path.relative(vaultRoot, abs) };
  }
  if (abs === wallRoot || abs.startsWith(wallRoot + path.sep)) {
    return { abs, scope: "wall", rel: path.relative(wallRoot, abs) };
  }
  return null;
}

/**
 * The extensionless asset URL for a vault-relative path. The extension is dropped
 * on purpose: plates never sit in `public/`, and the URL should not advertise the
 * file type of a private painting (plan 7g-1).
 */
export function assetUrl(root: string, rel: string): string | null {
  const r = resolveVaultPath(root, rel);
  if (!r) return null;
  const noExt = r.rel.replace(/\.[a-z0-9]+$/i, "");
  const segments = noExt.split(path.sep).map(encodeURIComponent).join("/");
  return `/api/cosmos/asset/${r.scope}/${segments}`;
}

// ── IO ───────────────────────────────────────────────────────────────────────

const PAGE_DIRS = [
  "figures",
  "places",
  "objects",
  "creeds",
  "chapters",
  "seasons",
  "lore",
];

function plateChecker(root: string): (plate: string) => boolean {
  return (plate: string) => {
    const r = resolveVaultPath(root, plate);
    if (!r) return false;
    return fs.existsSync(r.abs);
  };
}

/** Every world in the registry, world.yml merged in where one exists. */
export function readWorlds(root = cosmosRoot()): WorldEntry[] {
  const file = path.join(root, "worlds.yml");
  if (!fs.existsSync(file)) {
    throw new VaultError(`no worlds.yml at ${file}`);
  }
  return parseWorldsYml(fs.readFileSync(file, "utf8")).map((w) => {
    if (!w.worldFile) return w;
    const wf = path.join(root, w.worldFile);
    if (!fs.existsSync(wf)) return w;
    return parseWorldFile(fs.readFileSync(wf, "utf8"), w);
  });
}

export function readWorld(id: string, root = cosmosRoot()): WorldEntry | null {
  return readWorlds(root).find((w) => w.id === id) ?? null;
}

/**
 * Every page for a world. Throws on the first plateless page, by contract.
 * Drafts are filtered out unless `drafts` is true.
 */
export function readPages(
  worldId: string,
  opts: { drafts?: boolean } = {},
  root = cosmosRoot(),
): VaultPage[] {
  const exists = plateChecker(root);
  const out: VaultPage[] = [];

  for (const dir of PAGE_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).sort()) {
      if (!name.endsWith(".md")) continue;
      const file = path.join(abs, name);
      const page = parsePage(fs.readFileSync(file, "utf8"), file, exists);
      if (page.world !== worldId) continue;
      if (page.status === "draft" && !opts.drafts) continue;
      out.push(page);
    }
  }
  return out;
}

/** `state/weather.json`, or all-nulls when the witness has not run. */
export function readWeather(root = cosmosRoot()): Record<string, unknown> {
  const file = path.join(root, "state", "weather.json");
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

/** The raw `state/attention.json` object, page keys and the `hero` key together. */
function readAttentionRaw(root: string): Record<string, unknown> {
  const file = path.join(root, "state", "attention.json");
  if (!fs.existsSync(file)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * `state/attention.json`: `{ page_id: last_touched }`. Mist reads it, never deletes.
 * The reserved `hero` key holds where PG last stood and is filtered out here, so
 * the attention map stays exactly what its name says.
 */
export function readAttention(root = cosmosRoot()): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(readAttentionRaw(root))) {
    if (k !== HERO_KEY && typeof v === "string") out[k] = v;
  }
  return out;
}

/** The reserved key in `state/attention.json` that is a position, not a timestamp. */
export const HERO_KEY = "hero";

export interface HeroState {
  world: string;
  x: number;
  z: number;
}

/**
 * Where PG last stood. The never-restart proof on the survival side: a fresh load
 * lands the hero where he left off, because the position is a file in a git repo
 * and not a number in a browser's localStorage.
 */
export function readHero(root = cosmosRoot()): HeroState | null {
  const raw = readAttentionRaw(root)[HERO_KEY];
  if (!raw || typeof raw !== "object") return null;
  const h = raw as Record<string, unknown>;
  if (typeof h.world !== "string") return null;
  if (typeof h.x !== "number" || typeof h.z !== "number") return null;
  return { world: h.world, x: h.x, z: h.z };
}

/**
 * One parsed LEDGER line. Named for what it is, not for what it becomes: a
 * `Monument` is the placed object in the forge world, and it is a different type
 * with a position on it.
 */
export interface LedgerLine {
  id: string;
  date: string;
  text: string;
}

/**
 * EXTENDS: `../self/LEDGER.md`, read in place. sources.yml gives the grammar
 * verbatim: "YYYY-MM-DD · GAME SAVED ✦ · what shipped". Nothing is written back:
 * the ledger is append-only and only PG appends to it.
 */
export function readMonuments(root = cosmosRoot(), limit = 24): LedgerLine[] {
  const file = path.resolve(path.join(root, "..", "self", "LEDGER.md"));
  if (!fs.existsSync(file)) return [];
  const out: LedgerLine[] = [];
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^-\s*(\d{4}-\d{2}-\d{2})\s*·\s*GAME SAVED[^·]*·\s*(.+)$/);
    if (!m) continue;
    out.push({ id: `ledger-${out.length}-${m[1]}`, date: m[1], text: m[2].trim() });
  }
  return out.slice(-limit);
}

/** The number of loop frames actually on disk, so the scene never asks for a 404. */
export function loopFrames(worldId: string, root = cosmosRoot()): string[] {
  const dir = path.join(root, "worlds", worldId, "plates", "loop");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^frame-\d+\.webp$/.test(f))
    .sort()
    .map((f) => `/api/cosmos/asset/vault/worlds/${worldId}/plates/loop/${f.replace(/\.webp$/, "")}`);
}

/**
 * The scene's hero URL for one source. Prefers the generated webp in the vault
 * (`plates/hero.webp`, `plates/hero-b.webp`), which is sized and compressed for
 * the plane; falls back to the raw plate the manifest names, so a world that has
 * not been through the frame cut still renders.
 */
export function heroUrlFor(
  worldId: string,
  which: "a" | "b",
  platePath: string | null,
  root = cosmosRoot(),
): string | null {
  const name = which === "a" ? "hero" : "hero-b";
  if (fs.existsSync(path.join(root, "worlds", worldId, "plates", `${name}.webp`))) {
    return `/api/cosmos/asset/vault/worlds/${worldId}/plates/${name}`;
  }
  return platePath ? assetUrl(root, platePath) : null;
}

/** The inline 32 px blur-up, as a data URI so first paint costs no round trip. */
export function heroLqipDataUri(worldId: string, root = cosmosRoot()): string | null {
  const file = path.join(root, "worlds", worldId, "plates", "hero-lqip.webp");
  if (!fs.existsSync(file)) return null;
  return `data:image/webp;base64,${fs.readFileSync(file).toString("base64")}`;
}

// ── The layout contract, and the manifest the scene builds against ───────────

/**
 * ONE manifest per world, and it is the only thing that crosses to the client.
 *
 * Round one shipped a `SceneManifest` of plate planes and scroll geometry. Round
 * two walks a plane instead of scrolling a painting (plan 7i), so the shape is
 * rooms, lights and doors: "world.yml gains layout: (origin, size, ground,
 * rooms[] with id, anchor {x,z}, size {w,d}, purpose, lights[], objects[],
 * doors[] with to and kind)".
 *
 * Ids, geometry and asset URLs only. PROSE NEVER TRAVELS. Bodies are fetched one
 * page at a time from /api/cosmos/body, behind the gate, when a page unfolds, so
 * a `/_next` chunk (served unauthenticated by the middleware passthrough) can
 * never carry a line PG wrote.
 */
export type WorldPhase = "day" | "twilight" | "midnight" | "clock";

export type RoomPurpose =
  | "traversal"
  | "orientation"
  | "recovery"
  | "reward"
  | "transition"
  | "objective";

export type LightEmitter =
  | "lantern"
  | "torch"
  | "brazier"
  | "altar"
  | "fire"
  | "window";

export type Light = {
  emitter: LightEmitter;
  at: { x: number; z: number };
  range: number;
  color: string;
  intensity: number;
};

export type Door = { to: string; kind: "mist" | "stairs"; at: { x: number; z: number } };

export type Room = {
  id: string;
  anchor: { x: number; z: number };
  size: { w: number; d: number };
  purpose: RoomPurpose;
  lights: Light[];
  objects: string[];
  doors: Door[];
};

export type SceneObject = {
  id: string;
  type: string;
  title: string;
  room: string;
  at: { x: number; z: number };
  plate: { url: string; lqip: string } | null;
  touched: string | null;
  weight: number;
};

export type Monument = {
  id: string;
  date: string;
  line: string;
  at: { x: number; z: number };
};

export type WorldManifest = {
  id: string;
  title: string;
  register: Register;
  phase: WorldPhase;
  private: boolean;
  layout: {
    origin: { x: number; z: number };
    size: { w: number; d: number };
    ground: string;
    rooms: Room[];
  };
  objects: SceneObject[];
  monuments: Monument[];
  thread: { season: string; chapter: { id: string; title: string; line: string } | null };
  weather: Record<string, number | string | null>;
  attention: Record<string, string>;
  hero: { world: string; x: number; z: number } | null;
  backdrop: { url: string; lqip: string } | null;
  bed: string | null;
};

const PURPOSES: RoomPurpose[] = [
  "traversal",
  "orientation",
  "recovery",
  "reward",
  "transition",
  "objective",
];

const EMITTERS: LightEmitter[] = [
  "lantern",
  "torch",
  "brazier",
  "altar",
  "fire",
  "window",
];

/** Every light is motivated by a thing you can see (plan 7i, strategy point 6). */
const EMITTER_DEFAULTS: Record<LightEmitter, { range: number; color: string; intensity: number }> = {
  lantern: { range: 6, color: "#EAA050", intensity: 1.1 },
  torch: { range: 7, color: "#E8903C", intensity: 1.3 },
  brazier: { range: 9, color: "#D8702C", intensity: 1.5 },
  altar: { range: 8, color: "#F0D8A0", intensity: 1.2 },
  fire: { range: 10, color: "#E86828", intensity: 1.6 },
  window: { range: 12, color: "#C8C0E0", intensity: 0.7 },
};

/**
 * The ground a register stands on, when world.yml names none. These are MATERIAL
 * KEYS, not colours: the scene owns what stone looks like in each register, and a
 * hex here would be the reader deciding a thing that is not its to decide.
 */
const GROUND_BY_REGISTER: Record<Register, string> = {
  painted: "stone",
  riso: "grass",
  paperback: "ash",
  watercolor: "water",
};

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asSize(v: unknown, fallback: { w: number; d: number }): { w: number; d: number } {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return { w: num(o.w, fallback.w), d: num(o.d, fallback.d) };
  }
  return fallback;
}

function asPurpose(v: unknown): RoomPurpose {
  return typeof v === "string" && (PURPOSES as string[]).includes(v)
    ? (v as RoomPurpose)
    : "traversal";
}

/** `emitter:` is the field; `type:` is accepted as its alias (the plan names both). */
function asEmitter(v: unknown, alias: unknown): LightEmitter {
  for (const candidate of [v, alias]) {
    if (typeof candidate === "string" && (EMITTERS as string[]).includes(candidate)) {
      return candidate as LightEmitter;
    }
  }
  return "lantern";
}

export function parseLight(raw: unknown, roomAnchor: { x: number; z: number }): Light {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const emitter = asEmitter(o.emitter, o.type);
  const d = EMITTER_DEFAULTS[emitter];
  return {
    emitter,
    at: asPoint(o.at) ?? roomAnchor,
    range: num(o.range, d.range),
    color: typeof o.color === "string" ? o.color : d.color,
    intensity: num(o.intensity, d.intensity),
  };
}

export function parseDoor(raw: unknown, roomAnchor: { x: number; z: number }): Door | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (typeof o.to !== "string" || !o.to) return null;
  return {
    to: o.to,
    kind: o.kind === "stairs" ? "stairs" : "mist",
    at: asPoint(o.at) ?? roomAnchor,
  };
}

export function parseRoom(id: string, raw: unknown): Room {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const anchor = asPoint(o.anchor) ?? { x: 0, z: 0 };
  return {
    id,
    anchor,
    size: asSize(o.size, { w: 12, d: 12 }),
    purpose: asPurpose(o.purpose),
    lights: Array.isArray(o.lights) ? o.lights.map((l) => parseLight(l, anchor)) : [],
    // Filled from the pages that name this room; a `objects:` list in the yml is
    // an author's hint and is merged in, never trusted on its own.
    objects: Array.isArray(o.objects) ? o.objects.filter((x): x is string => typeof x === "string") : [],
    doors: Array.isArray(o.doors)
      ? o.doors.map((d) => parseDoor(d, anchor)).filter((d): d is Door => d !== null)
      : [],
  };
}

export interface WorldLayout {
  origin: { x: number; z: number };
  size: { w: number; d: number };
  ground: string;
  rooms: Room[];
}

/** Default footprint, when a world.yml names no size. */
const DEFAULT_SIZE = { w: 40, d: 40 };
/** Mist between two biomes when neither names an origin. */
const DEFAULT_GAP = 8;

/**
 * Where a world sits on the shared plane when its world.yml names no origin.
 *
 * `origin` is the CENTRE of a world's rectangle, and the scene finds which biome
 * a point is in by testing those rectangles, so five worlds all defaulting to
 * {0,0} would stack and only the first would ever be reachable. They tile along x
 * in registry order instead: quiet-practice, the home base, sits at the origin
 * and the rest run east of it. The cartographer's `layout.origin` overrides this
 * the moment one lands.
 */
export function defaultOrigin(index: number): { x: number; z: number } {
  return { x: index * (DEFAULT_SIZE.w + DEFAULT_GAP), z: 0 };
}

/**
 * One room, the size of the world, lit by one lantern. What a world gets before
 * the cartographer has drawn it, so an `unbuilt` biome is still ground you can
 * stand on and a border you can cross rather than a 404.
 */
export function defaultLayout(register: Register, index = 0): WorldLayout {
  const origin = defaultOrigin(index);
  return {
    origin,
    size: { ...DEFAULT_SIZE },
    ground: GROUND_BY_REGISTER[register],
    rooms: [
      {
        id: "field",
        anchor: { ...origin },
        size: { ...DEFAULT_SIZE },
        purpose: "orientation",
        lights: [{ emitter: "lantern", at: { ...origin }, ...EMITTER_DEFAULTS.lantern }],
        objects: [],
        doors: [],
      },
    ],
  };
}

/**
 * The `layout:` block of a world.yml. `rooms:` may be a map of id to room, or a
 * list of rooms each carrying its own `id:`. Both shapes read the same here, so
 * the cartographer can write whichever is clearer per world.
 */
export function parseLayout(raw: unknown, register: Register, index = 0): WorldLayout {
  const fallback = defaultLayout(register, index);
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;

  let rooms: Room[] = [];
  if (Array.isArray(o.rooms)) {
    rooms = o.rooms
      .map((r) => {
        const rr = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
        return typeof rr.id === "string" ? parseRoom(rr.id, rr) : null;
      })
      .filter((r): r is Room => r !== null);
  } else if (o.rooms && typeof o.rooms === "object") {
    rooms = Object.entries(o.rooms as Record<string, unknown>).map(([id, r]) =>
      parseRoom(id, r),
    );
  }

  return {
    origin: asPoint(o.origin) ?? fallback.origin,
    size: asSize(o.size, fallback.size),
    ground: typeof o.ground === "string" ? o.ground : fallback.ground,
    rooms: rooms.length ? rooms : fallback.rooms,
  };
}

/** The raw `layout:` block, straight off a world.yml, or null when there is none. */
export function readLayoutBlock(worldFile: string | null, root: string): unknown {
  if (!worldFile) return null;
  const abs = path.join(root, worldFile);
  if (!fs.existsSync(abs)) return null;
  try {
    const parsed = yamlEngine.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown> | null;
    return parsed && typeof parsed === "object" ? parsed.layout ?? null : null;
  } catch {
    return null;
  }
}

// ── Placement ────────────────────────────────────────────────────────────────

/** FNV-1a, the same hash the round-one layout used. Same page, same spot, forever. */
function hash(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Where a page with no `at:` stands. A deterministic point inside its room, on a
 * ring at 62 percent of the room's half-size so nothing lands on the anchor (the
 * anchor is where the room's own light and its place page sit) and nothing lands
 * on the wall. Index spreads the ring; the hash jitters it.
 */
export function placeInRoom(id: string, index: number, total: number, room: Room): { x: number; z: number } {
  const h = hash(id);
  const jitter = (h % 1000) / 1000;
  const angle = ((index + 0.5) / Math.max(total, 1)) * Math.PI * 2 + jitter * 0.6;
  const rx = (room.size.w / 2) * 0.62;
  const rz = (room.size.d / 2) * 0.62;
  return {
    x: round2(room.anchor.x + Math.cos(angle) * rx * (0.72 + jitter * 0.28)),
    z: round2(room.anchor.z + Math.sin(angle) * rz * (0.72 + jitter * 0.28)),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Monuments stand along the LONG axis of their room, oldest first (Critic round
 * one, deduction 3: they were hanging in the sky over the quiet practice; they
 * belong "out of the quiet practice, on the ground, in the forge"). The room is
 * the forge's `monuments` room. In date order, evenly spaced, on the ground.
 */
export function placeMonuments(
  lines: { id: string; date: string; text: string }[],
  room: Room,
): Monument[] {
  const long = room.size.w >= room.size.d ? "x" : "z";
  const span = (long === "x" ? room.size.w : room.size.d) * 0.86;
  const n = lines.length;
  const sorted = [...lines].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((m, i) => {
    const t = n <= 1 ? 0.5 : i / (n - 1);
    const offset = (t - 0.5) * span;
    // A gentle stagger across the short axis so the row reads as a path and not
    // a ruler; deterministic, so a new ship never moves an old stone.
    const sway = (((hash(m.id) % 200) / 200) - 0.5) * (long === "x" ? room.size.d : room.size.w) * 0.22;
    return {
      id: m.id,
      date: m.date,
      line: m.text,
      at:
        long === "x"
          ? { x: round2(room.anchor.x + offset), z: round2(room.anchor.z + sway) }
          : { x: round2(room.anchor.x + sway), z: round2(room.anchor.z + offset) },
    };
  });
}

// ── The thread ───────────────────────────────────────────────────────────────

/** Season anchor: "Seasons are his birthday quarters (Q1 starts Oct 2)" (PROMPT.md). */
export const SEASON_START = "2026-10-02";
export const SEASON_LENGTH = 91;

/**
 * A PURE FUNCTION of the date, and it writes nothing (plan 7h, D14: writing
 * `season_started_at` into Hero's Chronicle resets tier ratchets, which is a wipe,
 * and tiers are grades). The same function the witness route computes `season_day`
 * with; exported here so the thread panel and the weather cannot disagree.
 */
export function seasonOf(now = new Date()): { quarter: number; day: number; name: string } {
  const start = new Date(`${SEASON_START}T00:00:00`);
  const since = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  const day = (((since % SEASON_LENGTH) + SEASON_LENGTH) % SEASON_LENGTH) + 1;
  const index = Math.floor(since / SEASON_LENGTH);
  const quarter = (((index % 4) + 4) % 4) + 1;
  return { quarter, day, name: `Q${quarter}` };
}

/**
 * The newest draft chapter: its title and its first real line. Never a task,
 * never a count (plan 7i: the MAIN THREAD panel is "the witness's last draft
 * chapter title and one line, plus the season name").
 *
 * "First real line" skips frontmatter (already stripped), HTML comments, and the
 * blockquote marker, because a chapter's opening line is usually PG's own words
 * quoted back at him.
 */
export function firstLine(body: string): string {
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("<!--")) continue;
    const text = line.replace(/^>\s?/, "").trim();
    if (text) return text;
  }
  return "";
}

export function newestDraftChapter(
  root = cosmosRoot(),
): { id: string; title: string; line: string } | null {
  const dir = path.join(root, "chapters");
  if (!fs.existsSync(dir)) return null;
  const names = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();
  for (const name of names) {
    const file = path.join(dir, name);
    let fm: ReturnType<typeof matter>;
    try {
      fm = matter(fs.readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    const d = fm.data as Record<string, unknown>;
    if (d.status !== "draft") continue;
    return {
      id: String(d.id ?? name.replace(/\.md$/, "")),
      title: String(d.title ?? d.id ?? name),
      line: firstLine(fm.content),
    };
  }
  return null;
}

// ── The manifest ─────────────────────────────────────────────────────────────

/** A page's blur-up: its own `-lqip.webp` sibling, else the world's hero LQIP. */
function plateLqip(plate: string, root: string, worldFallback: string | null): string {
  const r = resolveVaultPath(root, plate);
  if (r) {
    const sibling = r.abs.replace(/\.[a-z0-9]+$/i, "-lqip.webp");
    if (fs.existsSync(sibling)) {
      return `data:image/webp;base64,${fs.readFileSync(sibling).toString("base64")}`;
    }
  }
  return worldFallback ?? "";
}

/** The page types that stand as props in a room. `place` pages ARE their room. */
const OBJECT_TYPES = new Set(["object", "creed", "chapter", "lore"]);

/**
 * Every page of a world, with a plateless page kept rather than thrown (the
 * lenient path; see `parsePageLenient`). Logs ONCE per read, naming the count and
 * the first offender, so a missing plate is loud in the log and quiet on screen.
 */
export function readPagesForScene(
  worldId: string,
  opts: { drafts?: boolean } = {},
  root = cosmosRoot(),
): VaultPage[] {
  const exists = plateChecker(root);
  const out: VaultPage[] = [];
  const problems: string[] = [];

  for (const dir of PAGE_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).sort()) {
      if (!name.endsWith(".md")) continue;
      const file = path.join(abs, name);
      const { page, error } = parsePageLenient(fs.readFileSync(file, "utf8"), file, exists);
      if (!page) {
        if (error) problems.push(error);
        continue;
      }
      if (page.world !== worldId) continue;
      if (page.status === "draft" && !opts.drafts) continue;
      if (error) problems.push(error);
      out.push(page);
    }
  }

  if (problems.length) {
    console.warn(
      `[cosmos] ${worldId}: ${problems.length} page(s) without a usable plate; they mist. First: ${problems[0]}`,
    );
  }
  return out;
}

/** One page's body, for the gated per-page fetch. Null when there is no such page. */
export function readPageBody(
  id: string,
  root = cosmosRoot(),
): { id: string; title: string; type: string; world: string; body: string } | null {
  const exists = plateChecker(root);
  for (const dir of PAGE_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).sort()) {
      if (!name.endsWith(".md")) continue;
      const file = path.join(abs, name);
      const { page } = parsePageLenient(fs.readFileSync(file, "utf8"), file, exists);
      if (!page || page.id !== id) continue;
      return {
        id: page.id,
        title: page.title,
        type: page.type,
        world: page.world,
        body: page.body,
      };
    }
  }
  return null;
}

function asWorldPhase(v: string | null): WorldPhase {
  if (v === "day" || v === "twilight" || v === "clock") return v;
  if (v === "midnight" || v === "night") return "midnight";
  // Sky by hour returns in round two (plan 7i: "D9 lifted"), so a world that
  // pins nothing follows the clock rather than freezing at one hour.
  return "clock";
}

/**
 * ONE manifest per world. This is the function the scene builds against.
 *
 * It never throws for content reasons: an unbuilt world with no folder returns a
 * default layout and an empty prop list, and a plateless page comes back misted.
 * It returns null only when the world is not in `worlds.yml` at all.
 */
export function readWorldManifest(
  worldId: string,
  opts: { drafts?: boolean } = {},
  root = cosmosRoot(),
): WorldManifest | null {
  const registry = readWorlds(root);
  const index = registry.findIndex((w) => w.id === worldId);
  if (index < 0) return null;
  const world = registry[index];

  const register: Register = world.register ?? "painted";
  const layout = parseLayout(readLayoutBlock(world.worldFile, root), register, index);
  const roomById = new Map(layout.rooms.map((r) => [r.id, r]));
  const firstRoom =
    layout.rooms.find((r) => r.purpose === "orientation") ?? layout.rooms[0];

  const worldLqip = heroLqipDataUri(worldId, root);
  const pages = readPagesForScene(worldId, opts, root);
  const attention = readAttention(root);

  // Group by room first, so `at`-less pages spread inside their own room rather
  // than around the whole world.
  const byRoom = new Map<string, VaultPage[]>();
  for (const p of pages) {
    if (p.type !== "place" && !OBJECT_TYPES.has(p.type)) continue;
    const roomId = p.room && roomById.has(p.room) ? p.room : firstRoom.id;
    const list = byRoom.get(roomId) ?? [];
    list.push(p);
    byRoom.set(roomId, list);
  }

  const objects: SceneObject[] = [];
  for (const [roomId, list] of byRoom) {
    const room = roomById.get(roomId) ?? firstRoom;
    // A `place` page IS its room, so it stands on the anchor. Exactly one can:
    // two objects at the same point is a thing you cannot click. The rest of the
    // places in a room take a ring position like everything else, until the
    // cartographer gives each its own room.
    let anchorTaken = false;
    list.forEach((p, i) => {
      let at = p.at;
      if (!at && p.type === "place" && !anchorTaken) {
        at = { ...room.anchor };
        anchorTaken = true;
      }
      objects.push({
        id: p.id,
        type: p.type,
        title: p.title,
        room: room.id,
        at: at ?? placeInRoom(p.id, i, list.length, room),
        plate: p.plate
          ? { url: assetUrl(root, p.plate) ?? "", lqip: plateLqip(p.plate, root, worldLqip) }
          : null,
        touched: p.touched ?? attention[p.id] ?? null,
        weight: p.weight,
      });
    });
  }

  // Room.objects is exactly the ids standing in that room, so nothing the scene
  // looks up by id can dangle.
  const placed = new Map<string, string[]>();
  for (const o of objects) {
    const list = placed.get(o.room) ?? [];
    list.push(o.id);
    placed.set(o.room, list);
  }
  const rooms = layout.rooms.map((r) => ({
    ...r,
    objects: Array.from(new Set([...(placed.get(r.id) ?? [])])),
  }));

  // Monuments are the forge's, and only the forge's (Critic round one, 3).
  let monuments: Monument[] = [];
  if (worldId === "forge") {
    const room =
      rooms.find((r) => r.id === "monuments") ??
      rooms.find((r) => r.purpose === "reward") ??
      rooms[0];
    monuments = placeMonuments(readMonuments(root, 400), room);
  }

  const weatherRaw = readWeather(root) as Record<string, unknown>;
  const weather: Record<string, number | string | null> = {};
  for (const [k, v] of Object.entries(weatherRaw)) {
    weather[k] = typeof v === "number" || typeof v === "string" ? v : null;
  }

  const heroPlateUrl = heroUrlFor(worldId, "a", world.heroPlate, root);

  return {
    id: world.id,
    title: world.title,
    register,
    phase: asWorldPhase(world.phase),
    private: world.private,
    layout: { origin: layout.origin, size: layout.size, ground: layout.ground, rooms },
    objects,
    monuments,
    thread: { season: seasonOf().name, chapter: newestDraftChapter(root) },
    weather,
    attention,
    hero: readHero(root),
    backdrop: heroPlateUrl ? { url: heroPlateUrl, lqip: worldLqip ?? "" } : null,
    bed: world.bed,
  };
}

/** Every world in the registry, unbuilt ones included, so a biome switch is free. */
export function readAllManifests(
  opts: { drafts?: boolean } = {},
  root = cosmosRoot(),
): WorldManifest[] {
  const out: WorldManifest[] = [];
  for (const w of readWorlds(root)) {
    const m = readWorldManifest(w.id, opts, root);
    if (m) out.push(m);
  }
  return out;
}

/**
 * The name the scene half looks up (`src/app/cosmos/_scene/contract.ts`): one
 * entry per world, ordered as `worlds.yml` orders them, laid out on one shared
 * ground plane by each world's `layout.origin`.
 */
export const readCosmosManifest = readAllManifests;
