import { NextRequest, NextResponse } from "next/server";
import { listQueue, addQueueItem, deleteQueueItem, QueueItem } from "@/lib/queueStore";
import { logDecision } from "@/lib/claudeStore";

export type QueueResponse = { items: QueueItem[] };

export async function GET() {
  const items = await listQueue();
  return NextResponse.json({ items } satisfies QueueResponse);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });
  const id = await addQueueItem({
    id: body.id,
    title,
    source: body.source,
    options: Array.isArray(body.options) ? body.options : undefined,
    note: body.note,
  });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  const decision = req.nextUrl.searchParams.get("decision") ?? "dismissed";
  const ok = await deleteQueueItem(id, decision);
  // Log the decision so the post-mortem loop (Track A4) can ping in 14 days.
  // Fire-and-forget — failures shouldn't block the user.
  logDecision({
    kind: decision === "dismissed" ? "queue_dismiss" : "queue_resolve",
    ref_id: id,
    detail: { decision },
    followup_days: 14,
  });
  return NextResponse.json({ ok });
}
