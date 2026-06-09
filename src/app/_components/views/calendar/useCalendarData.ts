"use client";
/**
 * useCalendarData — fetches calendars + events for a date range and provides
 * OPTIMISTIC create/update/delete against /api/calendar/*. Plain React hooks,
 * no external state lib. Events live in Google; this holds transient UI state.
 *
 * demo=true seeds believable mock data and keeps all mutations local (no API) —
 * used by /dev/calendar-lab so the grid + editing + overview rails can be seen
 * and the A/B bake-off run before Google is connected.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { CalEvent, CalendarMeta, EventInput } from "@/lib/calendarService";

const LOCAL_TZ =
  typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "America/Chicago";

type Range = { from: Date; to: Date };

export type CalendarData = {
  events: CalEvent[];
  calendars: CalendarMeta[];
  hidden: Set<string>;
  loading: boolean;
  authed: boolean;
  writeBlocked: boolean;
  error: string | null;
  reload: (range: Range) => void;
  toggleCalendar: (id: string) => void;
  createEvent: (draft: EventInput) => Promise<void>;
  updateEvent: (
    id: string,
    calendarId: string,
    patch: Partial<EventInput>,
  ) => Promise<void>;
  deleteEvent: (id: string, calendarId: string) => Promise<void>;
};

const DEMO_CALENDARS: CalendarMeta[] = [
  {
    id: "personal",
    summary: "Personal",
    backgroundColor: "#1a5c3a",
    primary: true,
    selected: true,
  },
  {
    id: "work",
    summary: "Metrasens",
    backgroundColor: "#4A6B8C",
    primary: false,
    selected: true,
  },
  {
    id: "writing",
    summary: "Writing",
    backgroundColor: "#D87C52",
    primary: false,
    selected: true,
  },
];

function demoEvents(): CalEvent[] {
  const at = (dayOffset: number, h: number, m: number) => {
    const d = new Date();
    const dow = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - (dow - 1) + dayOffset); // Mon + offset
    d.setHours(h, m, 0, 0);
    return d;
  };
  const iso = (d: Date) => d.toISOString();
  const ev = (
    id: string,
    calendarId: string,
    summary: string,
    s: Date,
    e: Date,
    color: string,
    allDay = false,
  ): CalEvent => ({
    id,
    calendarId,
    summary,
    start: iso(s),
    end: iso(e),
    allDay,
    color,
  });

  const todayDow = (new Date().getDay() === 0 ? 7 : new Date().getDay()) - 1; // 0=Mon
  return [
    ev(
      "d1",
      "work",
      "Standup",
      at(todayDow, 9, 0),
      at(todayDow, 9, 30),
      "#4A6B8C",
    ),
    ev(
      "d2",
      "personal",
      "Deep work — calendar brick",
      at(todayDow, 10, 0),
      at(todayDow, 12, 0),
      "#1a5c3a",
    ),
    ev(
      "d3",
      "work",
      "1:1 with Sarah",
      at(todayDow, 14, 0),
      at(todayDow, 14, 45),
      "#4A6B8C",
    ),
    ev(
      "d4",
      "writing",
      "Essay draft",
      at(todayDow, 16, 30),
      at(todayDow, 18, 0),
      "#D87C52",
    ),
    ev(
      "d5",
      "personal",
      "Dinner",
      at(todayDow, 19, 0),
      at(todayDow, 20, 30),
      "#1a5c3a",
    ),
    ev("w1", "work", "Sprint planning", at(1, 11, 0), at(1, 12, 30), "#4A6B8C"),
    ev("w2", "personal", "Gym", at(2, 7, 0), at(2, 8, 0), "#1a5c3a"),
    ev("w3", "work", "Demo day", at(3, 13, 0), at(3, 14, 0), "#4A6B8C"),
    ev(
      "w4",
      "writing",
      "Launch prep",
      at(todayDow, 0, 0),
      at(todayDow + 1, 0, 0),
      "#D87C52",
      true,
    ),
  ];
}

export function useCalendarData(
  initialRange: Range,
  demo = false,
): CalendarData {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [calendars, setCalendars] = useState<CalendarMeta[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);
  const [writeBlocked, setWriteBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rangeRef = useRef<Range>(initialRange);

  const reload = useCallback(
    (range: Range) => {
      rangeRef.current = range;
      if (demo) {
        setCalendars(DEMO_CALENDARS);
        setEvents(demoEvents());
        setAuthed(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      const qs = `from=${range.from.toISOString()}&to=${range.to.toISOString()}`;
      Promise.all([
        fetch(`/api/calendar/events?${qs}`)
          .then((r) => r.json())
          .catch(() => null),
        fetch(`/api/calendar/calendars`)
          .then((r) => r.json())
          .catch(() => null),
      ])
        .then(([evs, cal]) => {
          setAuthed(!(evs && evs.authed === false));
          setEvents(evs?.events ?? []);
          if (cal?.calendars) setCalendars(cal.calendars);
          setError(null);
        })
        .catch(() => setError("Couldn't load calendar"))
        .finally(() => setLoading(false));
    },
    [demo],
  );

  useEffect(() => {
    reload(rangeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCalendar = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const calColor = useCallback(
    (calendarId: string) =>
      calendars.find((c) => c.id === calendarId)?.backgroundColor,
    [calendars],
  );

  const createEvent = useCallback(
    async (draft: EventInput) => {
      const tempId = `tmp_${crypto.randomUUID()}`;
      const optimistic: CalEvent = {
        id: tempId,
        calendarId: draft.calendarId,
        summary: draft.summary,
        start: draft.start,
        end: draft.end,
        allDay: !!draft.allDay,
        location: draft.location,
        description: draft.description,
        color: calColor(draft.calendarId),
      };
      setEvents((prev) => [...prev, optimistic]);
      if (demo) return;
      try {
        const res = await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ timeZone: LOCAL_TZ, ...draft }),
        });
        if (res.status === 403) {
          setWriteBlocked(true);
          setEvents((prev) => prev.filter((e) => e.id !== tempId));
          return;
        }
        const data = await res.json();
        if (!res.ok || !data.event)
          throw new Error(data?.error || "create failed");
        setEvents((prev) =>
          prev.map((e) => (e.id === tempId ? data.event : e)),
        );
      } catch (err) {
        setEvents((prev) => prev.filter((e) => e.id !== tempId));
        setError(err instanceof Error ? err.message : "create failed");
      }
    },
    [calColor, demo],
  );

  const updateEvent = useCallback(
    async (id: string, calendarId: string, patch: Partial<EventInput>) => {
      let snapshot: CalEvent | undefined;
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id === id) {
            snapshot = e;
            return {
              ...e,
              ...patch,
              allDay: patch.allDay ?? e.allDay,
            } as CalEvent;
          }
          return e;
        }),
      );
      if (demo) return;
      try {
        const res = await fetch(
          `/api/calendar/events/${encodeURIComponent(id)}?calendarId=${encodeURIComponent(calendarId)}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ timeZone: LOCAL_TZ, ...patch }),
          },
        );
        if (res.status === 403) {
          setWriteBlocked(true);
          if (snapshot)
            setEvents((prev) => prev.map((e) => (e.id === id ? snapshot! : e)));
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "update failed");
        if (data.event)
          setEvents((prev) => prev.map((e) => (e.id === id ? data.event : e)));
      } catch (err) {
        if (snapshot)
          setEvents((prev) => prev.map((e) => (e.id === id ? snapshot! : e)));
        setError(err instanceof Error ? err.message : "update failed");
      }
    },
    [demo],
  );

  const deleteEvent = useCallback(
    async (id: string, calendarId: string) => {
      let snapshot: CalEvent | undefined;
      setEvents((prev) => {
        snapshot = prev.find((e) => e.id === id);
        return prev.filter((e) => e.id !== id);
      });
      if (demo) return;
      try {
        const res = await fetch(
          `/api/calendar/events/${encodeURIComponent(id)}?calendarId=${encodeURIComponent(calendarId)}`,
          { method: "DELETE" },
        );
        if (res.status === 403) {
          setWriteBlocked(true);
          if (snapshot) setEvents((prev) => [...prev, snapshot!]);
          return;
        }
        if (!res.ok) throw new Error("delete failed");
      } catch (err) {
        if (snapshot) setEvents((prev) => [...prev, snapshot!]);
        setError(err instanceof Error ? err.message : "delete failed");
      }
    },
    [demo],
  );

  const visible = events.filter((e) => !hidden.has(e.calendarId));

  return {
    events: visible,
    calendars,
    hidden,
    loading,
    authed,
    writeBlocked,
    error,
    reload,
    toggleCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
