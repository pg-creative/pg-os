import { NextRequest, NextResponse } from "next/server";
import { getTokens } from "@/lib/tokenStore";
import {
  hasCalendarWrite,
  updateEvent,
  deleteEvent,
  type EventInput,
} from "@/lib/calendarService";

export const runtime = "nodejs";

const RECONNECT_URL = "/api/auth/google";

// ── PATCH /api/calendar/events/[id]?calendarId=xxx ───────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const calendarId = req.nextUrl.searchParams.get("calendarId") ?? "primary";

  const current = await getTokens("google");
  if (!current?.refreshToken) {
    return NextResponse.json({ authed: false }, { status: 401 });
  }
  if (!hasCalendarWrite(current)) {
    return NextResponse.json(
      { error: "insufficient_scope", reconnect_url: RECONNECT_URL },
      { status: 403 },
    );
  }

  let patch: Partial<EventInput>;
  try {
    patch = (await req.json()) as Partial<EventInput>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const event = await updateEvent(
      current.refreshToken,
      calendarId,
      id,
      patch,
    );
    return NextResponse.json({ ok: true, event });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: "update_failed", detail: msg },
      { status: 500 },
    );
  }
}

// ── DELETE /api/calendar/events/[id]?calendarId=xxx ──────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const calendarId = req.nextUrl.searchParams.get("calendarId") ?? "primary";

  const current = await getTokens("google");
  if (!current?.refreshToken) {
    return NextResponse.json({ authed: false }, { status: 401 });
  }
  if (!hasCalendarWrite(current)) {
    return NextResponse.json(
      { error: "insufficient_scope", reconnect_url: RECONNECT_URL },
      { status: 403 },
    );
  }

  try {
    await deleteEvent(current.refreshToken, calendarId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: "delete_failed", detail: msg },
      { status: 500 },
    );
  }
}
