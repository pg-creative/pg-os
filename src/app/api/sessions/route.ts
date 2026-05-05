import { NextResponse } from "next/server";
import { listLiveSessions } from "@/lib/sessions";

export async function GET() {
  try {
    const sessions = await listLiveSessions();
    return NextResponse.json({ sessions });
  } catch (err) {
    return NextResponse.json(
      { error: "sessions_scan_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
