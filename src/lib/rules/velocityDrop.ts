/**
 * Velocity drop — when 7-day trailing ships/day is less than 50% of 30-day
 * trailing AND habits are broken 3 days running, suggest home mode (low-effort
 * recovery). Skips silently if HC habits aren't configured (returns null
 * because the second condition can't be verified).
 */
import type { Rule, RuleAction } from "../ruleEngine";
import { shipsPerDayLast30 } from "../shipLog";
import { hcClient, getUserId } from "../hcSupabase";

const SHIPS_RATIO_THRESHOLD = 0.5;
const BROKEN_DAYS_THRESHOLD = 3;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function brokenHabitDaysLast3(): Promise<number | null> {
  const c = hcClient();
  if (!c) return null;
  const userId = await getUserId().catch(() => null);
  if (!userId) return null;
  try {
    const since = new Date();
    since.setDate(since.getDate() - 3);
    const sinceStr = dayKey(since);
    const { data, error } = await c
      .from("habit_completions")
      .select("completed_date")
      .eq("user_id", userId)
      .gte("completed_date", sinceStr);
    if (error) return null;
    const days = new Set((data ?? []).map((r: { completed_date: string }) => r.completed_date));
    // For each of the last 3 days (excl today, since today is still in flight),
    // count days where there were ZERO completions.
    let broken = 0;
    for (let i = 1; i <= 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (!days.has(dayKey(d))) broken += 1;
    }
    return broken;
  } catch {
    return null;
  }
}

export const velocityDrop: Rule = {
  id: "velocity-drop",
  name: "Velocity drop + habits broken",
  schedule: "daily",
  evaluate: async (): Promise<RuleAction | null> => {
    let last30: { day: string; count: number }[];
    try {
      last30 = await shipsPerDayLast30();
    } catch {
      return null;
    }
    if (last30.length < 30) return null;
    const last7 = last30.slice(-7);
    const last30Total = last30.reduce((a, b) => a + b.count, 0);
    const last7Total = last7.reduce((a, b) => a + b.count, 0);
    const last30PerDay = last30Total / 30;
    const last7PerDay = last7Total / 7;
    if (last30PerDay <= 0) return null;
    const ratio = last7PerDay / last30PerDay;
    if (ratio >= SHIPS_RATIO_THRESHOLD) return null;

    const broken = await brokenHabitDaysLast3();
    if (broken == null) return null; // HC not configured — skip silently
    if (broken < BROKEN_DAYS_THRESHOLD) return null;

    return {
      kind: "queue_item",
      title: "Velocity halved + habits broken — switch to home mode?",
      source: "cross-tab",
      options: ["Enable home mode", "Push through", "Take the day off"],
      note: `Ships/day last 7d: ${last7PerDay.toFixed(2)} (vs 30d avg ${last30PerDay.toFixed(2)} — ${(ratio * 100).toFixed(0)}% of baseline). Habits broken ${broken} of last 3 days. Pattern says recovery, not push.`,
    };
  },
};
