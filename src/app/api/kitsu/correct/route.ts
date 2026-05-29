/**
 * POST /api/kitsu/correct — the correction feedback loop (Phase 3).
 *
 * When PG corrects Kitsu (or states a preference), this persists it: a line in
 * the decision log AND a durable bullet in personality.md's "Learned preferences"
 * section, so it loads into the system prompt on the next session and the persona
 * compounds. Kitsu can also self-record via the `remember` tool mid-conversation;
 * this route is the explicit/UI path.
 *
 * Body: { correction: string, context?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { recordKitsuCorrection } from "@/lib/kitsu/kitsuMemory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { correction?: string; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const correction =
    typeof body.correction === "string" ? body.correction.trim() : "";
  if (!correction) {
    return NextResponse.json({ error: "correction_required" }, { status: 400 });
  }
  try {
    await recordKitsuCorrection({ correction, context: body.context });
    return NextResponse.json({ ok: true, remembered: correction });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
