/**
 * kitsuOrchestration.ts — Phase 4 fleet awareness.
 *
 * Read-only helpers that let Kitsu (and the proactive sweep) see the live fleet
 * of Claude Code sessions and decide what genuinely needs PG. Wraps existing
 * libs (marvisFleet telemetry + the cockpit daemon's controllable session list).
 * No side effects here; launching/killing lives behind the autonomy gate.
 */
import { buildMarvisFleet } from "@/lib/cockpit/marvisFleet";
import type { MarvisSession } from "@/lib/cockpit/marvis";
import { listCockpitSessions, type CockpitSession } from "@/lib/cockpitDaemon";
import { daysWaiting, type QueueItem } from "@/lib/queueStore";

export interface FleetSnapshot {
  /** Telemetry-derived live sessions (model, ctx %, cost, status, controllable). */
  sessions: MarvisSession[];
  /** Daemon-backed sessions (controllable two-way terminals), with cwd. */
  daemon: CockpitSession[];
}

export async function gatherFleet(): Promise<FleetSnapshot> {
  const [sessions, daemon] = await Promise.all([
    buildMarvisFleet().catch(() => [] as MarvisSession[]),
    listCockpitSessions().catch(() => [] as CockpitSession[]),
  ]);
  return { sessions, daemon: daemon.filter((d) => !d.dead) };
}

export type Urgency = {
  kind: "permission" | "context" | "stalled" | "queue";
  label: string; // short, spoken-friendly
  detail?: string;
};

/**
 * Decide what genuinely needs PG right now. Conservative thresholds so the
 * sweep stays quiet unless something real is happening.
 */
export function detectUrgencies(input: {
  sessions: MarvisSession[];
  queue: QueueItem[];
}): Urgency[] {
  const out: Urgency[] = [];

  for (const s of input.sessions) {
    if (s.status === "permission") {
      out.push({
        kind: "permission",
        label: `${s.projectLabel} is waiting on a permission`,
      });
    } else if (s.contextUsedPct >= 85) {
      out.push({
        kind: "context",
        label: `${s.projectLabel} is near its context limit`,
        detail: `${Math.round(s.contextUsedPct)}% used`,
      });
    }
  }

  // Queue items that have waited a while are worth a gentle nudge.
  const stale = input.queue
    .filter((q) => daysWaiting(q) >= 3)
    .sort((a, b) => daysWaiting(b) - daysWaiting(a))
    .slice(0, 2);
  for (const q of stale) {
    out.push({
      kind: "queue",
      label: `"${q.title}" has waited ${daysWaiting(q)} days for a decision`,
      detail: q.source ? `from ${q.source}` : undefined,
    });
  }

  return out;
}
