/**
 * Habits + Journal — wired to Hero's Chronicle's Supabase.
 * Source tables: habits, habit_completions, journal_entries.
 */
import { hcClient, getUserId } from "./hcSupabase";

export type Habit = {
  id: string;
  name: string;
  description: string | null;
  frequency: "daily" | "weekdays" | "weekends" | "weekly" | "custom";
  attribute_id: string | null;
  xp_per_completion: number;
  target_value?: number | null;
  target_unit?: string | null;
  weekly_target?: number | null;
};

export type HabitWithCompletion = Habit & {
  completed: boolean;
  completion_notes: string | null;
  actual_value?: number | null;
  /** number of completions in the current ISO week (Mon-Sun) — used for weekly habits */
  weekly_completions?: number;
};

export type Tier = "F" | "D" | "C" | "B" | "A" | "S" | "SSS";

export type SeasonStatus = {
  length_days: number;
  started_at: string;
  days_elapsed: number;
  days_remaining: number;
  xp_earned: number;
  xp_target: number;
  xp_percent: number;
  /** Live tier — can move down as pace slips. */
  tier: Tier;
  /** Ratchet floor: highest tier ever reached this season. */
  tier_floor: Tier;
  /** % progress toward NEXT tier (0–100). At SSS, always 100. */
  tier_progress: number;
  coins: number;
};

export type JournalEntry = {
  entry_date: string;
  raw_text: string;
  cleaned_text: string | null;
  sentiment_score: number | null;
  energy_level: number | null; // 1-10 (we repurpose this as mood 1-5 * 2 or keep as 1-10)
  tags: string[];
};

export type DaySnapshot = {
  date: string;
  habits: HabitWithCompletion[];
  journal: JournalEntry | null;
  completedToday: number;
  totalToday: number;
  streak7DayPct: number; // percentage of last 7 days where >= 80% of habits completed
};

const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Mon-anchored ISO week start for a given YYYY-MM-DD (local). */
function isoWeekStart(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, day ?? 1);
  // Mon=1..Sun=7; subtract (dow-1) days
  const dow = dt.getDay() === 0 ? 7 : dt.getDay();
  dt.setDate(dt.getDate() - (dow - 1));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

/** Bonus multiplier for actual vs target. Capped at 1.5x, floored at 1.0x. */
function xpMultiplier(actual: number | null | undefined, target: number | null | undefined): number {
  if (!target || target <= 0) return 1.0;
  if (actual == null) return 1.0;
  return Math.min(1.5, Math.max(1.0, actual / target));
}

export async function getDaySnapshot(date?: string): Promise<DaySnapshot | null> {
  const c = hcClient();
  if (!c) return null;
  const userId = await getUserId();
  if (!userId) return null;
  const d = date ?? today();

  // Compute ISO-week start (Mon) to bound weekly completions
  const weekStart = isoWeekStart(d);

  const [habitsRes, completionsRes, weekCompletionsRes, journalRes, streakRows] = await Promise.all([
    c.from("habits")
      .select("id, name, description, frequency, attribute_id, xp_per_completion, target_value, target_unit, weekly_target")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    c.from("habit_completions")
      .select("habit_id, notes, actual_value")
      .eq("user_id", userId)
      .eq("completed_date", d),
    c.from("habit_completions")
      .select("habit_id, completed_date")
      .eq("user_id", userId)
      .gte("completed_date", weekStart)
      .lte("completed_date", d),
    c.from("journal_entries")
      .select("entry_date, raw_text, cleaned_text, sentiment_score, energy_level, tags")
      .eq("user_id", userId)
      .eq("entry_date", d)
      .maybeSingle(),
    // Streak: last 7 days — count days with at least 1 completion
    c.rpc("_pg_os_streak", { p_user_id: userId, p_days: 7 }).then(
      (r) => r.data,
      () => null,
    ),
  ]);

  if (habitsRes.error) throw habitsRes.error;
  const completionRows = (completionsRes.data ?? []) as Array<{ habit_id: string; notes: string | null; actual_value: number | null }>;
  const completedIds = new Set(completionRows.map((r) => r.habit_id));
  const notesByHabit = new Map(completionRows.map((r) => [r.habit_id, r.notes]));
  const actualByHabit = new Map(completionRows.map((r) => [r.habit_id, r.actual_value]));

  // Count distinct dates per habit in the current ISO week (so two completions
  // on the same day still count as 1).
  const weekRows = (weekCompletionsRes.data ?? []) as Array<{ habit_id: string; completed_date: string }>;
  const weekDistinct = new Map<string, Set<string>>();
  for (const row of weekRows) {
    let s = weekDistinct.get(row.habit_id);
    if (!s) { s = new Set(); weekDistinct.set(row.habit_id, s); }
    s.add(row.completed_date);
  }

  const habits: HabitWithCompletion[] = (habitsRes.data ?? []).map((h: Habit) => ({
    ...h,
    completed: completedIds.has(h.id),
    completion_notes: notesByHabit.get(h.id) ?? null,
    actual_value: actualByHabit.get(h.id) ?? null,
    weekly_completions: weekDistinct.get(h.id)?.size ?? 0,
  }));

  const totalToday = habits.length;
  const completedToday = habits.filter((h) => h.completed).length;

  // Compute streak ourselves if RPC missing. Days with at least 1 completion in last 7.
  let streak7DayPct = 0;
  if (!streakRows) {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;
    const { data: recent } = await c.from("habit_completions")
      .select("completed_date")
      .eq("user_id", userId)
      .gte("completed_date", sinceStr);
    if (recent) {
      const distinctDays = new Set(recent.map((r: { completed_date: string }) => r.completed_date));
      streak7DayPct = Math.round((distinctDays.size / 7) * 100);
    }
  } else {
    streak7DayPct = streakRows as number;
  }

  return {
    date: d,
    habits,
    journal: journalRes.data as JournalEntry | null,
    completedToday,
    totalToday,
    streak7DayPct,
  };
}

