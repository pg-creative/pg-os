/**
 * Low recovery + heavy calendar — when Whoop recovery <50% AND today's calendar
 * has 4+ events, suggest declining/rescheduling. Hourly rule but the queue
 * filename is YYYYMMDD-stamped, so it only fires once per day.
 *
 * Both the Whoop and Calendar reads are best-effort. Any token / API failure
 * causes the rule to silently skip (return null) — never throws.
 */
import type { Rule, RuleAction } from "../ruleEngine";
import { getTokens, isExpired, refreshAndStore } from "../tokenStore";
import { fetchWhoopVitals, refreshWhoopToken } from "../whoop";
import { listEventsAcrossCalendars } from "../calendarService";

const RECOVERY_THRESHOLD = 50;
const CALENDAR_THRESHOLD = 4;

async function getRecovery(): Promise<number | null> {
  try {
    const current = await getTokens("whoop");
    if (!current?.refreshToken) return null;
    const tokens = isExpired(current)
      ? await refreshAndStore("whoop", refreshWhoopToken)
      : current;
    if (!tokens.accessToken) return null;
    const vitals = await fetchWhoopVitals(tokens.accessToken);
    return vitals.recovery;
  } catch {
    return null;
  }
}

async function getTodayEventCount(): Promise<number | null> {
  try {
    const current = await getTokens("google");
    if (!current?.refreshToken) return null;
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    const events = await listEventsAcrossCalendars(
      current.refreshToken,
      from,
      to,
      { maxResults: 50 },
    );
    // Count only timed (non-all-day) events; CalEvent has no attendees field
    // so declined-event filtering is handled at the Google level via singleEvents.
    return events.filter((e) => !e.allDay).length;
  } catch {
    return null;
  }
}

export const lowRecoveryHeavyCalendar: Rule = {
  id: "low-recovery-heavy-calendar",
  name: "Low recovery + heavy calendar",
  schedule: "hourly",
  evaluate: async (): Promise<RuleAction | null> => {
    const [recovery, eventCount] = await Promise.all([
      getRecovery(),
      getTodayEventCount(),
    ]);
    if (recovery == null || eventCount == null) return null;
    if (recovery >= RECOVERY_THRESHOLD) return null;
    if (eventCount < CALENDAR_THRESHOLD) return null;
    return {
      kind: "queue_item",
      title: "Recovery low + calendar heavy — what to decline?",
      source: "cross-tab",
      options: ["Decline 1-2 events", "Reschedule", "Plow through"],
      note: `Whoop recovery: ${recovery}%. Today's events: ${eventCount}. Both signals say slow down.`,
    };
  },
};
