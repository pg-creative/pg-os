/**
 * Project drift — when an active project has had zero ships logged in N days
 * (default 14), file a "synthetic deadline" queue item. Caps at 2 emissions
 * per run to avoid spamming Sundays/Mondays after a vacation.
 *
 * "Ship with this context" = ship row whose `context` field equals the
 * project id (this is how the dashboard tags ships).
 */
import type { Rule, RuleAction } from "../ruleEngine";
import { ACTIVE_PROJECTS } from "../projects";
import { shipsInLastDays } from "../shipLog";

const DRIFT_DAYS = 14;
const MAX_EMITS_PER_RUN = 2;

export const projectDrift: Rule = {
  id: "project-drift",
  name: "Project drift",
  schedule: "daily",
  evaluate: async (): Promise<RuleAction | null> => {
    let recentShips;
    try {
      // Pull the last 30 days so we can see when each project was last touched.
      recentShips = await shipsInLastDays(30);
    } catch {
      return null;
    }
    // Build last-ship-at map per project context
    const lastShipAt = new Map<string, number>();
    for (const s of recentShips) {
      if (!s.context) continue;
      const prev = lastShipAt.get(s.context) ?? 0;
      if (s.created_at > prev) lastShipAt.set(s.context, s.created_at);
    }

    const driftCutoff = Date.now() - DRIFT_DAYS * 86_400_000;
    const drifted: { id: string; name: string; lastAt: number | null }[] = [];
    for (const project of ACTIVE_PROJECTS) {
      const lastAt = lastShipAt.get(project.id) ?? null;
      if (lastAt == null || lastAt < driftCutoff) {
        drifted.push({ id: project.id, name: project.name, lastAt });
      }
    }
    if (drifted.length === 0) return null;
    // Sort: oldest (or never-shipped) first
    drifted.sort((a, b) => (a.lastAt ?? 0) - (b.lastAt ?? 0));
    const picks = drifted.slice(0, MAX_EMITS_PER_RUN);

    const noteLines = picks.map((p) => {
      if (p.lastAt == null) return `• ${p.name} — no ships logged in 30+ days`;
      const days = Math.floor((Date.now() - p.lastAt) / 86_400_000);
      return `• ${p.name} — last shipped ${days} days ago`;
    });

    return {
      kind: "queue_item",
      title: `${picks.length} project${picks.length === 1 ? "" : "s"} drifting — set a synthetic deadline?`,
      source: "cross-tab",
      options: ["Set deadline", "Archive project", "Ignore"],
      note: `Drifted projects (>${DRIFT_DAYS} days no ships):\n${noteLines.join("\n")}\n\nA synthetic deadline forces a decision: ship something this week, or accept the project is dormant.`,
    };
  },
};
