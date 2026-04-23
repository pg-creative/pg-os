"use client";
import { useEffect, useState } from "react";
import type { CalEvent, CalResponse } from "@/app/api/calendar/events/route";

type View = "today" | "week";
const REFRESH_INTERVAL_MS = 5 * 60_000;

function formatTime(iso: string, allDay: boolean) {
  if (allDay) return "ALL DAY";
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDayHeader(iso: string) {
  const d = new Date(iso);
  const DOW = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const MON = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${DOW[d.getDay()]} · ${MON[d.getMonth()]} ${d.getDate()}`;
}

function isNow(e: CalEvent) {
  const now = Date.now();
  return new Date(e.start).getTime() <= now && new Date(e.end).getTime() > now;
}

function groupByDay(events: CalEvent[]) {
  const groups: Record<string, CalEvent[]> = {};
  for (const e of events) {
    const d = new Date(e.start);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    (groups[key] = groups[key] || []).push(e);
  }
  return groups;
}

export function CalendarEvents() {
  const [view, setView] = useState<View>(
    typeof window !== "undefined" ? ((localStorage.getItem("pg-os-cal-view") as View) || "today") : "today"
  );
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchEvents(v: View) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/events?view=${v}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CalResponse = await res.json();
      if (!data.authed) {
        setAuthed(false);
        setEvents([]);
      } else {
        setAuthed(true);
        setEvents(data.events);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchEvents(view); }, [view]);
  useEffect(() => {
    const i = setInterval(() => fetchEvents(view), REFRESH_INTERVAL_MS);
    return () => clearInterval(i);
  }, [view]);

  function changeView(v: View) {
    setView(v);
    localStorage.setItem("pg-os-cal-view", v);
  }

  // Toggle is always visible so user can switch even when unauthed
  const toggle = (
    <div className="cal-toggle">
      <button
        className={`cal-toggle-chip${view === "today" ? " active" : ""}`}
        onClick={() => changeView("today")}
      >TODAY</button>
      <button
        className={`cal-toggle-chip${view === "week" ? " active" : ""}`}
        onClick={() => changeView("week")}
      >WEEK</button>
    </div>
  );

  let body: React.ReactNode;

  if (authed === false) {
    body = (
      <div className="cal-signin">
        <span>Connect Google Calendar</span>
        <a href="/api/auth/google">Sign in →</a>
      </div>
    );
  } else if (authed === null || loading) {
    body = (
      <div className="events">
        <div className="ev"><span className="empty">Loading…</span></div>
      </div>
    );
  } else if (error) {
    body = (
      <div className="events">
        <div className="ev"><span className="empty">Couldn&apos;t load: {error}</span></div>
      </div>
    );
  } else if (events.length === 0) {
    body = (
      <div className="events">
        <div className="ev">
          <span className="empty">
            {view === "today" ? "Nothing on deck today." : "Week looks clear."}
          </span>
        </div>
      </div>
    );
  } else if (view === "today") {
    body = (
      <div className="events">
        {events.map((e) => {
          const active = isNow(e);
          return (
            <div className={`ev${active ? " active" : ""}`} key={e.id}>
              <span className={`time${active ? " now" : ""}`}>
                {active ? "NOW · " : ""}{formatTime(e.start, e.allDay)}
              </span>
              <div className="body">
                <div className="title">{e.summary}</div>
                {e.location && <div className="sub">{e.location}</div>}
              </div>
              <span className="dot" />
            </div>
          );
        })}
      </div>
    );
  } else {
    const groups = groupByDay(events);
    const keys = Object.keys(groups).sort((a, b) => {
      const [ay, am, ad] = a.split("-").map(Number);
      const [by, bm, bd] = b.split("-").map(Number);
      return new Date(ay, am, ad).getTime() - new Date(by, bm, bd).getTime();
    });
    body = (
      <div className="events">
        {keys.map((k) => {
          const dayEvents = groups[k];
          const header = formatDayHeader(dayEvents[0].start);
          return (
            <div key={k}>
              <div className="ev-day-header">{header}</div>
              {dayEvents.map((e) => (
                <div className="ev" key={e.id}>
                  <span className="time">{formatTime(e.start, e.allDay)}</span>
                  <div className="body">
                    <div className="title">{e.summary}</div>
                    {e.location && <div className="sub">{e.location}</div>}
                  </div>
                  <span className="dot" />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return <>{toggle}{body}</>;
}
