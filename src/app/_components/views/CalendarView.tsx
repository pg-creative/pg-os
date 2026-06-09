"use client";
/**
 * CalendarView — Brick 2. A painted (Emaki) editable Day/Week calendar over all
 * the user's Google calendars, with a day-overview rail. Native Date + pointer
 * events, no deps. Rendered full-bleed as the "Calendar" tab (embedded) and in
 * /dev/calendar-lab for the overview bake-off (overviewVariant prop).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalEvent, EventInput } from "@/lib/calendarService";
import { useCalendarData } from "./calendar/useCalendarData";
import * as M from "./calendar/calMath";

type View = "day" | "week";
type OverviewVariant = "none" | "agenda" | "planner" | "month";

type PanelState =
  | { mode: "create"; draft: EventInput }
  | { mode: "edit"; event: CalEvent }
  | null;

export function CalendarView({
  embedded = false,
  overviewVariant = "agenda",
  agendaStyle = "nownext",
  demo = false,
}: {
  embedded?: boolean;
  overviewVariant?: OverviewVariant;
  agendaStyle?: AgendaStyle;
  demo?: boolean;
}) {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [panel, setPanel] = useState<PanelState>(null);

  const range = useMemo(() => {
    if (view === "day") {
      return {
        from: M.startOfDay(anchor),
        to: M.addDays(M.startOfDay(anchor), 1),
      };
    }
    const ws = M.weekStart(anchor);
    return { from: ws, to: M.addDays(ws, 7) };
  }, [view, anchor]);

  const data = useCalendarData(range, demo);
  const { reload } = data;
  useEffect(() => {
    reload(range);
  }, [range, reload]);

  const days = view === "day" ? [anchor] : M.weekDays(anchor);

  const go = (dir: -1 | 0 | 1) => {
    if (dir === 0) return setAnchor(new Date());
    setAnchor((a) => M.addDays(a, dir * (view === "day" ? 1 : 7)));
  };

  const openCreate = useCallback(
    (start: Date, end: Date, allDay = false) => {
      const cal =
        data.calendars.find((c) => c.primary)?.id ??
        data.calendars[0]?.id ??
        "primary";
      setPanel({
        mode: "create",
        draft: {
          calendarId: cal,
          summary: "",
          start: allDay ? M.toLocalISODate(start) : start.toISOString(),
          end: allDay ? M.toLocalISODate(end) : end.toISOString(),
          allDay,
        },
      });
    },
    [data.calendars],
  );

  return (
    <div className={`cal-root${embedded ? " cal-embedded" : ""}`}>
      <CalendarStyles />
      <div className="cal-sky" aria-hidden />
      <div className="cal-scrim" aria-hidden />

      {data.writeBlocked && (
        <div className="cal-reauth">
          Reconnect Google to edit events.{" "}
          <a href="/api/auth/google">Reconnect →</a>
        </div>
      )}

      {!data.authed && !demo && (
        <div className="cal-connect">
          <div className="cal-connect-card">
            <div className="cal-connect-title">Connect your calendar</div>
            <div className="cal-connect-sub">
              Link Google to see and edit all your calendars here.
            </div>
            <a className="cal-connect-btn" href="/api/auth/google">
              Connect Google Calendar →
            </a>
          </div>
        </div>
      )}

      <header className="cal-head">
        <div className="cal-head-left">
          <span className="cal-title">Calendar</span>
          <div className="cal-nav">
            <button onClick={() => go(-1)} aria-label="previous">
              ‹
            </button>
            <button className="cal-today" onClick={() => go(0)}>
              Today
            </button>
            <button onClick={() => go(1)} aria-label="next">
              ›
            </button>
          </div>
          <span className="cal-range">{M.fmtRange(view, anchor)}</span>
        </div>
        <div className="cal-head-right">
          <div className="cal-viewtoggle">
            {(["day", "week"] as View[]).map((v) => (
              <button
                key={v}
                className={view === v ? "on" : ""}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <Legend
            calendars={data.calendars}
            hidden={data.hidden}
            onToggle={data.toggleCalendar}
          />
        </div>
      </header>

      <div className="cal-body">
        {overviewVariant === "agenda" && (
          <AgendaRail
            events={data.events}
            onPick={(e) => setPanel({ mode: "edit", event: e })}
            variant={agendaStyle}
          />
        )}
        {overviewVariant === "planner" && (
          <PlannerRail events={data.events} onAddBlock={openCreate} />
        )}
        {overviewVariant === "month" && (
          <MonthRail anchor={anchor} events={data.events} onJump={setAnchor} />
        )}

        <div className="cal-grid-wrap">
          {overviewVariant === "none" && <NextUpStrip events={data.events} />}
          <Grid
            view={view}
            days={days}
            events={data.events}
            onCreate={openCreate}
            onEditEvent={(e) => setPanel({ mode: "edit", event: e })}
            onMoveResize={(id, calendarId, patch) =>
              data.updateEvent(id, calendarId, patch)
            }
          />
        </div>
      </div>

      {panel && (
        <EventPanel
          state={panel}
          calendars={data.calendars}
          onClose={() => setPanel(null)}
          onCreate={async (input) => {
            await data.createEvent(input);
            setPanel(null);
          }}
          onUpdate={async (id, calId, patch) => {
            await data.updateEvent(id, calId, patch);
            setPanel(null);
          }}
          onDelete={async (id, calId) => {
            await data.deleteEvent(id, calId);
            setPanel(null);
          }}
        />
      )}

      {data.error && <div className="cal-toast">{data.error}</div>}
    </div>
  );
}

/* ─────────── Legend ─────────── */
function Legend({
  calendars,
  hidden,
  onToggle,
}: {
  calendars: { id: string; summary: string; backgroundColor: string }[];
  hidden: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (calendars.length === 0) return null;
  return (
    <div className="cal-legend">
      <button className="cal-legend-btn" onClick={() => setOpen((o) => !o)}>
        ◓ {calendars.length} calendars
      </button>
      {open && (
        <div className="cal-legend-pop">
          {calendars.map((c) => (
            <button
              key={c.id}
              className={`cal-legend-row${hidden.has(c.id) ? " off" : ""}`}
              onClick={() => onToggle(c.id)}
            >
              <span
                className="cal-legend-dot"
                style={{ background: c.backgroundColor || "#C9A24C" }}
              />
              <span className="cal-legend-name">{c.summary}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── Grid (hour axis + day columns) ─────────── */
type Gesture =
  | null
  | { kind: "create"; day: Date; startY: number; curY: number; el: HTMLElement }
  | {
      kind: "move";
      ev: CalEvent;
      grabMin: number;
      curStartMin: number;
      el: HTMLElement;
    }
  | {
      kind: "resize";
      edge: "top" | "bottom";
      ev: CalEvent;
      curMin: number;
      el: HTMLElement;
    };

function Grid({
  view,
  days,
  events,
  onCreate,
  onEditEvent,
  onMoveResize,
}: {
  view: View;
  days: Date[];
  events: CalEvent[];
  onCreate: (s: Date, e: Date, allDay?: boolean) => void;
  onEditEvent: (e: CalEvent) => void;
  onMoveResize: (
    id: string,
    calendarId: string,
    patch: Partial<EventInput>,
  ) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const gesture = useRef<Gesture>(null);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  // auto-scroll to ~1h before now on mount
  useEffect(() => {
    if (scrollRef.current) {
      const y = Math.max(0, (M.nowMinutes() - 60) * M.PX_PER_MIN);
      scrollRef.current.scrollTop = y;
    }
  }, []);

  const hours = Array.from(
    { length: M.VISIBLE_HOURS + 1 },
    (_, i) => M.DAY_START_H + i,
  );

  const colYFromEvent = (
    e: PointerEvent | React.PointerEvent,
    el: HTMLElement,
  ) => {
    const rect = el.getBoundingClientRect();
    return (e as PointerEvent).clientY - rect.top + el.scrollTop * 0; // grid already in scroll
  };

  // window listeners during a gesture
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const g = gesture.current;
      if (!g) return;
      const rect = g.el.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (g.kind === "create") {
        g.curY = y;
        rerender();
      } else if (g.kind === "move") {
        const min = Math.round(y / M.PX_PER_MIN / M.SNAP_MIN) * M.SNAP_MIN;
        g.curStartMin = Math.max(0, min - g.grabMin);
        rerender();
      } else if (g.kind === "resize") {
        const min = Math.round(y / M.PX_PER_MIN / M.SNAP_MIN) * M.SNAP_MIN;
        g.curMin = Math.max(0, Math.min(M.VISIBLE_HOURS * 60, min));
        rerender();
      }
    };
    const up = () => {
      const g = gesture.current;
      if (!g) return;
      if (g.kind === "create") {
        const a = Math.min(g.startY, g.curY);
        const b = Math.max(g.startY, g.curY);
        const start = M.yToDate(a, g.day);
        let end = M.yToDate(b, g.day);
        if (end.getTime() - start.getTime() < M.SNAP_MIN * 60000) {
          end = new Date(start.getTime() + 30 * 60000);
        }
        onCreate(start, end);
      } else if (g.kind === "move") {
        const dayDate = new Date(g.ev.start);
        const newStart = M.yToDate(g.curStartMin * M.PX_PER_MIN, dayDate);
        const dur =
          new Date(g.ev.end).getTime() - new Date(g.ev.start).getTime();
        const newEnd = new Date(newStart.getTime() + dur);
        onMoveResize(g.ev.id, g.ev.calendarId, {
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
        });
      } else if (g.kind === "resize") {
        const dayDate = new Date(g.ev.start);
        const at = M.yToDate(g.curMin * M.PX_PER_MIN, dayDate);
        if (g.edge === "top") {
          const end = new Date(g.ev.end);
          if (end.getTime() - at.getTime() >= M.SNAP_MIN * 60000)
            onMoveResize(g.ev.id, g.ev.calendarId, { start: at.toISOString() });
        } else {
          const start = new Date(g.ev.start);
          if (at.getTime() - start.getTime() >= M.SNAP_MIN * 60000)
            onMoveResize(g.ev.id, g.ev.calendarId, { end: at.toISOString() });
        }
      }
      gesture.current = null;
      rerender();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [onCreate, onMoveResize]);

  return (
    <div className="cal-grid-wrap">
      {/* all-day row */}
      <AllDayRow days={days} events={events} view={view} onEdit={onEditEvent} />

      <div className="cal-scroll" ref={scrollRef}>
        <div className="cal-grid" style={{ height: M.GRID_HEIGHT }}>
          <div className="cal-axis" style={{ width: M.HOUR_AXIS_W }}>
            {hours.map((h) => (
              <div
                key={h}
                className="cal-axis-h"
                style={{ top: (h - M.DAY_START_H) * M.HOUR_PX }}
              >
                {h < 24 ? M.fmtHourLabel(h) : ""}
              </div>
            ))}
          </div>

          <div className="cal-cols" style={{ left: M.HOUR_AXIS_W }}>
            {hours.map((h) => (
              <div
                key={h}
                className="cal-rule"
                style={{ top: (h - M.DAY_START_H) * M.HOUR_PX }}
              />
            ))}
            {days.map((day, di) => (
              <DayCol
                key={di}
                day={day}
                events={events}
                gesture={gesture}
                onColDown={(e, el) => {
                  const rect = el.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  gesture.current = {
                    kind: "create",
                    day,
                    startY: y,
                    curY: y,
                    el,
                  };
                  rerender();
                }}
                onEventDown={(e, ev, el, mode) => {
                  e.stopPropagation();
                  const rect = el.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const startMin = M.minutesFromDayStart(new Date(ev.start));
                  if (mode === "move") {
                    gesture.current = {
                      kind: "move",
                      ev,
                      grabMin: y / M.PX_PER_MIN - startMin,
                      curStartMin: startMin,
                      el,
                    };
                  } else {
                    gesture.current = {
                      kind: "resize",
                      edge: mode,
                      ev,
                      curMin:
                        mode === "top"
                          ? startMin
                          : M.minutesFromDayStart(new Date(ev.end)),
                      el,
                    };
                  }
                  rerender();
                }}
                onEventClick={onEditEvent}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* one day column */
function DayCol({
  day,
  events,
  gesture,
  onColDown,
  onEventDown,
  onEventClick,
}: {
  day: Date;
  events: CalEvent[];
  gesture: React.MutableRefObject<Gesture>;
  onColDown: (e: React.PointerEvent, el: HTMLElement) => void;
  onEventDown: (
    e: React.PointerEvent,
    ev: CalEvent,
    el: HTMLElement,
    mode: "move" | "top" | "bottom",
  ) => void;
  onEventClick: (e: CalEvent) => void;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const dayStr = M.toLocalISODate(day);
  const dayEvents = events.filter(
    (e) => !e.allDay && e.start.slice(0, 10) === dayStr,
  );
  const slots = M.assignColumns(dayEvents);
  const g = gesture.current;
  const movedId = g?.kind === "move" ? g.ev.id : null;

  return (
    <div
      className={`cal-col${M.isToday(day) ? " today" : ""}`}
      ref={elRef}
      onPointerDown={(e) => {
        if (e.target === elRef.current) onColDown(e, elRef.current!);
      }}
    >
      {M.isToday(day) && (
        <div
          className="cal-now"
          style={{ top: M.nowMinutes() * M.PX_PER_MIN }}
        />
      )}

      {/* ghost while creating in this column */}
      {g?.kind === "create" && M.sameDay(g.day, day) && (
        <div
          className="cal-ghost"
          style={{
            top: Math.min(g.startY, g.curY),
            height: Math.max(M.MIN_BLOCK_H, Math.abs(g.curY - g.startY)),
          }}
        />
      )}

      {slots.map((ev) => {
        let top = M.topFor(ev.start);
        let height = M.heightFor(ev.start, ev.end);
        if (movedId === ev.id && g?.kind === "move") {
          top = g.curStartMin * M.PX_PER_MIN;
        }
        if (g?.kind === "resize" && g.ev.id === ev.id) {
          if (g.edge === "top") {
            const bottom = M.minutesFromDayStart(new Date(ev.end));
            top = g.curMin * M.PX_PER_MIN;
            height = Math.max(
              M.MIN_BLOCK_H,
              (bottom - g.curMin) * M.PX_PER_MIN,
            );
          } else {
            const t = M.minutesFromDayStart(new Date(ev.start));
            height = Math.max(M.MIN_BLOCK_H, (g.curMin - t) * M.PX_PER_MIN);
          }
        }
        const widthPct = 100 / ev._cols;
        return (
          <div
            key={ev.id}
            className="cal-event"
            style={{
              top,
              height,
              left: `calc(${ev._col * widthPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
              background: ev.color || "#1a5c3a",
            }}
            onPointerDown={(e) => onEventDown(e, ev, elRef.current!, "move")}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(ev);
            }}
          >
            <span
              className="cal-event-handle top"
              onPointerDown={(e) => onEventDown(e, ev, elRef.current!, "top")}
            />
            <div className="cal-event-time">
              {M.fmtTime(new Date(ev.start))}
            </div>
            <div className="cal-event-title">{ev.summary || "(untitled)"}</div>
            <span
              className="cal-event-handle bottom"
              onPointerDown={(e) =>
                onEventDown(e, ev, elRef.current!, "bottom")
              }
            />
          </div>
        );
      })}
    </div>
  );
}

function AllDayRow({
  days,
  events,
  view,
  onEdit,
}: {
  days: Date[];
  events: CalEvent[];
  view: View;
  onEdit: (e: CalEvent) => void;
}) {
  const any = events.some((e) => e.allDay);
  if (!any) return <div className="cal-allday empty" />;
  return (
    <div className="cal-allday">
      <div className="cal-allday-label" style={{ width: M.HOUR_AXIS_W }}>
        all-day
      </div>
      <div className={`cal-allday-cols ${view}`}>
        {days.map((day, i) => {
          const ds = M.toLocalISODate(day);
          const items = events.filter(
            (e) =>
              e.allDay && e.start.slice(0, 10) <= ds && e.end.slice(0, 10) > ds,
          );
          return (
            <div key={i} className="cal-allday-col">
              {items.map((e) => (
                <button
                  key={e.id}
                  className="cal-allday-chip"
                  style={{ background: e.color || "#8B6E2A" }}
                  onClick={() => onEdit(e)}
                >
                  {e.summary || "(untitled)"}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Event create/edit panel ─────────── */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function EventPanel({
  state,
  calendars,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: {
  state: NonNullable<PanelState>;
  calendars: { id: string; summary: string; backgroundColor: string }[];
  onClose: () => void;
  onCreate: (input: EventInput) => void;
  onUpdate: (id: string, calId: string, patch: Partial<EventInput>) => void;
  onDelete: (id: string, calId: string) => void;
}) {
  const isEdit = state.mode === "edit";
  const ev = isEdit ? state.event : null;
  const draft = state.mode === "create" ? state.draft : null;

  const [summary, setSummary] = useState(ev?.summary ?? draft?.summary ?? "");
  const [calendarId, setCalendarId] = useState(
    ev?.calendarId ?? draft?.calendarId ?? calendars[0]?.id ?? "primary",
  );
  const [allDay, setAllDay] = useState(ev?.allDay ?? draft?.allDay ?? false);
  const [start, setStart] = useState(
    toLocalInput(ev?.start ?? draft?.start ?? new Date().toISOString()),
  );
  const [end, setEnd] = useState(
    toLocalInput(
      ev?.end ?? draft?.end ?? new Date(Date.now() + 36e5).toISOString(),
    ),
  );
  const [location, setLocation] = useState(ev?.location ?? "");
  const [confirmDel, setConfirmDel] = useState(false);

  const save = () => {
    const payload: EventInput = {
      calendarId,
      summary: summary.trim() || "(untitled)",
      start: allDay ? start.slice(0, 10) : new Date(start).toISOString(),
      end: allDay ? end.slice(0, 10) : new Date(end).toISOString(),
      allDay,
      location: location.trim() || undefined,
    };
    if (isEdit && ev) onUpdate(ev.id, ev.calendarId, payload);
    else onCreate(payload);
  };

  return (
    <>
      <div className="cal-panel-scrim" onClick={onClose} />
      <div className="cal-panel" role="dialog" aria-label="Event">
        <div className="cal-panel-head">
          <span>{isEdit ? "Edit event" : "New event"}</span>
          <button className="cal-x" onClick={onClose}>
            ×
          </button>
        </div>
        <input
          className="cal-field cal-field-title"
          placeholder="Add a title"
          value={summary}
          autoFocus
          onChange={(e) => setSummary(e.target.value)}
        />
        <label className="cal-allday-toggle">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          All day
        </label>
        <div className="cal-field-row">
          <label>Start</label>
          <input
            type={allDay ? "date" : "datetime-local"}
            className="cal-field"
            value={allDay ? start.slice(0, 10) : start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="cal-field-row">
          <label>End</label>
          <input
            type={allDay ? "date" : "datetime-local"}
            className="cal-field"
            value={allDay ? end.slice(0, 10) : end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <div className="cal-field-row">
          <label>Calendar</label>
          <select
            className="cal-field"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
          >
            {calendars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.summary}
              </option>
            ))}
          </select>
        </div>
        <input
          className="cal-field"
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <div className="cal-panel-foot">
          {isEdit &&
            ev &&
            (confirmDel ? (
              <button
                className="cal-del confirm"
                onClick={() => onDelete(ev.id, ev.calendarId)}
              >
                Really delete?
              </button>
            ) : (
              <button className="cal-del" onClick={() => setConfirmDel(true)}>
                Delete
              </button>
            ))}
          <button className="cal-save" onClick={save}>
            {isEdit ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────── Day-overview rails (bake-off: none/agenda/planner/month) ─────────── */
function todaysEvents(events: CalEvent[]): CalEvent[] {
  const ds = M.toLocalISODate(new Date());
  return events
    .filter((e) => !e.allDay && e.start.slice(0, 10) === ds)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));
}
function nextUp(events: CalEvent[]): CalEvent | undefined {
  const now = Date.now();
  return [...events]
    .filter((e) => !e.allDay && +new Date(e.start) > now)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))[0];
}
function fmtH(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/* V1 none — slim glance strip above the full-bleed grid */
function NextUpStrip({ events }: { events: CalEvent[] }) {
  const n = nextUp(events);
  const open = M.freeGaps(events, new Date()).reduce((s, g) => s + g.mins, 0);
  return (
    <div className="cal-strip">
      <span className="cal-strip-now">
        {n
          ? `Next · ${M.fmtTime(new Date(n.start))} — ${n.summary}`
          : "Nothing left on the calendar today"}
      </span>
      {open > 0 && <span className="cal-strip-open">{fmtH(open)} open</span>}
    </div>
  );
}

/* V2 agenda — today as a readable itinerary. 4 sub-variants for the bake-off. */
export type AgendaStyle = "list" | "nownext" | "spine" | "periods";

function AgendaRail({
  events,
  onPick,
  variant = "list",
}: {
  events: CalEvent[];
  onPick: (e: CalEvent) => void;
  variant?: AgendaStyle;
}) {
  const day = todaysEvents(events);
  return (
    <aside className="cal-rail agenda">
      <div className="cal-rail-date">{M.fmtRange("day", new Date())}</div>
      {day.length === 0 && <div className="cal-rail-dim">No events today.</div>}
      {variant === "list" && (
        <AgList day={day} events={events} onPick={onPick} />
      )}
      {variant === "nownext" && <AgNowNext day={day} onPick={onPick} />}
      {variant === "spine" && <AgSpine day={day} onPick={onPick} />}
      {variant === "periods" && (
        <AgPeriods day={day} events={events} onPick={onPick} />
      )}
    </aside>
  );
}

type AgProps = { day: CalEvent[]; onPick: (e: CalEvent) => void };

/* A1 — clean itinerary list + open windows */
function AgList({ day, events, onPick }: AgProps & { events: CalEvent[] }) {
  const n = nextUp(events);
  const gaps = M.freeGaps(events, new Date());
  return (
    <>
      <div className="cal-agenda">
        {day.map((e) => (
          <button
            key={e.id}
            className={`cal-ag-row${n && n.id === e.id ? " next" : ""}`}
            onClick={() => onPick(e)}
          >
            <span className="cal-ag-time">{M.fmtTime(new Date(e.start))}</span>
            <span
              className="cal-ag-dot"
              style={{ background: e.color || "#1a5c3a" }}
            />
            <span className="cal-ag-title">{e.summary || "(untitled)"}</span>
          </button>
        ))}
      </div>
      <div className="cal-rail-block">
        <div className="cal-rail-label">Open windows</div>
        {gaps.slice(0, 4).map((g, i) => (
          <div key={i} className="cal-rail-gap">
            {g.label}
          </div>
        ))}
        {gaps.length === 0 && <div className="cal-rail-dim">fully booked</div>}
      </div>
    </>
  );
}

/* A2 — Now & Next: what's happening, what's after, then the rest */
function AgNowNext({ day, onPick }: AgProps) {
  const now = Date.now();
  const cur = day.find(
    (e) => +new Date(e.start) <= now && +new Date(e.end) > now,
  );
  const future = day.filter((e) => +new Date(e.start) > now);
  const next = future[0];
  const later = future.slice(1);
  return (
    <>
      <div className="cal-nn-card" onClick={() => cur && onPick(cur)}>
        <div className="cal-nn-label">{cur ? "Right now" : "Open"}</div>
        {cur ? (
          <>
            <div className="cal-nn-title">{cur.summary}</div>
            <div className="cal-nn-sub">
              until {M.fmtTime(new Date(cur.end))}
            </div>
          </>
        ) : (
          <>
            <div className="cal-nn-title">Free time</div>
            <div className="cal-nn-sub">
              {next
                ? `until ${M.fmtTime(new Date(next.start))}`
                : "rest of the day"}
            </div>
          </>
        )}
      </div>
      {next && (
        <button className="cal-nn-next" onClick={() => onPick(next)}>
          <span className="cal-nn-next-label">Next</span>
          <span className="cal-nn-next-t">
            {M.fmtTime(new Date(next.start))}
          </span>
          <span className="cal-nn-next-s">{next.summary}</span>
        </button>
      )}
      {later.length > 0 && (
        <div className="cal-rail-block">
          <div className="cal-rail-label">Later</div>
          {later.map((e) => (
            <button
              key={e.id}
              className="cal-nn-later"
              onClick={() => onPick(e)}
            >
              {M.fmtTime(new Date(e.start))} · {e.summary}
            </button>
          ))}
        </div>
      )}
      <div className="cal-rail-block">
        <div className="cal-rail-label">Open windows</div>
        {M.freeGaps(day, new Date())
          .slice(0, 4)
          .map((g, i) => (
            <div key={i} className="cal-rail-gap">
              {g.label}
            </div>
          ))}
        {M.freeGaps(day, new Date()).length === 0 && (
          <div className="cal-rail-dim">fully booked</div>
        )}
      </div>
    </>
  );
}

/* A3 — vertical scroll spine: the day as an emaki you read top→bottom */
function AgSpine({ day, onPick }: AgProps) {
  const now = Date.now();
  return (
    <div className="cal-spine">
      {day.map((e) => {
        const past = +new Date(e.end) < now;
        const live = +new Date(e.start) <= now && +new Date(e.end) > now;
        return (
          <button
            key={e.id}
            className={`cal-sp-row${past ? " past" : ""}${live ? " live" : ""}`}
            onClick={() => onPick(e)}
          >
            <span
              className="cal-sp-node"
              style={{ background: e.color || "#1a5c3a" }}
            />
            <span className="cal-sp-time">{M.fmtTime(new Date(e.start))}</span>
            <span className="cal-sp-title">{e.summary || "(untitled)"}</span>
          </button>
        );
      })}
    </div>
  );
}

/* A4 — grouped by time of day with a summary header */
function AgPeriods({ day, events, onPick }: AgProps & { events: CalEvent[] }) {
  const open = M.freeGaps(events, new Date()).reduce((s, g) => s + g.mins, 0);
  const groups: { label: string; items: CalEvent[] }[] = [
    {
      label: "Morning",
      items: day.filter((e) => new Date(e.start).getHours() < 12),
    },
    {
      label: "Afternoon",
      items: day.filter((e) => {
        const h = new Date(e.start).getHours();
        return h >= 12 && h < 17;
      }),
    },
    {
      label: "Evening",
      items: day.filter((e) => new Date(e.start).getHours() >= 17),
    },
  ];
  return (
    <>
      <div className="cal-pd-summary">
        {day.length} events · {fmtH(open)} open
      </div>
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <div key={g.label} className="cal-pd-group">
            <div className="cal-rail-label">{g.label}</div>
            {g.items.map((e) => (
              <button
                key={e.id}
                className="cal-pd-row"
                onClick={() => onPick(e)}
              >
                <span className="cal-pd-time">
                  {M.fmtTime(new Date(e.start))}
                </span>
                <span className="cal-pd-title">
                  {e.summary || "(untitled)"}
                </span>
              </button>
            ))}
          </div>
        ))}
    </>
  );
}

/* V3 planner — open-time + tap-to-drop focus blocks */
const FOCUS_CHIPS = [
  { label: "Deep work", mins: 90 },
  { label: "Admin", mins: 30 },
  { label: "Break", mins: 15 },
  { label: "Workout", mins: 60 },
];
function PlannerRail({
  events,
  onAddBlock,
}: {
  events: CalEvent[];
  onAddBlock: (s: Date, e: Date, allDay?: boolean) => void;
}) {
  const gaps = M.freeGaps(events, new Date());
  const openMins = gaps.reduce((s, g) => s + g.mins, 0);
  const booked = todaysEvents(events).reduce(
    (s, e) => s + (+new Date(e.end) - +new Date(e.start)) / 60000,
    0,
  );
  const count = todaysEvents(events).length;
  const place = (mins: number) => {
    const g = gaps.find((gp) => gp.mins >= mins) ?? gaps[0];
    const start = g
      ? new Date(g.start)
      : (() => {
          const d = new Date();
          d.setMinutes(0, 0, 0);
          d.setHours(d.getHours() + 1);
          return d;
        })();
    onAddBlock(start, new Date(start.getTime() + mins * 60000));
  };
  return (
    <aside className="cal-rail planner">
      <div className="cal-rail-date">{M.fmtRange("day", new Date())}</div>
      <div className="cal-plan-stat">
        <div className="cal-plan-big">{fmtH(openMins)}</div>
        <div className="cal-rail-label">open today</div>
      </div>
      <div className="cal-plan-load">
        {count} events · {fmtH(booked)} booked
      </div>
      <div className="cal-rail-block">
        <div className="cal-rail-label">Drop a focus block</div>
        <div className="cal-chips">
          {FOCUS_CHIPS.map((c) => (
            <button
              key={c.label}
              className="cal-chip"
              onClick={() => place(c.mins)}
            >
              {c.label} <span>{c.mins}m</span>
            </button>
          ))}
        </div>
        <div className="cal-plan-hint">
          tap to drop into your next open window
        </div>
      </div>
      <div className="cal-rail-block">
        <div className="cal-rail-label">Open windows</div>
        {gaps.slice(0, 4).map((g, i) => (
          <div key={i} className="cal-rail-gap">
            {g.label}
          </div>
        ))}
      </div>
    </aside>
  );
}

/* V4 month — mini-month to jump dates + next-up */
function monthGrid(first: Date): (Date | null)[] {
  const y = first.getFullYear();
  const mo = first.getMonth();
  const startDow = (new Date(y, mo, 1).getDay() || 7) - 1; // Mon=0
  const daysIn = new Date(y, mo + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(new Date(y, mo, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function MonthRail({
  anchor,
  events,
  onJump,
}: {
  anchor: Date;
  events: CalEvent[];
  onJump: (d: Date) => void;
}) {
  const [m, setM] = useState(
    () => new Date(anchor.getFullYear(), anchor.getMonth(), 1),
  );
  const cells = monthGrid(m);
  const eventDays = new Set(events.map((e) => e.start.slice(0, 10)));
  const n = nextUp(events);
  return (
    <aside className="cal-rail month">
      <div className="cal-mo-head">
        <button
          onClick={() => setM(new Date(m.getFullYear(), m.getMonth() - 1, 1))}
        >
          ‹
        </button>
        <span>
          {m.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() => setM(new Date(m.getFullYear(), m.getMonth() + 1, 1))}
        >
          ›
        </button>
      </div>
      <div className="cal-mo-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={`h${i}`} className="cal-mo-dow">
            {d}
          </span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button
              key={i}
              className={`cal-mo-day${M.isToday(d) ? " today" : ""}${M.sameDay(d, anchor) ? " sel" : ""}`}
              onClick={() => onJump(d)}
            >
              {d.getDate()}
              {eventDays.has(M.toLocalISODate(d)) && (
                <span className="cal-mo-dot" />
              )}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      <div className="cal-rail-block">
        <div className="cal-rail-label">Next up</div>
        {n ? (
          <div className="cal-rail-next">
            <div className="cal-rail-next-t">
              {M.fmtTime(new Date(n.start))}
            </div>
            <div className="cal-rail-next-s">{n.summary}</div>
          </div>
        ) : (
          <div className="cal-rail-dim">clear</div>
        )}
      </div>
    </aside>
  );
}

/* ─────────── styles ─────────── */
function CalendarStyles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@500;600&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
.cal-root{--gold:#C9A24C;--gold-deep:#8B6E2A;--amber:#F0C060;--ember:#D87C52;--ink:#221a0d;--ink-soft:#4a3f2c;--parchment:#FBF6EA;--serif:'Noto Serif JP',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif;--mono:'JetBrains Mono',ui-monospace,monospace;position:relative;min-height:100vh;font-family:var(--sans);color:var(--ink);display:flex;flex-direction:column;}
.cal-embedded{height:100vh;overflow:hidden;}
.cal-sky{position:fixed;inset:0;z-index:0;background:url('/art/tabs/calendar-day.webp') center/cover;}
.cal-scrim{position:fixed;inset:0;z-index:1;background:linear-gradient(180deg,rgba(245,239,224,0.7),rgba(245,239,224,0.86));}
.cal-reauth{position:relative;z-index:6;margin:8px 16px;padding:9px 14px;border-radius:10px;background:rgba(216,124,82,0.16);border:1px solid var(--ember);font-size:13px;color:#7a3a22;}
.cal-reauth a{color:var(--gold-deep);font-weight:600;}
.cal-connect{position:absolute;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;}
.cal-connect-card{background:var(--parchment);border:1px solid rgba(201,162,76,0.5);border-radius:18px;box-shadow:0 24px 70px rgba(60,44,18,0.28);padding:36px 40px;text-align:center;max-width:380px;}
.cal-connect-title{font-family:var(--serif);font-size:24px;font-weight:600;margin-bottom:8px;}
.cal-connect-sub{font-size:14px;color:var(--ink-soft);line-height:1.5;margin-bottom:20px;}
.cal-connect-btn{display:inline-block;font-family:var(--mono);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;padding:12px 22px;border-radius:999px;background:var(--amber);color:#1a160f;text-decoration:none;box-shadow:0 6px 20px rgba(240,192,96,0.45);}
.cal-head{position:relative;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 22px;flex-wrap:wrap;}
.cal-head-left{display:flex;align-items:center;gap:16px;}
.cal-title{font-family:var(--serif);font-size:22px;font-weight:600;}
.cal-nav{display:inline-flex;gap:2px;}
.cal-nav button{font-family:var(--sans);font-size:16px;width:30px;height:30px;border:1px solid rgba(139,110,42,0.35);background:rgba(251,246,234,0.7);border-radius:8px;cursor:pointer;color:var(--ink);}
.cal-nav .cal-today{width:auto;padding:0 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;}
.cal-range{font-family:var(--mono);font-size:12px;letter-spacing:0.06em;color:var(--gold-deep);text-transform:uppercase;}
.cal-head-right{display:flex;align-items:center;gap:12px;}
.cal-viewtoggle{display:inline-flex;border:1px solid rgba(139,110,42,0.35);border-radius:8px;overflow:hidden;}
.cal-viewtoggle button{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:0.08em;padding:7px 14px;border:none;background:rgba(251,246,234,0.6);cursor:pointer;color:var(--ink-soft);}
.cal-viewtoggle button.on{background:var(--amber);color:#1a160f;}
.cal-legend{position:relative;}
.cal-legend-btn{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:0.06em;padding:7px 12px;border:1px solid rgba(139,110,42,0.35);border-radius:999px;background:rgba(251,246,234,0.7);cursor:pointer;color:var(--ink-soft);}
.cal-legend-pop{position:absolute;right:0;top:38px;z-index:20;background:var(--parchment);border:1px solid rgba(139,110,42,0.4);border-radius:12px;box-shadow:0 12px 36px rgba(60,44,18,0.24);padding:8px;min-width:200px;}
.cal-legend-row{display:flex;align-items:center;gap:9px;width:100%;padding:7px 8px;border:none;background:none;cursor:pointer;border-radius:7px;font-size:13px;color:var(--ink);}
.cal-legend-row:hover{background:rgba(201,162,76,0.12);}
.cal-legend-row.off{opacity:0.4;}
.cal-legend-dot{width:11px;height:11px;border-radius:3px;flex:none;}
.cal-legend-name{text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cal-body{position:relative;z-index:4;display:flex;gap:0;flex:1;min-height:0;}
.cal-rail{flex:none;border-right:1px solid rgba(139,110,42,0.2);padding:18px 18px;overflow-y:auto;background:rgba(251,246,234,0.5);}
.cal-rail.agenda{width:262px;}
.cal-rail.planner{width:240px;}
.cal-rail.month{width:248px;}
/* agenda */
.cal-agenda{display:flex;flex-direction:column;gap:2px;margin-bottom:18px;}
.cal-ag-row{display:flex;align-items:center;gap:9px;width:100%;text-align:left;border:none;background:none;cursor:pointer;padding:8px 8px;border-radius:8px;border-left:2px solid transparent;}
.cal-ag-row:hover{background:rgba(201,162,76,0.12);}
.cal-ag-row.next{background:rgba(240,192,96,0.18);border-left-color:var(--amber);}
.cal-ag-time{font-family:var(--mono);font-size:11px;color:var(--gold-deep);width:52px;flex:none;}
.cal-ag-dot{width:8px;height:8px;border-radius:50%;flex:none;}
.cal-ag-title{font-size:13.5px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* A2 now/next */
.cal-nn-card{background:rgba(240,192,96,0.16);border:1px solid var(--gold);border-radius:14px;padding:16px;margin-bottom:12px;cursor:pointer;}
.cal-nn-label{font-family:var(--mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:6px;}
.cal-nn-title{font-family:var(--serif);font-size:20px;font-weight:600;line-height:1.2;}
.cal-nn-sub{font-size:12.5px;color:var(--ink-soft);margin-top:3px;}
.cal-nn-next{display:flex;flex-direction:column;gap:2px;width:100%;text-align:left;background:rgba(255,255,255,0.55);border:1px solid rgba(139,110,42,0.3);border-radius:12px;padding:12px 14px;margin-bottom:16px;cursor:pointer;}
.cal-nn-next-label{font-family:var(--mono);font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold-deep);}
.cal-nn-next-t{font-family:var(--mono);font-size:13px;color:var(--ember);}
.cal-nn-next-s{font-family:var(--serif);font-size:15px;color:var(--ink);}
.cal-nn-later{display:block;width:100%;text-align:left;background:none;border:none;cursor:pointer;font-size:12.5px;color:var(--ink-soft);padding:5px 4px;border-radius:6px;}
.cal-nn-later:hover{background:rgba(201,162,76,0.12);}
/* A3 spine */
.cal-spine{position:relative;padding-left:6px;}
.cal-spine::before{content:"";position:absolute;left:11px;top:8px;bottom:8px;width:2px;background:linear-gradient(180deg,transparent,rgba(201,162,76,0.5) 10%,rgba(201,162,76,0.5) 90%,transparent);}
.cal-sp-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:none;border:none;cursor:pointer;padding:9px 6px;position:relative;border-radius:8px;}
.cal-sp-row:hover{background:rgba(201,162,76,0.1);}
.cal-sp-node{width:11px;height:11px;border-radius:50%;flex:none;z-index:1;box-shadow:0 0 0 3px var(--parchment);}
.cal-sp-time{font-family:var(--mono);font-size:11px;color:var(--gold-deep);width:50px;flex:none;}
.cal-sp-title{font-size:13.5px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cal-sp-row.past{opacity:0.45;}
.cal-sp-row.live .cal-sp-node{box-shadow:0 0 0 3px var(--parchment),0 0 10px var(--amber);}
.cal-sp-row.live .cal-sp-title{font-weight:600;}
/* A4 periods */
.cal-pd-summary{font-family:var(--mono);font-size:11px;color:var(--gold-deep);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;}
.cal-pd-group{margin-bottom:16px;}
.cal-pd-row{display:flex;gap:10px;width:100%;text-align:left;background:none;border:none;cursor:pointer;padding:6px 4px;border-radius:6px;}
.cal-pd-row:hover{background:rgba(201,162,76,0.12);}
.cal-pd-time{font-family:var(--mono);font-size:11px;color:var(--gold-deep);width:50px;flex:none;}
.cal-pd-title{font-size:13px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* planner */
.cal-plan-stat{margin-bottom:6px;}
.cal-plan-big{font-family:var(--serif);font-size:34px;font-weight:600;line-height:1;color:var(--emerald,#1a5c3a);}
.cal-plan-load{font-family:var(--mono);font-size:11px;color:var(--ink-soft);margin-bottom:18px;}
.cal-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:8px;}
.cal-chip{font-family:var(--sans);font-size:12.5px;font-weight:500;color:var(--ink);background:rgba(255,255,255,0.7);border:1px solid var(--gold);border-radius:999px;padding:7px 12px;cursor:pointer;transition:all 160ms ease;}
.cal-chip span{font-family:var(--mono);font-size:10px;color:var(--gold-deep);}
.cal-chip:hover{background:var(--amber);transform:translateY(-1px);}
.cal-plan-hint{font-size:11px;font-style:italic;color:var(--ink-soft);opacity:0.7;}
/* month */
.cal-mo-head{display:flex;justify-content:space-between;align-items:center;font-family:var(--serif);font-size:14px;font-weight:600;margin-bottom:10px;}
.cal-mo-head button{border:none;background:none;font-size:16px;cursor:pointer;color:var(--ink-soft);width:24px;}
.cal-mo-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:18px;}
.cal-mo-dow{font-family:var(--mono);font-size:9px;color:var(--gold-deep);text-align:center;padding-bottom:4px;}
.cal-mo-day{position:relative;aspect-ratio:1;border:none;background:none;cursor:pointer;border-radius:7px;font-size:12px;color:var(--ink);display:flex;align-items:center;justify-content:center;}
.cal-mo-day:hover{background:rgba(201,162,76,0.15);}
.cal-mo-day.today{font-weight:700;color:var(--gold-deep);}
.cal-mo-day.sel{background:var(--amber);color:#1a160f;font-weight:600;}
.cal-mo-dot{position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--ember);}
/* none-variant strip */
.cal-strip{display:flex;justify-content:space-between;align-items:center;padding:9px 18px;background:rgba(251,246,234,0.66);border-bottom:1px solid rgba(139,110,42,0.25);font-size:13px;}
.cal-strip-now{font-family:var(--serif);color:var(--ink);}
.cal-strip-open{font-family:var(--mono);font-size:11px;color:var(--emerald,#1a5c3a);}
.cal-rail-date{font-family:var(--serif);font-size:16px;font-weight:600;margin-bottom:16px;}
.cal-rail-block{margin-bottom:18px;}
.cal-rail-label{font-family:var(--mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:7px;}
.cal-rail-vitals{display:flex;flex-direction:column;gap:4px;font-size:13px;font-family:var(--mono);}
.cal-rail-big{font-family:var(--serif);font-size:26px;font-weight:600;}
.cal-rail-q{font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;}
.cal-rail-gap{font-size:12px;font-family:var(--mono);color:var(--emerald,#1a5c3a);margin-bottom:4px;}
.cal-rail-dim{font-size:12.5px;color:var(--ink-soft);opacity:0.6;font-style:italic;}
.cal-rail-next-t{font-family:var(--mono);font-size:14px;color:var(--gold-deep);}
.cal-rail-next-s{font-family:var(--serif);font-size:16px;}
.cal-grid-wrap{flex:1;display:flex;flex-direction:column;min-width:0;}
.cal-allday{display:flex;align-items:flex-start;border-bottom:1px solid rgba(139,110,42,0.25);padding:5px 0;min-height:26px;background:rgba(251,246,234,0.4);}
.cal-allday.empty{min-height:0;border-bottom:1px solid rgba(139,110,42,0.18);}
.cal-allday-label{flex:none;font-family:var(--mono);font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:var(--gold-deep);padding-top:5px;text-align:right;padding-right:8px;}
.cal-allday-cols{display:flex;flex:1;gap:2px;}
.cal-allday-col{flex:1;display:flex;flex-direction:column;gap:2px;padding:0 2px;}
.cal-allday-chip{font-size:11px;color:#fff;border:none;border-radius:5px;padding:3px 7px;cursor:pointer;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cal-scroll{flex:1;overflow-y:auto;position:relative;}
.cal-grid{position:relative;}
.cal-axis{position:absolute;top:0;left:0;height:100%;}
.cal-axis-h{position:absolute;right:8px;transform:translateY(-6px);font-family:var(--mono);font-size:10px;color:var(--ink-soft);opacity:0.7;}
.cal-cols{position:absolute;top:0;right:0;height:100%;display:flex;}
.cal-rule{position:absolute;left:0;right:0;height:1px;background:rgba(139,110,42,0.16);}
.cal-col{position:relative;flex:1;border-left:1px solid rgba(139,110,42,0.12);min-width:0;touch-action:none;}
.cal-col.today{background:rgba(240,192,96,0.06);}
.cal-now{position:absolute;left:0;right:0;height:2px;background:var(--ember);z-index:5;box-shadow:0 0 6px rgba(216,124,82,0.7);}
.cal-now::before{content:"";position:absolute;left:-1px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--ember);}
.cal-ghost{position:absolute;left:2px;right:2px;background:rgba(240,192,96,0.4);border:1.5px dashed var(--gold-deep);border-radius:6px;z-index:4;pointer-events:none;}
.cal-event{position:absolute;border-radius:6px;color:#fff;padding:3px 7px;overflow:hidden;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,0.18);border:1px solid rgba(255,255,255,0.25);font-size:12px;z-index:3;}
.cal-event:active{cursor:grabbing;}
.cal-event-time{font-family:var(--mono);font-size:9.5px;opacity:0.92;}
.cal-event-title{font-weight:600;line-height:1.2;overflow:hidden;text-overflow:ellipsis;}
.cal-event-handle{position:absolute;left:0;right:0;height:7px;cursor:ns-resize;}
.cal-event-handle.top{top:0;}
.cal-event-handle.bottom{bottom:0;}
.cal-panel-scrim{position:fixed;inset:0;z-index:30;background:rgba(20,14,6,0.4);}
.cal-panel{position:fixed;top:0;right:0;bottom:0;z-index:31;width:min(380px,100%);background:linear-gradient(180deg,#FBF6EA,#F2E9D2);box-shadow:-16px 0 48px rgba(0,0,0,0.3);padding:22px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;}
.cal-panel-head{display:flex;justify-content:space-between;align-items:center;font-family:var(--serif);font-size:18px;font-weight:600;}
.cal-x{border:none;background:none;font-size:24px;cursor:pointer;color:var(--ink-soft);line-height:1;}
.cal-field{font-family:var(--sans);font-size:14px;padding:9px 11px;border:1px solid rgba(139,110,42,0.4);border-radius:9px;background:rgba(255,255,255,0.7);color:var(--ink);width:100%;}
.cal-field-title{font-family:var(--serif);font-size:18px;}
.cal-field-row{display:flex;flex-direction:column;gap:4px;}
.cal-field-row label{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--gold-deep);}
.cal-allday-toggle{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-soft);}
.cal-panel-foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:10px;padding-top:14px;}
.cal-save{font-family:var(--mono);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;padding:11px 22px;border:none;border-radius:999px;background:var(--amber);color:#1a160f;cursor:pointer;box-shadow:0 4px 14px rgba(240,192,96,0.4);}
.cal-del{font-family:var(--mono);font-size:11px;text-transform:uppercase;padding:10px 16px;border:1px solid rgba(181,86,75,0.5);border-radius:999px;background:none;color:#a4392b;cursor:pointer;}
.cal-del.confirm{background:#a4392b;color:#fff;border-color:#a4392b;}
.cal-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:40;background:#7a2b22;color:#fff;padding:10px 18px;border-radius:999px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,0.3);}
@media (max-width:768px){.cal-rail{display:none;}}
@media (prefers-reduced-motion:reduce){.cal-event,.cal-now{transition:none;}}
    `}</style>
  );
}
