import { NextResponse } from "next/server";
import { readSessionTelemetry } from "@/lib/cockpitTelemetry";

export const dynamic = "force-dynamic";

// Live per-session vitals from the statusLine sink (~/.pg-os/sessions/*.json).
// ?includeStale=1 returns ended sessions too (recent history).
export async function GET(req: Request) {
  try {
    const includeStale =
      new URL(req.url).searchParams.get("includeStale") === "1";
    const sessions = await readSessionTelemetry({ includeStale });
    return NextResponse.json({ sessions, count: sessions.length });
  } catch (err) {
    return NextResponse.json(
      {
        error: "telemetry_read_failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