export async function toggleCompletion(habitId: string, date?: string, notes?: string | null): Promise<{ completed: boolean }> {
  const c = hcClient();
  if (!c) throw new Error("hc_not_connected");
  const userId = await getUserId();
  if (!userId) throw new Error("user_id_not_resolved");
  const d = date ?? today();

  // Check current state
  const { data: existing } = await c.from("habit_completions")
    .select("id")
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .eq("completed_date", d)
    .maybeSingle();

  if (existing) {
    await c.from("habit_completions").delete().eq("id", existing.id);
    return { completed: false };
  } else {
    await c.from("habit_completions").insert({
      habit_id: habitId,
      user_id: userId,
      completed_date: d,
      notes: notes ?? null,
    });
    return { completed: true };
  }
}

export async function upsertJournal(date: string, text: string, energyLevel?: number | null): Promise<void> {
  const c = hcClient();
  if (!c) throw new Error("hc_not_connected");
  const userId = await getUserId();
  if (!userId) throw new Error("user_id_not_resolved");

  const { data: existing } = await c.from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("entry_date", date)
    .maybeSingle();

  if (existing) {
    await c.from("journal_entries").update({
      raw_text: text,
      energy_level: energyLevel ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    await c.from("journal_entries").insert({
      user_id: userId,
      entry_date: date,
      raw_text: text,
      energy_level: energyLevel ?? null,
      ocr_model: "pg-os-manual",
    });
  }
}

/** For the weekly brutal mirror card. */
export async function getWeekSummary(): Promise<{
  shipsThisWeek: number;
  habitsCompletedThisWeek: number;
  daysJournaled: number;
  avgMood: number | null;
} | null> {
  const c = hcClient();
  if (!c) return null;
  const userId = await getUserId();
  if (!userId) return null;
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;

  const [completionsRes, journalRes] = await Promise.all([
    c.from("habit_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("completed_date", sinceStr),
    c.from("journal_entries")
      .select("entry_date, energy_level")
      .eq("user_id", userId)
      .gte("entry_date", sinceStr),
  ]);

  const habitsCompletedThisWeek = completionsRes.count ?? 0;
  const journalRows = (journalRes.data ?? []) as { entry_date: string; energy_level: number | null }[];
  const daysJournaled = new Set(journalRows.map((r) => r.entry_date)).size;
  const moods = journalRows.map((r) => r.energy_level).filter((m): m is number => m != null);
  const avgMood = moods.length > 0 ? +(moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : null;

  // Ships from local SQLite (reuse shipLog.ts — inline to avoid circular import)
  const { shipsInLastDays } = await import("./shipLog");
  const shipsThisWeek = (await shipsInLastDays(7)).length;

  return { shipsThisWeek, habitsCompletedThisWeek, daysJournaled, avgMood };
}

/**
 * Record a habit completion with optional actual_value (for quantified habits).
 * If a completion for the day already exists, updates the actual_value rather
 * than creating a duplicate. Returns the inserted/updated row id.
 */
export async function recordCompletion(
  habitId: string,
  actualValue?: number | null,
  date?: string,
): Promise<{ ok: true; id: string }> {
  const c = hcClient();
  if (!c) throw new Error("hc_not_connected");
  const userId = await getUserId();
  if (!userId) throw new Error("user_id_not_resolved");
  const d = date ?? today();

  const { data: existing } = await c.from("habit_completions")
    .select("id")
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .eq("completed_date", d)
    .maybeSingle();

  if (existing) {
    const { data, error } = await c.from("habit_completions")
      .update({ actual_value: actualValue ?? null })
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: data.id as string };
  }

  const { data, error } = await c.from("habit_completions")
    .insert({
      habit_id: habitId,
      user_id: userId,
      completed_date: d,
      actual_value: actualValue ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { ok: true, id: data.id as string };
}

/** Tier thresholds (xp_percent → letter). */
function pctToTier(pct: number): { tier: Tier; lower: number; upper: number } {
  if (pct >= 100) return { tier: "SSS", lower: 100, upper: 150 };
  if (pct >= 90) return { tier: "S", lower: 90, upper: 100 };
  if (pct >= 80) return { tier: "A", lower: 80, upper: 90 };
  if (pct >= 70) return { tier: "B", lower: 70, upper: 80 };
  if (pct >= 60) return { tier: "C", lower: 60, upper: 70 };
  if (pct >= 50) return { tier: "D", lower: 50, upper: 60 };
  return { tier: "F", lower: 0, upper: 50 };
}

/**
 * Compute current season XP, target, tier, and progress.
 * Returns null if HC isn't connected or the season profile fields are missing.
 */
export async function getSeasonStatus(): Promise<SeasonStatus | null> {
  const c = hcClient();
  if (!c) return null;
  const userId = await getUserId();
  if (!userId) return null;

  // 1) profile season fields
  const { data: profile } = await c.from("profiles")
    .select("season_length_days, season_started_at, season_coins, season_tier_floor")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.season_started_at) return null;

  const lengthDays: number = profile.season_length_days ?? 66;
  const startedAt: string = profile.season_started_at;
  const coins: number = profile.season_coins ?? 0;
  const persistedFloor: Tier = (profile.season_tier_floor ?? "F") as Tier;

  // Compute season window
  const startDate = new Date(startedAt);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + lengthDays);
  const todayStr = today();
  const todayDate = new Date(todayStr);
  const daysElapsed = Math.min(lengthDays, daysBetween(startedAt, todayStr) + 1);
  const daysRemaining = Math.max(0, lengthDays - daysElapsed);
  const endIso = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  // 2) all habits (for target computation) + all completions in the season
  const [habitsRes, completionsRes] = await Promise.all([
    c.from("habits")
      .select("id, frequency, xp_per_completion, target_value, weekly_target")
      .eq("user_id", userId)
      .eq("is_active", true),
    c.from("habit_completions")
      .select("habit_id, actual_value, completed_date")
      .eq("user_id", userId)
      .gte("completed_date", startedAt)
      .lte("completed_date", endIso),
  ]);

  type HabitRow = {
    id: string;
    frequency: string;
    xp_per_completion: number | null;
    target_value: number | null;
    weekly_target: number | null;
  };
  type CompletionRow = { habit_id: string; actual_value: number | null; completed_date: string };

  const habits = (habitsRes.data ?? []) as HabitRow[];
  const completions = (completionsRes.data ?? []) as CompletionRow[];

  // Index target_value by habit
  const habitById = new Map(habits.map((h) => [h.id, h]));

  // 3) xp_earned: sum base * multiplier per completion
  let xpEarned = 0;
  for (const cmp of completions) {
    const h = habitById.get(cmp.habit_id);
    if (!h) continue;
    const base = h.xp_per_completion ?? 0;
    const mult = xpMultiplier(cmp.actual_value, h.target_value);
    xpEarned += base * mult;
  }

  // 4) xp_target: per-habit expected occurrences * base xp
  // Daily expected = lengthDays. Weekly expected = ceil(lengthDays/7) * weekly_target.
  const weeksInSeason = Math.ceil(lengthDays / 7);
  let xpTarget = 0;
  for (const h of habits) {
    const base = h.xp_per_completion ?? 0;
    const expected = h.weekly_target && h.weekly_target > 0
      ? weeksInSeason * h.weekly_target
      : lengthDays; // daily fallback
    xpTarget += base * expected;
  }

  if (xpTarget <= 0) {
    return {
      length_days: lengthDays,
      started_at: startedAt,
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
      xp_earned: 0,
      xp_target: 0,
      xp_percent: 0,
      tier: "F",
      tier_floor: persistedFloor,
      tier_progress: 0,
      coins,
    };
  }

  const xpPercent = (xpEarned / xpTarget) * 100;
  const { tier, lower, upper } = pctToTier(xpPercent);
  const range = upper - lower;
  const tierProgress = tier === "SSS"
    ? 100
    : Math.max(0, Math.min(100, ((xpPercent - lower) / range) * 100));

  // Ratchet: floor is max(persisted, current). If current beats persisted,
  // bump the persisted floor — fire-and-forget so the read path stays fast.
  const tier_floor = tierIndex(tier) > tierIndex(persistedFloor) ? tier : persistedFloor;
  if (tier_floor !== persistedFloor) {
    void c.from("profiles")
      .update({ season_tier_floor: tier_floor })
      .eq("id", userId)
      .then(({ error }) => {
        if (error) console.warn("[habits] tier_floor persist failed:", error.message);
      });
  }

  // Avoid unused-var lints when --noUnusedLocals is on
  void todayDate;

  return {
    length_days: lengthDays,
    started_at: startedAt,
    days_elapsed: daysElapsed,
    days_remaining: daysRemaining,
    xp_earned: Math.round(xpEarned),
    xp_target: Math.round(xpTarget),
    xp_percent: +xpPercent.toFixed(1),
    tier,
    tier_floor,
    tier_progress: +tierProgress.toFixed(1),
    coins,
  };
}

const TIER_LADDER: Tier[] = ["F", "D", "C", "B", "A", "S", "SSS"];
function tierIndex(t: Tier): number {
  return TIER_LADDER.indexOf(t);
}

// ─── Habit Editor CRUD ────────────────────────────────────────────────────────

export type AttributeRow = { id: string; name: string };

/** Fetch the 6 HC attributes for use in the habit editor UI. */
export async function getAttributes(): Promise<AttributeRow[]> {
  const c = hcClient();
  if (!c) throw new Error("hc_not_connected");
  const { data, error } = await c.from("attributes").select("id, name").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AttributeRow[];
}

export type CreateHabitInput = {
  name: string;
  attribute_id: string;
  frequency: "daily" | "weekly";
  weekly_target: number;
  xp_per_completion: number;
  description?: string | null;
  target_value?: number | null;
  target_unit?: string | null;
};

/** Insert a new habit row for PG's user_id. */
export async function createHabit(input: CreateHabitInput): Promise<{ id: string }> {
  const c = hcClient();
  if (!c) throw new Error("hc_not_connected");
  const userId = await getUserId();
  if (!userId) throw new Error("user_id_not_resolved");

  const { data, error } = await c.from("habits").insert({
    user_id: userId,
    name: input.name,
    attribute_id: input.attribute_id,
    frequency: input.frequency,
    weekly_target: input.weekly_target,
    xp_per_completion: input.xp_per_completion,
    description: input.description ?? null,
    target_value: input.target_value ?? null,
    target_unit: input.target_unit ?? null,
    is_active: true,
  }).select("id").single();

  if (error) throw error;
  return { id: data.id as string };
}

export type UpdateHabitInput = Partial<CreateHabitInput>;

/** Update mutable fields on an existing habit. */
export async function updateHabit(habitId: string, input: UpdateHabitInput): Promise<void> {
  const c = hcClient();
  if (!c) throw new Error("hc_not_connected");
  const userId = await getUserId();
  if (!userId) throw new Error("user_id_not_resolved");

  // Build a clean update payload — only include keys that were provided.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.attribute_id !== undefined) patch.attribute_id = input.attribute_id;
  if (input.frequency !== undefined) patch.frequency = input.frequency;
  if (input.weekly_target !== undefined) patch.weekly_target = input.weekly_target;
  if (input.xp_per_completion !== undefined) patch.xp_per_completion = input.xp_per_completion;
  if ("description" in input) patch.description = input.description ?? null;
  if ("target_value" in input) patch.target_value = input.target_value ?? null;
  if ("target_unit" in input) patch.target_unit = input.target_unit ?? null;

  const { error } = await c.from("habits")
    .update(patch)
    .eq("id", habitId)
    .eq("user_id", userId);

  if (error) throw error;
}

/** Soft-archive a habit by setting is_active = false. */
export async function archiveHabit(habitId: string): Promise<void> {
  const c = hcClient();
  if (!c) throw new Error("hc_not_connected");
  const userId = await getUserId();
  if (!userId) throw new Error("user_id_not_resolved");

  const { error } = await c.from("habits")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", habitId)
    .eq("user_id", userId);

  if (error) throw error;
}
