/**
 * Client -> server messaging. Replaces the upstream WebSocket inbound channel.
 * Used for: saveLayout, saveAgentSeats. webviewReady is now a no-op
 * (initial state is pushed automatically when the SSE stream opens).
 */

import { NextRequest, NextResponse } from "next/server";
import { getInstance } from "@/lib/pixelAgents";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    getInstance().handleClientMessage(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("[pixel-agents] bad client message", err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
