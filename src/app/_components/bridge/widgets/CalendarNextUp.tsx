"use client";
import { useCallback, useEffect, useState } from "react";

type CalEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
};

type CalResponse = { authed: boolean; events?: CalEvent[] };

function timeOf(iso: string, allDay: boolean): string {
  if (allDay) return "all day";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function untilText(startIso: string): string {
  const ms = new Date(startIso).getTime() - Date.now();
  if (ms < 0) return "now";
  const m = Math.round(ms / 60_000);
  if (m < 1) return "in <1m";
  if (m < 60) return `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `in ${h}h`;
  return `in ${Math.round(h / 24)}d`;
}

export function CalendarNextUp() {
  const [data, setData] = useState<CalResponse | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/events?view=today", { cache: "no-store" });
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 60_000);
    return () => clearInterval(i);
  }, [fetchData]);

  if (!data) {
    return (
      <div className="bridge-widget">
        <div className="bridge-widget-label">NEXT</div>
        <div className="bridge-widget-body bridge-widget-skel">syncing…</div>
      </div>
    );
  }

  if (!data.authed) {
    return (
      <div className="bridge-widget">
        <div className="bridge-widget-label">NEXT</div>
        <div className="bridge-widget-body bridge-widget-empty">
          <a href="/api/auth/google" className="bridge-widget-link">
            Connect Calendar →
          </a>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const upcoming = (data.events ?? [])
    .filter((e) => new Date(e.end).getTime() > now)
    .slice(0, 2);

  if (upcoming.length === 0) {
    return (
      <div className="bridge-widget">
        <div className="bridge-widget-label">NEXT</div>
        <div className="bridge-widget-body bridge-widget-empty">nothing today</div>
      </div>
    );
  }

  const next = upcoming[0];
  return (
    <div className="bridge-widget bridge-widget-calendar">
      <div className="bridge-widget-label">
        NEXT
        <span className="bridge-widget-tag">{untilText(next.start)}</span>
      </div>
      <div className="bridge-widget-body">
        <div className="bridge-cal-event">
          <span className="bridge-cal-time">{timeOf(next.start, next.allDay)}</span>
          <span className="bridge-cal-title" title={next.summary}>{next.summary}</span>
        </div>
        {upcoming[1] && (
          <div className="bridge-cal-event bridge-cal-secondary">
            <span className="bridge-cal-time">{timeOf(upcoming[1].start, upcoming[1].allDay)}</span>
            <span className="bridge-cal-title" title={upcoming[1].summary}>{upcoming[1].summary}</span>
          </div>
        )}
      </div>
    </div>
  );
}
