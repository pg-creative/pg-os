/**
 * POST /api/cosmos/touch — attention, and where he stands. Nothing else.
 *
 * EXTENDS: `src/app/api/capture/route.ts`, the existing pattern of a small POST
 * that writes one file under a known root and returns what it did. The write and
 * the commit live in `src/lib/cosmos/state.ts`; this route is validation only.
 *
 * Two bodies:
 *   { "id": "the-stone-hall" }                       a dwell
 *   { "hero": { "world": "quiet-practice", x, z } }  a step
 * Both may arrive in one POST. Ids that are not real pages are refused, so a
 * stray POST cannot grow the file; a hero position for a world that is not in
 * `worlds.yml` is refused for the same reason.
 *
 * `state/attention.json` is `{ page_id: last_touched }` plus the reserved `hero`
 * key. Mist is a function of days since touched and it NEVER deletes: a key only
 * ever gets a newer timestamp, and nothing here removes one.
 *
 * It does NOT write `touched:` into a page's frontmatter. SCHEMA.md is explicit
 * that the witness owns that field and a hand never writes it, so the panel
 * records that PG looked and stops there.
 */

import { NextRequest, NextResponse } from "next/server";
import { cosmosRoot, readPagesForScene, readWorlds } from "../../../../lib/cosmos/vault";
import { setHero, touchPage } from "../../../../lib/cosmos/state";

export const dynamic = "force-dynamic";

/** Only ids that are real pages get written, so a stray POST cannot grow the file. */
function knownPageIds(root: string): Set<string> {
  const ids = new Set<string>();
  for (const w of readWorlds(root)) {
    for (const p of readPagesForScene(w.id, { drafts: true }, root)) ids.add(p.id);
  }
  return ids;
}

function knownWorldIds(root: string): Set<string> {
  return new Set(readWorlds(root).map((w) => w.id));
}

export async function POST(req: NextRequest) {
  let body: { id?: unknown; hero?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const root = cosmosRoot();
  const id = typeof body.id === "string" ? body.id : null;
  const heroRaw =
    body.hero && typeof body.hero === "object"
      ? (body.hero as Record<string, unknown>)
      : null;

  if (!id && !heroRaw) {
    return NextResponse.json({ ok: false, error: "no id, no hero" }, { status: 400 });
  }

  let touched: string | null = null;
  if (id) {
    if (!knownPageIds(root).has(id)) {
      return NextResponse.json({ ok: false, error: "unknown page" }, { status: 404 });
    }
    touched = await touchPage(id, root);
  }

  let hero: { world: string; x: number; z: number } | null = null;
  if (heroRaw) {
    const world = typeof heroRaw.world === "string" ? heroRaw.world : null;
    const x = typeof heroRaw.x === "number" ? heroRaw.x : null;
    const z = typeof heroRaw.z === "number" ? heroRaw.z : null;
    if (!world || x === null || z === null || !Number.isFinite(x) || !Number.isFinite(z)) {
      return NextResponse.json({ ok: false, error: "bad hero" }, { status: 400 });
    }
    if (!knownWorldIds(root).has(world)) {
      return NextResponse.json({ ok: false, error: "unknown world" }, { status: 404 });
    }
    hero = { world, x, z };
    await setHero(hero, root);
  }

  return NextResponse.json({ ok: true, id, touched, hero });
}
