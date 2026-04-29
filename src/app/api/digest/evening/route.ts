/**
 * GET /api/digest/evening
 *
 * State snapshot for evening briefings. Superset of the morning digest —
 * includes ships completed today, tier-change detection, and tomorrow's
 * top task.
 *
 * Bypasses middleware via the X-PGOS-Internal-Secret header.
 * 401 if header is missing or wrong.
 */

import { NextRequest, NextResponse } from "next/server";
import { assembleEveningDigest } from "@/lib/digest";

const INTERNAL_SECRET =
  process.env.PGOS_INTERNAL_SECRET ?? process.env.PGOS_SHARED_SECRET ?? "";

export async function GET(req: NextRequest) {
  const headerSecret = req.headers.get("x-pgos-internal-secret") ?? "";
  if (!INTERNAL_SECRET || headerSecret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const digest = await assembleEveningDigest();
    return NextResponse.json(digest);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[digest/evening] assembly failed:", msg);
    return NextResponse.json(
      { ok: false, error: "digest_failed", detail: msg },
      { status: 500 },
    );
  }
}
