/**
 * calendarService.ts — Calendar I/O hub. Canonical types live here.
 *
 * All calendar reads/writes go through these functions so route handlers stay thin.
 * Consumers import CalEvent, CalendarMeta, EventInput from here — not from the routes.
 */
import { calendarClient } from "./google";
import type { ProviderTokens } from "./tokenStore";

// ── Canonical types ───────────────────────────────────────────────────────────

export type CalendarMeta = {
  id: string;
  summary: string;
  backgroundColor: string;
  primary: boolean;
  selected: boolean;
};

export type CalEvent = {
  id: string;
  calendarId: string;
  summary: string;
  start: string; // ISO string — dateTime for timed events, date-only for all-day
  end: string; // ISO string
  allDay: boolean;
  location?: string;
  description?: string;
  htmlLink?: string;
  color?: string; // calendar backgroundColor
  recurringEventId?: string;
};

export type EventInput = {
  calendarId: string;
  summary: string;
  start: string; // ISO string or YYYY-MM-DD
  end: string; // ISO string or YYYY-MM-DD
  allDay?: boolean;
  location?: string;
  description?: string;
  timeZone?: string;
};

// ── Scope check ───────────────────────────────────────────────────────────────

/**
 * Returns true if the stored tokens include the full calendar scope (read+write).
 * The readonly scope contains ".readonly" — full scope does not.
 */
export function hasCalendarWrite(tokens: ProviderTokens): boolean {
  if (!tokens.scope) return false;
  return (
    tokens.scope.includes("https://www.googleapis.com/auth/calendar") &&
    !tokens.scope.includes("https://www.googleapis.com/auth/calendar.readonly")
  );
}

// ── Internal helpers ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGoogleEvent(e: any, calendarId: string, color?: string): CalEvent {
  const startDt: string = e.start?.dateTime ?? e.start?.date ?? "";
  const endDt: string = e.end?.dateTime ?? e.end?.date ?? startDt;
  return {
    id: (e.id as string) ?? Math.random().toString(36).slice(2),
    calendarId,
    summary: (e.summary as string) ?? "(no title)",
    start: startDt,
    end: endDt,
    allDay: !e.start?.dateTime,
    location: e.location ?? undefined,
    description: e.description ?? undefined,
    htmlLink: e.htmlLink ?? undefined,
    color,
    recurringEventId: e.recurringEventId ?? undefined,
  };
}

function buildGoogleTime(
  iso: string,
  allDay: boolean,
  timeZone?: string,
): { date: string } | { dateTime: string; timeZone: string } {
  if (allDay) {
    return { date: iso.slice(0, 10) };
  }
  return { dateTime: iso, timeZone: timeZone ?? "UTC" };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** List all calendars the user has at least reader access to. */
export async function listCalendars(
  refreshToken: string,
): Promise<CalendarMeta[]> {
  const cal = calendarClient(refreshToken);
  const res = await cal.calendarList.list({ minAccessRole: "reader" });
  return (res.data.items ?? []).map((entry) => ({
    id: entry.id ?? "",
    summary: entry.summary ?? entry.id ?? "",
    backgroundColor: entry.backgroundColor ?? "#4285f4",
    primary: entry.primary ?? false,
    selected: entry.selected ?? false,
  }));
}

/**
 * Fetch events across multiple calendars for a date range.
 *
 * If no calendarIds are provided, fetches the list first and uses selected ones.
 * Each calendar fetch is wrapped in its own try/catch so one failing calendar
 * never blocks the others.
 */
export async function listEventsAcrossCalendars(
  refreshToken: string,
  from: Date,
  to: Date,
  opts?: { calendarIds?: string[]; maxResults?: number; timeZone?: string },
): Promise<CalEvent[]> {
  const cal = calendarClient(refreshToken);

  // Resolve which calendars to query
  let calendarMetas: { id: string; backgroundColor: string }[];
  if (opts?.calendarIds && opts.calendarIds.length > 0) {
    calendarMetas = opts.calendarIds.map((id) => ({
      id,
      backgroundColor: undefined as unknown as string,
    }));
  } else {
    const all = await listCalendars(refreshToken);
    calendarMetas = all.filter((c) => c.selected || c.primary);
    // If somehow nothing is selected/primary, fall back to all
    if (calendarMetas.length === 0) calendarMetas = all;
  }

  const maxResults = opts?.maxResults ?? 250;

  // Fetch each calendar independently; skip on error
  const perCalendar = await Promise.all(
    calendarMetas.map(async (meta) => {
      try {
        const res = await cal.events.list({
          calendarId: meta.id,
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults,
          ...(opts?.timeZone ? { timeZone: opts.timeZone } : {}),
        });
        return (res.data.items ?? []).map((e) =>
          mapGoogleEvent(e, meta.id, meta.backgroundColor),
        );
      } catch {
        // Skip this calendar silently
        return [] as CalEvent[];
      }
    }),
  );

  // Flatten and sort by start time
  return perCalendar.flat().sort((a, b) => {
    const ta = a.start ? new Date(a.start).getTime() : 0;
    const tb = b.start ? new Date(b.start).getTime() : 0;
    return ta - tb;
  });
}

/** Create a new event. Returns the created CalEvent. */
export async function createEvent(
  refreshToken: string,
  input: EventInput,
): Promise<CalEvent> {
  const cal = calendarClient(refreshToken);
  const allDay = input.allDay ?? !input.start.includes("T");
  const res = await cal.events.insert({
    calendarId: input.calendarId,
    requestBody: {
      summary: input.summary,
      location: input.location ?? undefined,
      description: input.description ?? undefined,
      start: buildGoogleTime(input.start, allDay, input.timeZone),
      end: buildGoogleTime(input.end, allDay, input.timeZone),
    },
  });
  return mapGoogleEvent(res.data, input.calendarId);
}

/** Patch an existing event. Returns the updated CalEvent. */
export async function updateEvent(
  refreshToken: string,
  calendarId: string,
  eventId: string,
  patch: Partial<EventInput>,
): Promise<CalEvent> {
  const cal = calendarClient(refreshToken);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {};
  if (patch.summary != null) body.summary = patch.summary;
  if (patch.location != null) body.location = patch.location;
  if (patch.description != null) body.description = patch.description;
  if (patch.start != null) {
    const allDay = patch.allDay ?? !patch.start.includes("T");
    body.start = buildGoogleTime(patch.start, allDay, patch.timeZone);
  }
  if (patch.end != null) {
    const allDay = patch.allDay ?? !patch.end.includes("T");
    body.end = buildGoogleTime(patch.end, allDay, patch.timeZone);
  }
  const res = await cal.events.patch({
    calendarId,
    eventId,
    requestBody: body,
  });
  return mapGoogleEvent(res.data, calendarId);
}

/** Delete an event permanently. */
export async function deleteEvent(
  refreshToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const cal = calendarClient(refreshToken);
  await cal.events.delete({ calendarId, eventId });
}
