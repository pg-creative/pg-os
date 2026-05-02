/**
 * GET /api/briefing
 *
 * Returns today's morning briefing JSON. In-memory cache keyed by local date.
 * Pass ?force=1 to bypass the cache and regenerate (used by the Regenerate button).
 *
 * Per-day cache key (e.g. "2026-05-02") survives this server process; rebuilt on
 * server restart or after midnight.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildBriefing, type Briefing } from "@/lib/briefing";

const cache = new Map<string, Briefing>();

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get("force") === "1";
  const key = todayKey();

  if (!force && cache.has(key)) {
    return NextResponse.json({ briefing: cache.get(key), cached: true, key });
  }

  const briefing = await buildBriefing();
  cache.set(key, briefing);
  return NextResponse.json({ briefing, cached: false, key });
}
