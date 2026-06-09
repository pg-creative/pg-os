import { NextRequest, NextResponse } from "next/server";
import { getJournalHistory } from "@/lib/habits";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const daysParam = req.nextUrl.searchParams.get("days");
    const days = daysParam
      ? Math.max(1, Math.min(365, parseInt(daysParam, 10)))
      : 30;
    const entries = await getJournalHistory(isNaN(days) ? 30 : days);
    return NextResponse.json({ entries });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
