import { NextRequest, NextResponse } from "next/server";
import { connected, status as hcStatus } from "@/lib/hcSupabase";
import { getDaySnapshot, toggleCompletion, upsertJournal, getWeekSummary } from "@/lib/habits";

export async function GET(req: NextRequest) {
  if (!connected()) {
    return NextResponse.json({ connected: false, hint: "Add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local", status: hcStatus() });
  }
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  try {
    const [snapshot, week] = await Promise.all([getDaySnapshot(date), getWeekSummary()]);
    return NextResponse.json({ connected: true, snapshot, week });
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
      return NextResponse.json({ ok: true, ...res });
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
