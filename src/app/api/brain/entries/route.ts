// GET /api/brain/entries — list all brain wiki entries with parsed frontmatter

import { NextResponse } from "next/server";
import { listAllEntries } from "@/lib/brain/parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = listAllEntries();
    // Sort by composite score descending (nulls/undefined last)
    entries.sort((a, b) => {
      const sa = a.frontmatter.score ?? -1;
      const sb = b.frontmatter.score ?? -1;
      return sb - sa;
    });
    return NextResponse.json({ entries, count: entries.length });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "failed to list entries" },
      { status: 500 },
    );
  }
}
