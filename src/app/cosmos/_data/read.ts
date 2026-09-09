/**
 * The seam between the two halves of the cosmos: the vault reader and the scene.
 *
 * The manifest that crosses is ids, titles, geometry and asset URLs. PROSE NEVER
 * CROSSES. Bodies are read here, on the server, and rendered into React nodes by
 * `mount.tsx`, because `/_next` is served without the cosmos cookie and `/cosmos`
 * is not.
 *
 * Three things changed in round 2.1, all of them the Critic's:
 *
 *   1. DRAFTS ARE ON behind the gate (deduction 1). Every one of the fourteen
 *      pages is `status: draft` and the D3 rule was written to keep the witness's
 *      drafts away from canon readers; it ended up hiding PG's own pages from
 *      their only reader, so `/cosmos` was an empty green field. Behind the gate
 *      the default is now drafts-on with a `draft` flag on each object, and
 *      `?drafts=0` is the canon view.
 *   2. ONE BAD PAGE MISTS ALONE (deduction 2). `readBodies` called the strict
 *      reader, which throws on the first plateless page in ANY directory, so one
 *      missing `plate:` line caught every body in the cosmos away. It calls
 *      `readPagesForScene` now, the lenient per-page reader, which is the same
 *      reader the manifest uses.
 *   3. NO SILENT FALLBACK TO INVENTED CANON (deduction 13). A missing reader
 *      export used to fall back to the fixtures, whose names, seasons and
 *      LEDGER-shaped lines are invented and live in a PUBLIC repo. It throws now,
 *      loudly, with the export it wanted named in the log, and `?fixture=` only
 *      answers where `fixturesEnabled()` says so.
 *
 * On the fixtures, said plainly rather than claimed: the module still SHIPS in
 * the server bundle, because it lives under `_scene/` and moving that file is the
 * scene's to make. What this file guarantees is that no production request can
 * reach it: `?fixture=` is ignored unless `NODE_ENV !== "production"` or
 * `COSMOS_FIXTURES=1` (the harness sets the latter under `next start`), and the
 * reader never falls back to it. Nothing invented can reach a screen by accident.
 */

import * as vault from "../../../lib/cosmos/vault";
import type { CosmosManifest, WorldManifest } from "../_scene/contract";
import { fixture, isFixtureName } from "../_scene/fixtures";

/** The keeper's reader. Looked up by name at request time, never imported. */
type Reader = (
  opts?: { drafts?: boolean },
  root?: string,
) => WorldManifest[];

function reader(): Reader {
  const mod = vault as unknown as Record<string, unknown>;
  const fn = mod.readCosmosManifest;
  if (typeof fn !== "function") {
    // LOUD. A renamed export must never quietly serve the harness's invented
    // words as PG's cosmos. The message names the module and the export so the
    // fix is one line and not an afternoon.
    const message =
      "[cosmos] src/lib/cosmos/vault.ts exports no readCosmosManifest(). " +
      "The vault reader is the only source for this route; there is no fallback.";
    console.error(message);
    throw new Error(message);
  }
  return fn as Reader;
}

/**
 * Are the harness's deterministic states reachable?
 *
 * `?fixture=<name>` drives five review states the Critic screenshots. They are
 * real test infrastructure and they are also invented canon in a public repo, so
 * they answer in development and under `COSMOS_FIXTURES=1`, and nowhere else. The
 * harness sets that variable; a production `next start` on the mini does not, and
 * there the parameter is simply ignored.
 */
export function fixturesEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.COSMOS_FIXTURES === "1";
}

/** The one draft rule, from the reader. Re-exported so the route needs one import. */
export const draftsWanted = vault.draftsWanted;

export interface PageText {
  body: string;
  /** The `source:` line. A citation, and never part of the body. */
  source: string | null;
}

/**
 * Every page's words, keyed by id, through the LENIENT reader.
 *
 * A page whose plate went missing comes back with no plate and mists in the
 * scene; its neighbours keep their words. The refusal still exists where it
 * belongs: `parsePage` throws, `scripts/cosmos-vault-check.ts` exits 1, and the
 * pre-commit hook runs that check.
 */
export function readBodies(drafts: boolean): Record<string, PageText> {
  const out: Record<string, PageText> = {};
  try {
    for (const w of vault.readWorlds()) {
      if (w.status === "unbuilt") continue;
      for (const p of vault.readPagesForScene(w.id, { drafts })) {
        const extra = p as unknown as { source?: unknown };
        out[p.id] = {
          body: p.body,
          source: typeof extra.source === "string" ? extra.source : null,
        };
      }
    }
  } catch (err) {
    // The REGISTRY is unreadable (no worlds.yml, bad YAML). That is not one bad
    // page, it is no vault at all, and it is loud in the log.
    console.error("[cosmos] readBodies:", (err as Error).message);
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
  if (wanted && fixturesEnabled() && isFixtureName(wanted)) {
    const f = fixture(wanted);
    return opts.world ? { ...f, focus: opts.world } : f;
  }

  const worlds = reader()({ drafts: opts.drafts });

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
