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
  plate: string;
  register: Register | null;
  private: boolean;
  status: "canon" | "draft";
  body: string;
  file: string;
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

  return {
    id: String(d.id ?? rel.replace(/\.md$/, "")),
    type: String(d.type ?? "lore"),
    title: String(d.title ?? d.id ?? rel),
    world: d.world,
    plate: d.plate,
    register: asRegister(d.register),
    private: d.private === true,
    status: d.status === "canon" ? "canon" : "draft",
    body: fm.content.trim(),
    file,
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

/** `state/attention.json`: `{ page_id: last_touched }`. Mist reads it, never deletes. */
export function readAttention(root = cosmosRoot()): Record<string, string> {
  const file = path.join(root, "state", "attention.json");
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

export interface Monument {
  id: string;
  date: string;
  text: string;
}

/**
 * EXTENDS: `../self/LEDGER.md`, read in place. sources.yml gives the grammar
 * verbatim: "YYYY-MM-DD · GAME SAVED ✦ · what shipped". Nothing is written back:
 * the ledger is append-only and only PG appends to it.
 */
export function readMonuments(root = cosmosRoot(), limit = 24): Monument[] {
  const file = path.resolve(path.join(root, "..", "self", "LEDGER.md"));
  if (!fs.existsSync(file)) return [];
  const out: Monument[] = [];
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
