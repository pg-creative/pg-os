import { NextRequest, NextResponse } from "next/server";
import { getArchiveStats, searchArchive, getRecentConversations } from "@/lib/claudeArchive";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search");
  const limitRaw = req.nextUrl.searchParams.get("limit");
  let limit = limitRaw ? parseInt(limitRaw, 10) : 20;
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  if (search && search.trim()) {
    const results = searchArchive(search.trim(), limit);
    return NextResponse.json({ results, query: search });
  }

  const stats = getArchiveStats();
  if (!stats) {
    return NextResponse.json({ stats: null, recent: [] });
  }
  const recent = getRecentConversations(10);
  return NextResponse.json({ stats, recent });
}
