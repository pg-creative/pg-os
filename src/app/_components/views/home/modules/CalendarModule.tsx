"use client";

/**
 * CalendarModule — compact today-at-a-glance tile for the Home grid.
 * Fetches /api/calendar/events, shows next upcoming event + today event count.
 * Tapping opens the Calendar tab.
 */

import { useState, useEffect } from "react";
import { BentoBox } from "../../../bento/BentoBox";
import { useActiveTab } from "../../../useActiveTab";

interface CalEvent {
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  color?: string;
}

interface CalResp {
  authed: boolean;
  events?: CalEvent[];
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function nextUpcoming(events: CalEvent[]): CalEvent | null {
  const now = Date.now();
  const upcoming = events
    .filter((e) => !e.allDay && Date.parse(e.start) > now)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return upcoming[0] ?? events[0] ?? null;
}

export function CalendarModule({ cols = 6 }: { cols?: number }) {
  const { setActive } = useActiveTab();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [events, setEvents] = useState<CalEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/calendar/events?view=today")
      .then((r) => r.json())
      .then((d: CalResp) => {
        if (cancelled) return;
        setAuthed(d.authed);
        setEvents(d.events ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const next = !loading && authed ? nextUpcoming(events) : null;
  const count = events.filter((e) => !e.allDay).length;

  return (
    <BentoBox
      cols={cols}
      eyebrow="Calendar"
      kanji="暦"
      count={!loading && authed ? `${count} today` : undefined}
      onClick={() => setActive("calendar")}
    >
      {loading ? (
        <span style={{ opacity: 0.45, fontSize: 13 }}>Loading...</span>
      ) : !authed ? (
        <span style={{ opacity: 0.5, fontSize: 13 }}>
          Connect Google Calendar to see your day
        </span>
      ) : !next ? (
        <span style={{ opacity: 0.5, fontSize: 13 }}>No events today</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              opacity: 0.55,
            }}
          >
            {next.allDay ? "All day" : `Next · ${fmtTime(next.start)}`}
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              lineHeight: 1.35,
              fontFamily: "'Noto Serif JP', serif",
            }}
          >
            {next.summary}
          </div>
          {count > 1 && (
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>
              +{count - 1} more event{count - 1 > 1 ? "s" : ""} today
            </div>
          )}
        </div>
      )}
    </BentoBox>
  );
}
