import { NextRequest, NextResponse } from "next/server";
import { connected, status as hcStatus } from "@/lib/hcSupabase";
import {
  getDaySnapshot,
  toggleCompletion,
  upsertJournal,
  getWeekSummary,
  getSeasonStatus,
  recordCompletion,
} from "@/lib/habits";

export async function GET(req: NextRequest) {
  if (!connected()) {
    return NextResponse.json({ connected: false, hint: "Add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local", status: hcStatus() });
  }
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
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
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
