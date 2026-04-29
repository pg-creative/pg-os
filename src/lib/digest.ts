/**
 * digest.ts — Assembles PG OS state snapshots for the /api/digest/ endpoints.
 *
 * Used by the morning-briefing agent (and future agents) to fetch a structured
 * summary of habits, tasks, queue depth, ships, and Whoop recovery.
 */

import { getDaySnapshot, getSeasonStatus } from "./habits";
import { listTasks } from "./tasks";
import { listQueue } from "./queueStore";
import { listShips } from "./shipLog";
import { getTokens, isExpired, refreshAndStore } from "./tokenStore";
import { fetchWhoopVitals, refreshWhoopToken } from "./whoop";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DigestSeason = {
  tier: string;
  tier_floor: string;
  xp_percent: number;
  days_remaining: number;
};

export type DigestHabit = {
  id: string;
  name: string;
  frequency: string;
  completed: boolean;
};

export type DigestHabits = {
  completed_today: number;
  total_today: number;
  streak_7day_pct: number;
  top_3_anchors: DigestHabit[];
};

export type DigestTasks = {
  todo_count: number;
  doing_count: number;
  overdue_count: number;
  top_3: Array<{ id: string; title: string; project_id: string | null }>;
};

export type DigestRecovery = {
  recovery: number | null;
  hrv: number | null;
  resting_hr: number | null;
  sleep_hours: number | null;
  sleep_performance: number | null;
} | null;

export type MorningDigest = {
  ok: true;
  date: string;
  season: DigestSeason | null;
  habits: DigestHabits | null;
  tasks: DigestTasks | null;
  queue_depth: number;
  last_ship_at: string | null;
  recovery: DigestRecovery;
};

export type EveningDigest = MorningDigest & {
  ships_today: number;
  ships: Array<{ text: string; context: string | null; created_at: string }>;
  tomorrows_one: string | null;
  tier_changed: { from: string; to: string } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchRecovery(): Promise<DigestRecovery> {
  try {
    const current = await getTokens("whoop");
    if (!current?.refreshToken) return null;
    const tokens = isExpired(current)
      ? await refreshAndStore("whoop", refreshWhoopToken)
      : current;
    if (!tokens.accessToken) return null;
    const v = await fetchWhoopVitals(tokens.accessToken);
    return {
      recovery: v.recovery,
      hrv: v.hrv,
      resting_hr: v.restingHr,
      sleep_hours: v.sleepHours,
      sleep_performance: v.sleepPerformance,
    };
  } catch {
    return null;
  }
}

async function buildTasksDigest(): Promise<DigestTasks | null> {
  try {
    const all = await listTasks();
    const now = Date.now();
    const todoItems = all.filter((t) => t.status === "todo");
    const doingItems = all.filter((t) => t.status === "doing");
    const overdueItems = todoItems.filter(
      (t) => t.due_at && new Date(t.due_at).getTime() < now,
    );
    const top3 = [...doingItems, ...todoItems]
      .slice(0, 3)
      .map((t) => ({ id: t.id, title: t.title, project_id: t.project_id }));
    return {
      todo_count: todoItems.length,
      doing_count: doingItems.length,
      overdue_count: overdueItems.length,
      top_3: top3,
    };
  } catch {
    return null;
  }
}

async function buildHabitsDigest(): Promise<DigestHabits | null> {
  try {
    const snap = await getDaySnapshot();
    if (!snap) return null;
    // "Anchors" = daily habits — top 3 incomplete first, then completed, all
    // sorted by original order (habits are returned in created_at order).
    const daily = snap.habits.filter((h) => h.frequency === "daily");
    const incomplete = daily.filter((h) => !h.completed);
    const completed = daily.filter((h) => h.completed);
    const anchors = [...incomplete, ...completed].slice(0, 3).map((h) => ({
      id: h.id,
      name: h.name,
      frequency: h.frequency,
      completed: h.completed,
    }));
    return {
      completed_today: snap.completedToday,
      total_today: snap.totalToday,
      streak_7day_pct: snap.streak7DayPct,
      top_3_anchors: anchors,
    };
  } catch {
    return null;
  }
}

// ── Public assemblers ─────────────────────────────────────────────────────────

export async function assembleMorningDigest(): Promise<MorningDigest> {
  const date = todayIso();

  const [seasonRaw, habitsDigest, tasksDigest, queueItems, ships, recovery] =
    await Promise.allSettled([
      getSeasonStatus(),
      buildHabitsDigest(),
      buildTasksDigest(),
      listQueue(),
      listShips(10),
      fetchRecovery(),
    ]);

  const season =
    seasonRaw.status === "fulfilled" && seasonRaw.value
      ? {
          tier: seasonRaw.value.tier,
          tier_floor: seasonRaw.value.tier_floor,
          xp_percent: seasonRaw.value.xp_percent,
          days_remaining: seasonRaw.value.days_remaining,
        }
      : null;

  const habits =
    habitsDigest.status === "fulfilled" ? habitsDigest.value : null;

  const tasks =
    tasksDigest.status === "fulfilled" ? tasksDigest.value : null;

  const queueDepth =
    queueItems.status === "fulfilled" ? queueItems.value.length : 0;

  const shipList =
    ships.status === "fulfilled" ? ships.value : [];

  const lastShipAt =
    shipList.length > 0
      ? new Date(shipList[0].created_at).toISOString()
      : null;

  const rec = recovery.status === "fulfilled" ? recovery.value : null;

  return {
    ok: true,
    date,
    season,
    habits,
    tasks,
    queue_depth: queueDepth,
    last_ship_at: lastShipAt,
    recovery: rec,
  };
}

export async function assembleEveningDigest(): Promise<EveningDigest> {
  const morning = await assembleMorningDigest();
  const date = morning.date;

  // Ships today
  const startOfDay = new Date(date + "T00:00:00").getTime();
  let shipsToday: typeof morning extends MorningDigest
    ? Array<{ text: string; context: string | null; created_at: string }>
    : never = [];
  let tierChanged: { from: string; to: string } | null = null;

  try {
    const allShips = await listShips(50);
    const todayShips = allShips.filter((s) => s.created_at >= startOfDay);
    shipsToday = todayShips.map((s) => ({
      text: s.text,
      context: s.context,
      created_at: new Date(s.created_at).toISOString(),
    }));
  } catch {
    shipsToday = [];
  }

  // Tier change detection: compare current tier vs floor. If tier > floor,
  // a tier-up happened this season (we surface it as a signal in the brief).
  if (morning.season) {
    const { tier, tier_floor } = morning.season;
    const LADDER = ["F", "D", "C", "B", "A", "S", "SSS"];
    const tierIdx = LADDER.indexOf(tier);
    const floorIdx = LADDER.indexOf(tier_floor);
    if (tierIdx > floorIdx) {
      tierChanged = { from: tier_floor, to: tier };
    }
  }

  // "Tomorrow's one" — top incomplete todo task title
  const tomorrowsOne =
    morning.tasks && morning.tasks.top_3.length > 0
      ? morning.tasks.top_3[0].title
      : null;

  return {
    ...morning,
    ships_today: shipsToday.length,
    ships: shipsToday,
    tomorrows_one: tomorrowsOne,
    tier_changed: tierChanged,
  };
}
