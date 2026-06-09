/**
 * dayOverview.ts — Structured day-at-a-glance aggregator.
 *
 * Pulls calendar events, vitals, habits, ship streak, queue, and projects
 * via a single Promise.all — each branch catches its own errors so one
 * failing source never kills the whole payload.
 *
 * This is the DATA layer only. Narration lives in briefing.ts — do NOT
 * modify assembleInputs() over there.
 */
import {
  listCalendars,
  listEventsAcrossCalendars,
  type CalendarMeta,
  type CalEvent,
} from "./calendarService";
import { getTokens, isExpired, refreshAndStore } from "./tokenStore";
import { fetchWhoopVitals, refreshWhoopToken, type WhoopVitals } from "./whoop";
import { getDaySnapshot, type DaySnapshot } from "./habits";
import { currentStreak, shippedToday } from "./shipLog";
import { listQueue, type QueueItem } from "./queueStore";
import { listProjectStates, type ProjectState } from "./projectState";
import { startOfDayLocal, endOfDayLocal } from "./dateUtils";

// ── Payload type ──────────────────────────────────────────────────────────────

export type FreeGap = {
  start: string; // ISO
  end: string; // ISO
  durationMins: number;
};

export type DayOverviewPayload = {
  date: string; // YYYY-MM-DD
  weekday: string;
  monthDay: string;
  events: CalEvent[];
  calendars: CalendarMeta[];
  vitals: WhoopVitals | null;
  habits: DaySnapshot | null;
  ships: { streak: number; shippedToday: boolean } | null;
  queue: QueueItem[];
  projects: ProjectState[];
  freeGaps: FreeGap[];
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function todayInfo(): { iso: string; weekday: string; monthDay: string } {
  const d = new Date();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  return { iso, weekday, monthDay };
}

async function getVitals(): Promise<WhoopVitals | null> {
  try {
    const current = await getTokens("whoop");
    if (!current?.refreshToken) return null;
    const tokens = isExpired(current)
      ? await refreshAndStore("whoop", refreshWhoopToken)
      : current;
    if (!tokens.accessToken) return null;
    return await fetchWhoopVitals(tokens.accessToken);
  } catch {
    return null;
  }
}

async function getShips(): Promise<{
  streak: number;
  shippedToday: boolean;
} | null> {
  try {
    const [streak, shipped] = await Promise.all([
      currentStreak(),
      shippedToday(),
    ]);
    return { streak, shippedToday: shipped };
  } catch {
    return null;
  }
}

/**
 * Compute free gaps between timed events during working hours (9am–6pm).
 * Only gaps >= 30 minutes are surfaced.
 */
function computeFreeGaps(events: CalEvent[], targetDate: Date): FreeGap[] {
  const timed = events
    .filter((e) => !e.allDay)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const workStart = new Date(targetDate);
  workStart.setHours(9, 0, 0, 0);
  const workEnd = new Date(targetDate);
  workEnd.setHours(18, 0, 0, 0);

  const gaps: FreeGap[] = [];
  let cursor = workStart;

  for (const e of timed) {
    const evStart = new Date(e.start);
    const evEnd = new Date(e.end);

    if (evStart > cursor) {
      const gapStart = cursor < workStart ? workStart : cursor;
      const gapEnd = evStart < workEnd ? evStart : workEnd;
      if (gapEnd > gapStart) {
        const mins = Math.round(
          (gapEnd.getTime() - gapStart.getTime()) / 60_000,
        );
        if (mins >= 30) {
          gaps.push({
            start: gapStart.toISOString(),
            end: gapEnd.toISOString(),
            durationMins: mins,
          });
        }
      }
    }

    if (evEnd > cursor) cursor = evEnd;
  }

  // Gap after last event through end of work day
  if (cursor < workEnd) {
    const mins = Math.round((workEnd.getTime() - cursor.getTime()) / 60_000);
    if (mins >= 30) {
      gaps.push({
        start: cursor.toISOString(),
        end: workEnd.toISOString(),
        durationMins: mins,
      });
    }
  }

  return gaps;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function assembleDayOverview(): Promise<DayOverviewPayload> {
  const { iso, weekday, monthDay } = todayInfo();
  const now = new Date();
  const from = startOfDayLocal(now);
  const to = endOfDayLocal(now);

  // Each branch is independent — failures return null/[]
  const [eventsAndCals, vitals, habits, ships, queue, projects] =
    await Promise.all([
      // Events + calendars together so we only call listCalendars once
      (async () => {
        try {
          const tokens = await getTokens("google");
          if (!tokens?.refreshToken)
            return {
              events: [] as CalEvent[],
              calendars: [] as CalendarMeta[],
            };
          const [events, calendars] = await Promise.all([
            listEventsAcrossCalendars(tokens.refreshToken, from, to),
            listCalendars(tokens.refreshToken),
          ]);
          return { events, calendars };
        } catch {
          return { events: [] as CalEvent[], calendars: [] as CalendarMeta[] };
        }
      })(),
      getVitals(),
      getDaySnapshot(iso).catch(() => null),
      getShips(),
      listQueue().catch(() => [] as QueueItem[]),
      listProjectStates().catch(() => [] as ProjectState[]),
    ]);

  const freeGaps = computeFreeGaps(eventsAndCals.events, now);

  return {
    date: iso,
    weekday,
    monthDay,
    events: eventsAndCals.events,
    calendars: eventsAndCals.calendars,
    vitals,
    habits,
    ships,
    queue,
    projects,
    freeGaps,
  };
}
