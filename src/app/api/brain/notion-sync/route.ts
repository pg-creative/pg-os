// POST /api/brain/notion-sync — manual trigger to poll Notion for Status changes
// and update local md frontmatter accordingly.
// Called by client periodically (every 30s) OR on-demand.

import { NextResponse } from "next/server";
import { pollNotionForChanges } from "@/lib/brain/sync";
import { notionConfigured, getInboxUrl } from "@/lib/brain/notion-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!notionConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Notion not configured. Set NOTION_TOKEN env var to enable bidirectional sync.",
        inboxUrl: getInboxUrl(),
      },
      { status: 200 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const since: string | undefined = body.since;
    const result = await pollNotionForChanges(since);
    return NextResponse.json({ ok: true, ...result, inboxUrl: getInboxUrl() });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "sync failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Status / config probe
  return NextResponse.json({
    configured: notionConfigured(),
    inboxUrl: getInboxUrl(),
  });
}
