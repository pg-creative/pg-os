import { NextRequest, NextResponse } from "next/server";
import { buildNarration, type Narration } from "@/lib/claudeNarration";
import { listAgentRuns } from "@/lib/agentRunsStore";

const FALLBACK: Narration = {
  narration:
    "Watching the patterns. Nothing strident this week — last review still holds.",
  updatedAt: new Date().toISOString(),
  targets: [],
};

// Module-scope in-process cache: key = YYYY-MM-DD UTC
const cache = new Map<string, Narration>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const force = new URL(req.url).searchParams.get("force");
    const key = todayKey();

    const cached = cache.get(key);
    let needRebuild = force === "1" || !cached;

    // Invalidate if a newer session-review run came in after cached updatedAt
    if (cached && !needRebuild) {
      const recent = await listAgentRuns({ agent: "session-review", limit: 1 }).catch(() => []);
      if (recent.length > 0 && recent[0].started_at > cached.updatedAt) {
        needRebuild = true;
      }
    }

    if (needRebuild) {
      const narration = await buildNarration({ force: force === "1" });
      cache.set(key, narration);
      return NextResponse.json(narration);
    }

    return NextResponse.json(cached);
  } catch {
    // Always return 200 — UI must always render
    return NextResponse.json({ ...FALLBACK, updatedAt: new Date().toISOString() });
  }
}
