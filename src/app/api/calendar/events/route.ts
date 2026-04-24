import { NextRequest, NextResponse } from "next/server";
import { calendarClient } from "@/lib/google";
import { getTokens } from "@/lib/tokenStore";

export type CalEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  htmlLink?: string;
};

export type CalResponse =
  | { authed: false }
  | { authed: true; events: CalEvent[]; range: { from: string; to: string } };

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }

export async function GET(req: NextRequest) {
  const current = await getTokens("google");
  if (!current?.refreshToken) return NextResponse.json({ authed: false } satisfies CalResponse);

  const view = req.nextUrl.searchParams.get("view") ?? "today";
  const now = new Date();
  const from = startOfDay(now);
  const to = view === "week"
    ? endOfDay(new Date(from.getTime() + 6 * 86_400_000))
    : endOfDay(now);

  try {
    // Google SDK handles refresh internally when we pass the refresh_token.
    const cal = calendarClient(current.refreshToken);
    const res = await cal.events.list({
      calendarId: "primary",
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });
    const items = (res.data.items ?? []).map<CalEvent>((e) => {
      const startDateTime = e.start?.dateTime ?? e.start?.date ?? "";
      const endDateTime = e.end?.dateTime ?? e.end?.date ?? startDateTime;
      return {
        id: e.id ?? Math.random().toString(36).slice(2),
        summary: e.summary ?? "(no title)",
        start: startDateTime,
        end: endDateTime,
        allDay: !e.start?.dateTime,
        location: e.location ?? undefined,
        description: e.description ?? undefined,
        htmlLink: e.htmlLink ?? undefined,
      };
    });
    return NextResponse.json({
      authed: true,
      events: items,
      range: { from: from.toISOString(), to: to.toISOString() },
    } satisfies CalResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "calendar_fetch_failed", detail: msg }, { status: 500 });
  }
}
