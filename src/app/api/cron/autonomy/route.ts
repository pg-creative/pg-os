import { NextRequest, NextResponse } from "next/server";
import { processAutoExecuteCycle } from "@/lib/trustEngine";

// Cron entry point. Vercel cron hits this every 30 min (see vercel.json).
// Optional bearer auth via CRON_SECRET; if unset, the route is open (dev).

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    const provided = auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : "";
    if (provided !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const summary = await processAutoExecuteCycle();
    return NextResponse.json({
      ok: true,
      summary,
      ran_at: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
