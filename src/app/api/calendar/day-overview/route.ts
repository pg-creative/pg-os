import { NextResponse } from "next/server";
import { assembleDayOverview } from "@/lib/dayOverview";

export const runtime = "nodejs";

export async function GET() {
  try {
    const payload = await assembleDayOverview();
    return NextResponse.json(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: "day_overview_failed", detail: msg },
      { status: 500 },
    );
  }
}
