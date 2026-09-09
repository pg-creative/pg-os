/**
 * GET /api/cosmos/manifest — every world, so a biome switch costs no page load.
 *
 * EXTENDS: `src/app/api/projects/route.ts`, the existing "read the filesystem at
 * request time and return typed JSON" route. Same shape, one rule added: the
 * middleware fail-closes this path, so no cookie is a 404 and not a 401 (plan
 * 7g-1: a redirect or a 401 confirms the route exists).
 *
 * `?world=<id>` returns one manifest, `?drafts=1` includes `status: draft` pages.
 * The payload is ids, geometry and asset URLs. PROSE NEVER TRAVELS: bodies come
 * one at a time from /api/cosmos/body when a page unfolds.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  cosmosRoot,
  readAllManifests,
  readWorldManifest,
} from "../../../../lib/cosmos/vault";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const drafts = req.nextUrl.searchParams.get("drafts") === "1";
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
