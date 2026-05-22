/**
 * POST|GET /api/kitsu/sweep — Kitsu's proactive presence (Phase 4).
 *
 * PG wants Kitsu present, not just reactive (companion / cofounder / confidant).
 * This is the gentle sweep: review the live fleet + the approval queue, decide
 * what genuinely needs PG, write at most a few nudges to the Flow queue, and push
 * a notification only for the urgent ones (a session waiting on a permission,
 * near its context limit). Quiet when nothing is happening.
 *
 * Cron-able from PG's Mac, e.g. (hourly while awake):
 *   * * * * *  curl -s -X POST http://127.0.0.1:3031/api/kitsu/sweep >/dev/null
 * or via launchd. It is idempotent: nudges use stable ids so re-sweeps do not
 * pile up duplicates.
 */
import { NextResponse } from "next/server";
import {
  gatherFleet,
  detectUrgencies,
  type Urgency,
} from "@/lib/kitsu/kitsuOrchestration";
import { listQueue, addQueueItem } from "@/lib/queueStore";
import { appendKitsuDecision, distillToMemory } from "@/lib/kitsu/kitsuMemory";
import { sendToAll, isPushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NUDGES = 3;

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function runSweep() {
  const fleet = await gatherFleet();
  const queue = await listQueue();
  const urgencies = detectUrgencies({ sessions: fleet.sessions, queue });

  // Write nudges to the Flow queue (stable id => idempotent across sweeps).
  const existingIds = new Set(queue.map((q) => q.id));
  const nudged: string[] = [];
  for (const u of urgencies.slice(0, MAX_NUDGES)) {
    const id = `kitsu-sweep-${u.kind}-${slug(u.label)}`;
    if (existingIds.has(id)) continue; // already surfaced, do not duplicate
    await addQueueItem({
      id,
      title: u.label,
      source: "kitsu-sweep",
      note: [u.detail, "Surfaced proactively by Kitsu."]
        .filter(Boolean)
        .join(" "),
    });
    nudged.push(id);
  }

  // Notify only for the genuinely interrupting kinds.
  const hard = urgencies.filter(
    (u: Urgency) =>
      u.kind === "permission" || u.kind === "context" || u.kind === "stalled",
  );
  let notified = false;
  if (hard.length && isPushConfigured()) {
    const body = hard
      .map((u) => u.label)
      .slice(0, 3)
      .join(" · ");
    const res = await sendToAll({
      title:
        hard.length === 1
          ? "Kitsu: one thing needs you"
          : `Kitsu: ${hard.length} things need you`,
      body,
      url: "/?tab=cockpit",
      tag: "kitsu-sweep",
    });
    notified = res.delivered > 0;
  }

  // Anti-drift: fold accumulated corrections into the sharp MEMORY.md so the
  // soul does not bloat into a wall of text over time.
  const distilled = await distillToMemory().catch(() => ({ distilled: 0 }));

  // Log the sweep so the decision-log shows Kitsu's proactive activity.
  await appendKitsuDecision({
    summary: `Swept the fleet: ${fleet.sessions.length} live, ${urgencies.length} urgent, ${nudged.length} nudged, notified=${notified}, distilled=${distilled.distilled}`,
    kind: "sweep",
  });

  return {
    ok: true,
    live: fleet.sessions.length,
    urgencies,
    nudged,
    notified,
    distilled: distilled.distilled,
  };
}

export async function POST() {
  try {
    return NextResponse.json(await runSweep());
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return POST();
}
