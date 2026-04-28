// /api/telegram-events
// Internal endpoint for headless agents (morning-briefing's Python heredoc,
// scanners, etc.) to log Telegram messages they send into the activity stream.
// Webhook handler logs inbound + reply events directly; this is for outbound
// fire-and-forget messages from outside the Next.js process.

import { NextRequest, NextResponse } from "next/server";
import { recordTelegramEvent } from "@/lib/agentRunsStore";

const INTERNAL_SECRET = process.env.PGOS_INTERNAL_SECRET ?? process.env.PGOS_SHARED_SECRET ?? "";

export async function POST(req: NextRequest) {
  const headerSecret = req.headers.get("x-pgos-internal-secret") ?? "";
  if (!INTERNAL_SECRET || headerSecret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || (body.direction !== "in" && body.direction !== "out")) {
    return NextResponse.json({ error: "missing direction" }, { status: 400 });
  }
  if (typeof body.kind !== "string") {
    return NextResponse.json({ error: "missing kind" }, { status: 400 });
  }
  await recordTelegramEvent({
    direction: body.direction,
    kind: body.kind,
    ref_kind: body.ref_kind,
    ref_id: body.ref_id,
    chat_id: body.chat_id,
    message_id: body.message_id,
    payload: body.payload,
  });
  return NextResponse.json({ ok: true });
}
