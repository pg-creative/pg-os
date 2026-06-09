import { NextRequest, NextResponse } from "next/server";
import { getTokens } from "@/lib/tokenStore";
import {
  listEventsAcrossCalendars,
  createEvent,
  hasCalendarWrite,
  type CalEvent,
  type EventInput,
} from "@/lib/calendarService";
import { rangeForView, startOfDayLocal, endOfDayLocal } from "@/lib/dateUtils";

export const runtime = "nodejs";

// Re-export CalEvent so any existing imports from this route still resolve.
export type { CalEvent };

export type CalResponse =
  | { authed: false }
  | { authed: true; events: CalEvent[]; range: { from: string; to: string } };

const RECONNECT_URL = "/api/auth/google";

// ── GET /api/calendar/events ──────────────────────────────────────────────────
//
// Query params (all optional):
//   view=today|week    (default: today)
//   from=ISO           explicit range start (overrides view)
//   to=ISO             explicit range end   (overrides view)
//   calendarIds=a,b,c  comma-separated; omit to query all selected calendars

export async function GET(req: NextRequest) {
  const current = await getTokens("google");
  if (!current?.refreshToken) {
    return NextResponse.json({ authed: false } satisfies CalResponse);
  }

  const sp = req.nextUrl.searchParams;

  // Resolve date range: explicit from/to beats view param
  let from: Date;
  let to: Date;
  const fromParam = sp.get("from");
  const toParam = sp.get("to");
  if (fromParam && toParam) {
    from = new Date(fromParam);
    to = new Date(toParam);
  } else {
    const view = (sp.get("view") ?? "today") as "day" | "week";
    // "today" maps to "day" view
    const resolved = view === "week" ? "week" : "day";
    const range = rangeForView(resolved, new Date());
    from = range.from;
    to = range.to;
  }

  // Ensure valid dates — fall back to today on parse failure
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    const fallback = rangeForView("day", new Date());
    from = fallback.from;
    to = fallback.to;
  }

  // Optional calendar filter
  const calendarIdsParam = sp.get("calendarIds");
  const calendarIds = calendarIdsParam
    ? calendarIdsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  try {
    const events = await listEventsAcrossCalendars(
      current.refreshToken,
      from,
      to,
      { calendarIds, maxResults: 50 },
    );
    return NextResponse.json({
      authed: true,
      events,
      range: { from: from.toISOString(), to: to.toISOString() },
    } satisfies CalResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: "calendar_fetch_failed", detail: msg },
      { status: 500 },
    );
  }
}

// ── POST /api/calendar/events ─────────────────────────────────────────────────
//
// Body: EventInput (see calendarService.ts)
// Requires full calendar scope. Returns { ok, event }.

export async function POST(req: NextRequest) {
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

  let input: EventInput;
  try {
    input = (await req.json()) as EventInput;
    if (!input.summary || !input.start || !input.end || !input.calendarId) {
      throw new Error("missing_required_fields");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid_json";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const event = await createEvent(current.refreshToken, input);
    return NextResponse.json({ ok: true, event });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: "create_failed", detail: msg },
      { status: 500 },
    );
  }
}

// Keep these for any internal callers that relied on the old local helpers.
// They're no longer used in this file but re-exporting prevents import breaks.
export { startOfDayLocal as startOfDay, endOfDayLocal as endOfDay };
