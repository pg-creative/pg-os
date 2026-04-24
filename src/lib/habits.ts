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
};

export type HabitWithCompletion = Habit & {
  completed: boolean;
  completion_notes: string | null;
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

export async function getDaySnapshot(date?: string): Promise<DaySnapshot | null> {
  const c = hcClient();
  if (!c) return null;
  const userId = await getUserId();
  if (!userId) return null;
  const d = date ?? today();

  const [habitsRes, completionsRes, journalRes, streakRows] = await Promise.all([
    c.from("habits")
      .select("id, name, description, frequency, attribute_id, xp_per_completion")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    c.from("habit_completions")
      .select("habit_id, notes")
      .eq("user_id", userId)
      .eq("completed_date", d),
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
  const completedIds = new Set((completionsRes.data ?? []).map((r: { habit_id: string }) => r.habit_id));
  const notesByHabit = new Map((completionsRes.data ?? []).map((r: { habit_id: string; notes: string | null }) => [r.habit_id, r.notes]));

  const habits: HabitWithCompletion[] = (habitsRes.data ?? []).map((h: Habit) => ({
    ...h,
    completed: completedIds.has(h.id),
    completion_notes: notesByHabit.get(h.id) ?? null,
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
  const shipsThisWeek = shipsInLastDays(7).length;

  return { shipsThisWeek, habitsCompletedThisWeek, daysJournaled, avgMood };
}
