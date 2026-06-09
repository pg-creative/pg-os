import { NextResponse } from "next/server";
import { getTokens } from "@/lib/tokenStore";
import { listCalendars } from "@/lib/calendarService";

export const runtime = "nodejs";

export type CalendarsResponse =
  | { authed: false }
  | { authed: true; calendars: Awaited<ReturnType<typeof listCalendars>> };

export async function GET() {
  const current = await getTokens("google");
  if (!current?.refreshToken) {
    return NextResponse.json({ authed: false } satisfies CalendarsResponse);
  }

  try {
    const calendars = await listCalendars(current.refreshToken);
    return NextResponse.json({
      authed: true,
      calendars,
    } satisfies CalendarsResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: "calendars_fetch_failed", detail: msg },
      { status: 500 },
    );
  }
}
