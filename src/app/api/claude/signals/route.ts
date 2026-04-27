import { NextRequest, NextResponse } from "next/server";
import { getRecentFindings, getRecentStats } from "@/lib/claudeStore";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("days");
  let days = raw ? parseInt(raw, 10) : 7;
  if (!Number.isFinite(days) || days < 1) days = 7;
  if (days > 30) days = 30;
  const [signals, stats] = await Promise.all([getRecentFindings(days), getRecentStats(days)]);
  return NextResponse.json({ signals, stats, days });
}
