import { NextResponse } from "next/server";
import { countOverdue, listDuePostMortems } from "@/lib/postMortem";

// Daily sweep — Vercel cron fires at 0 9 * * * (see vercel.json).
// Read-only for now: counts overdue post-mortems and returns a summary
// payload. Future-extensible: this is where push notifications or
// auto-archive logic would hook in.
export async function GET() {
  const startedAt = new Date().toISOString();
  const overdue = await countOverdue();
  // Pull a small preview so logs/Vercel UI show what's pending.
  const sample = overdue > 0 ? (await listDuePostMortems()).slice(0, 5) : [];
  const summary = {
    ok: true,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    overdue,
    sample: sample.map((r) => ({
      id: r.id,
      kind: r.kind,
      ref_id: r.ref_id,
      followup_at: r.followup_at,
    })),
  };
  console.log("[cron/post-mortem-sweep]", JSON.stringify(summary));
  return NextResponse.json(summary);
}
