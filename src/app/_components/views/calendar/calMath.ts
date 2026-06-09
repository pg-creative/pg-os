/**
 * calMath — pure grid/date math for the Calendar module. No React, no deps.
 * Native Date only. Hour grid spans DAY_START_H..DAY_END_H.
 */
import type { CalEvent } from "@/lib/calendarService";

export const DAY_START_H = 6; // first visible hour
export const DAY_END_H = 24; // last (exclusive-ish) hour → 18 rows
export const VISIBLE_HOURS = DAY_END_H - DAY_START_H;
export const PX_PER_MIN = 1.5; // 90px / hour
export const HOUR_PX = 60 * PX_PER_MIN;
export const GRID_HEIGHT = VISIBLE_HOURS * HOUR_PX;
export const SNAP_MIN = 15;
export const MIN_BLOCK_H = 22;
export const HOUR_AXIS_W = 56;

const pad2 = (n: number) => String(n).padStart(2, "0");

export function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Mon-anchored start of the week containing d. */
export function weekStart(d: Date): Date {
  const x = startOfDay(d);
  const dow = x.getDay() === 0 ? 7 : x.getDay(); // Mon=1..Sun=7
  x.setDate(x.getDate() - (dow - 1));
  return x;
}

export function weekDays(anchor: Date): Date[] {
  const s = weekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(s);
    d.setDate(s.getDate() + i);
    return d;
  });
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return sameDay(d, new Date());
}

/** Minutes from DAY_START_H for a Date's local clock time (unclamped). */
export function minutesFromDayStart(date: Date): number {
  return (date.getHours() - DAY_START_H) * 60 + date.getMinutes();
}

export function nowMinutes(): number {
  return minutesFromDayStart(new Date());
}

/** px y-offset within the grid for a given event start (clamped to grid). */
export function topFor(startISO: string): number {
  const m = Math.max(0, minutesFromDayStart(new Date(startISO)));
  return Math.min(GRID_HEIGHT, m * PX_PER_MIN);
}

export function heightFor(startISO: string, endISO: string): number {
  const s = minutesFromDayStart(new Date(startISO));
  const e = minutesFromDayStart(new Date(endISO));
  const top = Math.max(0, s);
  const bottom = Math.min(VISIBLE_HOURS * 60, e);
  return Math.max(MIN_BLOCK_H, (bottom - top) * PX_PER_MIN);
}

/** Snap a pixel y within the grid to a Date on the given day. */
export function yToDate(y: number, dayDate: Date): Date {
  const rawMin = y / PX_PER_MIN;
  const snapped = Math.round(rawMin / SNAP_MIN) * SNAP_MIN;
  const clamped = Math.max(0, Math.min(VISIBLE_HOURS * 60, snapped));
  const d = new Date(dayDate);
  d.setHours(DAY_START_H, 0, 0, 0);
  d.setMinutes(d.getMinutes() + clamped);
  return d;
}

export function fmtTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? "am" : "pm";
  h = h % 12 || 12;
  return m === 0 ? `${h}${ap}` : `${h}:${pad2(m)}${ap}`;
}

export function fmtHourLabel(h: number): string {
  const ap = h < 12 || h === 24 ? "am" : "pm";
  const hh = h % 12 || 12;
  return `${hh} ${ap}`;
}

export function fmtRange(view: "day" | "week", anchor: Date): string {
  if (view === "day") {
    return anchor.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
  const days = weekDays(anchor);
  const a = days[0];
  const b = days[6];
  const aM = a.toLocaleDateString("en-US", { month: "short" });
  const bM = b.toLocaleDateString("en-US", { month: "short" });
  return aM === bM
    ? `${aM} ${a.getDate()} – ${b.getDate()}`
    : `${aM} ${a.getDate()} – ${bM} ${b.getDate()}`;
}

export type LayoutSlot = CalEvent & { _col: number; _cols: number };

/**
 * Greedy overlap-column assignment for concurrent (timed, non-all-day) events.
 * Returns each event with _col (its column index) and _cols (total columns in
 * its overlap cluster) so the renderer can compute left/width.
 */
export function assignColumns(events: CalEvent[]): LayoutSlot[] {
  const timed = events
    .filter((e) => !e.allDay)
    .map((e) => ({
      ev: e,
      s: new Date(e.start).getTime(),
      e: new Date(e.end).getTime(),
    }))
    .sort((a, b) => a.s - b.s || a.e - b.e);

  const slots: (LayoutSlot & { _s: number; _e: number })[] = [];
  const colEnds: number[] = [];
  for (const t of timed) {
    let col = colEnds.findIndex((end) => t.s >= end);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(t.e);
    } else {
      colEnds[col] = t.e;
    }
    slots.push({ ...t.ev, _col: col, _cols: 1, _s: t.s, _e: t.e });
  }

  // cluster width: for each event, total columns among events it overlaps
  for (let i = 0; i < slots.length; i++) {
    let maxCol = slots[i]._col;
    const cluster: number[] = [i];
    for (let j = 0; j < slots.length; j++) {
      if (j === i) continue;
      if (slots[j]._s < slots[i]._e && slots[j]._e > slots[i]._s) {
        cluster.push(j);
        if (slots[j]._col > maxCol) maxCol = slots[j]._col;
      }
    }
    const cols = maxCol + 1;
    for (const idx of cluster) {
      if (cols > slots[idx]._cols) slots[idx]._cols = cols;
    }
  }
  return slots.map(({ _s, _e, ...rest }) => rest);
}

export type FreeGap = { start: Date; end: Date; mins: number; label: string };

/** Free gaps between timed events within working hours of a day. */
export function freeGaps(
  events: CalEvent[],
  dayDate: Date,
  workStartH = 8,
  workEndH = 20,
): FreeGap[] {
  const dayStr = toLocalISODate(dayDate);
  const timed = events
    .filter((e) => !e.allDay && e.start.slice(0, 10) === dayStr)
    .map((e) => ({ s: new Date(e.start), e: new Date(e.end) }))
    .sort((a, b) => a.s.getTime() - b.s.getTime());

  const ws = new Date(dayDate);
  ws.setHours(workStartH, 0, 0, 0);
  const we = new Date(dayDate);
  we.setHours(workEndH, 0, 0, 0);

  const gaps: FreeGap[] = [];
  let cursor = ws;
  for (const t of timed) {
    if (t.s > cursor) {
      const mins = Math.round((t.s.getTime() - cursor.getTime()) / 60000);
      if (mins >= 30) gaps.push(mkGap(cursor, t.s, mins));
    }
    if (t.e > cursor) cursor = t.e;
  }
  if (we > cursor) {
    const mins = Math.round((we.getTime() - cursor.getTime()) / 60000);
    if (mins >= 30) gaps.push(mkGap(cursor, we, mins));
  }
  return gaps;
}

function mkGap(start: Date, end: Date, mins: number): FreeGap {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const dur = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  return {
    start,
    end,
    mins,
    label: `${dur} free · ${fmtTime(start)}–${fmtTime(end)}`,
  };
}
