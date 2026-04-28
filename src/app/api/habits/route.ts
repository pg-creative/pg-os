import { NextRequest, NextResponse } from "next/server";
import { connected, status as hcStatus } from "@/lib/hcSupabase";
import {
  getDaySnapshot,
  toggleCompletion,
  upsertJournal,
  getWeekSummary,
  getSeasonStatus,
  recordCompletion,
  getAttributes,
  createHabit,
  updateHabit,
  archiveHabit,
} from "@/lib/habits";
import { awardCoinsForCompletion } from "@/lib/chests";

export async function GET(req: NextRequest) {
  if (!connected()) {
    return NextResponse.json({ connected: false, hint: "Add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local", status: hcStatus() });
  }
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  // ?attributes=1 → return attribute list only (for habit editor)
  if (req.nextUrl.searchParams.get("attributes") === "1") {
    try {
      const attributes = await getAttributes();
      return NextResponse.json({ connected: true, attributes });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      return NextResponse.json({ connected: true, error: msg }, { status: 500 });
    }
  }
  try {
    const [snapshot, week, season] = await Promise.all([
      getDaySnapshot(date),
      getWeekSummary(),
      getSeasonStatus(),
    ]);
    return NextResponse.json({ connected: true, snapshot, week, season });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ connected: true, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!connected()) {
    return NextResponse.json({ error: "hc_not_connected", hint: "Add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  try {
    if (action === "toggle") {
      const { habitId, date, notes } = body;
      if (!habitId) return NextResponse.json({ error: "habitId_required" }, { status: 400 });
      const res = await toggleCompletion(habitId, date, notes);
      const [snapshot, season] = await Promise.all([
        getDaySnapshot(date),
        getSeasonStatus(),
      ]);
      return NextResponse.json({ ok: true, ...res, snapshot, season });
    }
    if (action === "complete") {
      // Insert (or update existing) completion with optional actual_value.
      const { habitId, actualValue, date } = body as {
        habitId?: string; actualValue?: number | null; date?: string;
      };
      if (!habitId) return NextResponse.json({ error: "habitId_required" }, { status: 400 });
      await recordCompletion(habitId, typeof actualValue === "number" ? actualValue : null, date);
      // Phase 3: mint coins from this completion's effective XP. Best-effort.
      const habit = (await getDaySnapshot(date))?.habits.find((h) => h.id === habitId);
      if (habit) {
        const base = habit.xp_per_completion ?? 0;
        const mult = habit.target_value && habit.target_value > 0 && typeof actualValue === "number"
          ? Math.min(1.5, Math.max(1.0, actualValue / habit.target_value))
          : 1.0;
        await awardCoinsForCompletion(Math.round(base * mult));
      }
      const [snapshot, season] = await Promise.all([
        getDaySnapshot(date),
        getSeasonStatus(),
      ]);
      return NextResponse.json({ ok: true, snapshot, season });
    }
    if (action === "journal") {
      const { date, text, energyLevel } = body;
      if (!date || typeof text !== "string") return NextResponse.json({ error: "date_and_text_required" }, { status: 400 });
      await upsertJournal(date, text, typeof energyLevel === "number" ? energyLevel : null);
      return NextResponse.json({ ok: true });
    }
    if (action === "create_habit") {
      const { name, attribute_id, frequency, weekly_target, xp_per_completion, description, target_value, target_unit } = body;
      if (!name || !attribute_id) return NextResponse.json({ error: "name_and_attribute_required" }, { status: 400 });
      const result = await createHabit({
        name,
        attribute_id,
        frequency: frequency === "weekly" ? "weekly" : "daily",
        weekly_target: typeof weekly_target === "number" ? Math.max(1, Math.min(7, weekly_target)) : 7,
        xp_per_completion: typeof xp_per_completion === "number" ? Math.max(5, Math.min(50, xp_per_completion)) : 10,
        description: description ?? null,
        target_value: typeof target_value === "number" ? target_value : null,
        target_unit: target_unit ?? null,
      });
      return NextResponse.json({ ok: true, id: result.id });
    }
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!connected()) {
    return NextResponse.json({ error: "hc_not_connected", hint: "Add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const { habitId, ...fields } = body as { habitId?: string; [k: string]: unknown };
  if (!habitId) return NextResponse.json({ error: "habitId_required" }, { status: 400 });
  try {
    type Freq = "daily" | "weekly";
    const patch: Parameters<typeof updateHabit>[1] = {};
    if (typeof fields.name === "string") patch.name = fields.name;
    if (typeof fields.attribute_id === "string") patch.attribute_id = fields.attribute_id;
    if (fields.frequency === "daily" || fields.frequency === "weekly") patch.frequency = fields.frequency as Freq;
    if (typeof fields.weekly_target === "number") patch.weekly_target = Math.max(1, Math.min(7, fields.weekly_target));
    if (typeof fields.xp_per_completion === "number") patch.xp_per_completion = Math.max(5, Math.min(50, fields.xp_per_completion));
    if ("description" in fields) patch.description = (fields.description as string | null) ?? null;
    if ("target_value" in fields) patch.target_value = (fields.target_value as number | null) ?? null;
    if ("target_unit" in fields) patch.target_unit = (fields.target_unit as string | null) ?? null;
    await updateHabit(habitId, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!connected()) {
    return NextResponse.json({ error: "hc_not_connected", hint: "Add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const { habitId } = body as { habitId?: string };
  if (!habitId) return NextResponse.json({ error: "habitId_required" }, { status: 400 });
  try {
    await archiveHabit(habitId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
