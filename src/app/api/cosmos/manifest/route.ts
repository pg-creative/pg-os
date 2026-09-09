/**
 * GET /api/cosmos/manifest — every world, so a biome switch costs no page load.
 *
 * EXTENDS: `src/app/api/projects/route.ts`, the existing "read the filesystem at
 * request time and return typed JSON" route. Same shape, one rule added: the
 * middleware fail-closes this path, so no cookie is a 404 and not a 401 (plan
 * 7g-1: a redirect or a 401 confirms the route exists).
 *
 * `?world=<id>` returns one manifest.
 *
 * DRAFTS ARE ON by default (round 2.1, the Critic's deduction 1: every one of the
 * fourteen pages is `status: draft`, so the D3 rule was hiding PG's own vault from
 * its only reader and the bare route answered with zero objects). Behind the gate
 * this is his vault; `?drafts=0` is the canon view, and every object carries a
 * `draft` flag so the panel can say which words are still waiting on his
 * "that one".
 *
 * The payload is ids, geometry and asset URLs. PROSE NEVER TRAVELS: bodies come
 * one at a time from /api/cosmos/body when a page unfolds.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  cosmosRoot,
  draftsWanted,
  readAllManifests,
  readWorldManifest,
} from "../../../../lib/cosmos/vault";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const drafts = draftsWanted(req.nextUrl.searchParams.get("drafts"));
  const only = req.nextUrl.searchParams.get("world");
  const root = cosmosRoot();

  try {
    if (only) {
      const m = readWorldManifest(only, { drafts }, root);
      if (!m) return new NextResponse(null, { status: 404 });
      return NextResponse.json({ worlds: [m], drafts });
    }
    return NextResponse.json({ worlds: readAllManifests({ drafts }, root), drafts });
  } catch (err) {
    // The registry itself is unreadable (no worlds.yml, bad YAML). That is a
    // real fault and it is loud in the log, but it still answers 404 rather than
    // printing a stack trace at a URL that is supposed to look like it does not
    // exist.
    console.error("[cosmos] manifest:", (err as Error).message);
    return new NextResponse(null, { status: 404 });
  }
}
