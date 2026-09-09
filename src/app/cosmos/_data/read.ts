/**
 * The seam between the two halves of round two.
 *
 * The keeper's reader emits `WorldManifest[]` from one optional export on
 * `src/lib/cosmos/vault.ts`. This module looks that export up at RUNTIME rather
 * than importing it, for one reason: the two halves are being built at the same
 * time in the same tree, and a scene that fails to compile because a reader has
 * not landed yet is a scene nobody can look at. Until it lands, the fixtures
 * drive, and the route is playable on day one.
 *
 * `?fixture=<name>` forces a fixture even once the reader exists. That is not a
 * development leftover: it is the Critic's harness, five deterministic states
 * that can be screenshotted and compared (`test-playable-web-games`).
 *
 * PROSE NEVER CROSSES. Bodies are read here, on the server, and rendered into
 * React nodes by the route. Only ids, titles, geometry and asset URLs go into
 * the manifest that reaches a client chunk, because `/_next` is served without
 * the cosmos cookie and `/cosmos` is not.
 */

import * as vault from "../../../lib/cosmos/vault";
import type { CosmosManifest, WorldManifest } from "../_scene/contract";
import { fixture, isFixtureName, FIXTURE_WORLDS } from "../_scene/fixtures";

/** The shape the keeper's reader will have. Looked up, never imported. */
type Reader = (
  opts?: { drafts?: boolean },
  root?: string,
) => WorldManifest[];

function reader(): Reader | null {
  const mod = vault as unknown as Record<string, unknown>;
  const fn = mod.readCosmosManifest;
  return typeof fn === "function" ? (fn as Reader) : null;
}

export interface PageText {
  body: string;
  /** The `source:` line. A citation, and never part of the body. */
  source: string | null;
}

/**
 * Every page's words, keyed by id. Read with the existing reader, which throws
 * on a plateless page by contract. The THROW IS CAUGHT HERE and only here: the
 * Critic's deduction 7 was that one bad page took every world down with a 500.
 * The rule still holds where it belongs, in the vault check and the pre-commit
 * hook; a renderer's job when a page is malformed is to leave that page in the
 * mist, not to close the world.
 */
export function readBodies(drafts: boolean): Record<string, PageText> {
  const out: Record<string, PageText> = {};
  try {
    const worlds = vault.readWorlds();
    for (const w of worlds) {
      if (w.status === "unbuilt") continue;
      try {
        for (const p of vault.readPages(w.id, { drafts })) {
          const extra = p as unknown as { source?: unknown };
          out[p.id] = {
            body: p.body,
            source: typeof extra.source === "string" ? extra.source : null,
          };
        }
      } catch {
        // One world's pages are unreadable. The others still stand.
      }
    }
  } catch {
    // No vault on this machine at all. The fixtures are the world today.
  }
  return out;
}

/** Season names are canon and canon is PG's. This is a label, not a name. */
export function seasonLabel(manifest: CosmosManifest): string {
  return manifest.thread.season || "between seasons";
}

export function readCosmos(opts: {
  fixture?: string | null;
  world?: string | null;
  drafts?: boolean;
}): CosmosManifest {
  const wanted = opts.fixture ?? null;
  if (isFixtureName(wanted)) {
    const f = fixture(wanted);
    return opts.world ? { ...f, focus: opts.world } : f;
  }

  const read = reader();
  const worlds: WorldManifest[] = read
    ? read({ drafts: opts.drafts })
    : FIXTURE_WORLDS;

  const home =
    worlds.find((w) => w.hero) ??
    worlds.find((w) => w.id === "quiet-practice") ??
    worlds[0];

  // Where he stood last, or the hall. Never a fresh spawn on a machine that
  // already knows: that is the whole never-restart proof for this route.
  const stored = worlds.map((w) => w.hero).find(Boolean) ?? null;
  const focusWorld = opts.world
    ? worlds.find((w) => w.id === opts.world)
    : undefined;

  const hero = focusWorld
    ? {
        world: focusWorld.id,
        x: focusWorld.layout.origin.x,
        z: focusWorld.layout.origin.z + focusWorld.layout.size.d * 0.28,
      }
    : (stored ?? {
        world: home?.id ?? "quiet-practice",
        x: home?.layout.origin.x ?? 0,
        z: (home?.layout.origin.z ?? 0) - 6.5,
      });

  const satchel = Object.entries(
    worlds.reduce<Record<string, string>>((acc, w) => ({ ...acc, ...w.attention }), {}),
  )
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([id]) => id);

  return {
    worlds,
    hero,
    thread: home?.thread ?? { season: "", chapter: null },
    focus: opts.world ?? null,
    fixture: null,
    satchel,
  };
}
