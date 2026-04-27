/**
 * Cross-tab intelligence cron — invoked hourly by Vercel cron (vercel.json).
 *
 * Auth: if CRON_SECRET is set, requires `Authorization: Bearer <secret>`.
 * Vercel cron requests automatically include this header when the env var is
 * configured at the project level. In local dev with no CRON_SECRET, the
 * endpoint is open (consistent with other dev fallbacks in this app).
 */
import { NextRequest, NextResponse } from "next/server";
import { runRules } from "@/lib/ruleEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization") ?? "";
    if (header !== `Bearer ${secret}`) return unauthorized();
  }
  const startedAt = new Date();
  const results = await runRules({ now: startedAt, dryRun: false });
  const fired = results.filter((r) => r.fired).length;
  const errors = results.filter((r) => r.error).length;
  return NextResponse.json({
    ok: true,
    started_at: startedAt.toISOString(),
    duration_ms: Date.now() - startedAt.getTime(),
    fired,
    errors,
    results,
  });
}
