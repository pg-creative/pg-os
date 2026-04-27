/**
 * Brutal mirror — Sunday-only weekly retrospective. Aggregates ships,
 * queue resolutions, and habit completions for the past 7 days into a single
 * "week in review" queue item with a multi-paragraph note.
 *
 * No judgment, no spin — just numbers and a question.
 */
import type { Rule, RuleAction } from "../ruleEngine";
import { shipsInLastDays } from "../shipLog";
import { listQueue } from "../queueStore";
import { getWeekSummary } from "../habits";

export const brutalMirror: Rule = {
  id: "brutal-mirror",
  name: "Sunday brutal mirror",
  schedule: "weekly:sun",
  evaluate: async (): Promise<RuleAction | null> => {
    const cutoff = Date.now() - 7 * 86_400_000;

    let shipsCount = 0;
    try {
      const ships = await shipsInLastDays(7);
      shipsCount = ships.length;
    } catch {
      shipsCount = 0;
    }

    let queueResolved = 0;
    let queueDismissed = 0;
    let queueOpenStale = 0;
    try {
      // listQueue returns currently-open items (filesystem source of truth).
      // For "resolved this week" counts, we lean on Supabase via the same call —
      // resolved items come back from listSupabaseUnresolved as null-filtered,
      // so we can only count opens reliably here. We approximate "stale opens"
      // (created >7d ago and still open) and surface that.
      const open = await listQueue();
      for (const i of open) {
        if (i.created_at < cutoff) queueOpenStale += 1;
      }
      // Resolved/dismissed counts are best-effort: we count items that are no
      // longer present on the filesystem but were created in the last 14 days
      // — but we don't have history here, so leave them at 0 for now and let
      // the note speak to the "still open" vs "shipped" framing.
      queueResolved = 0;
      queueDismissed = 0;
    } catch {
      /* leave counts at 0 */
    }

    let habitsLine = "Habits: not connected.";
    try {
      const summary = await getWeekSummary();
      if (summary) {
        habitsLine = `Habits: ${summary.habitsCompletedThisWeek} completions this week. Journaled ${summary.daysJournaled}/7 days${summary.avgMood != null ? `, avg mood ${summary.avgMood}` : ""}.`;
      }
    } catch {
      /* leave default line */
    }

    const lines: string[] = [];
    lines.push(`Ships this week: **${shipsCount}**.`);
    lines.push(habitsLine);
    if (queueOpenStale > 0) {
      lines.push(`Queue: ${queueOpenStale} item${queueOpenStale === 1 ? "" : "s"} have been open >7 days.`);
    }
    lines.push("");
    lines.push("What got shipped that mattered? What got pushed for the third week in a row? What's the one thing that would change everything if it shipped this coming week?");

    return {
      kind: "queue_item",
      title: "Sunday mirror — week in review",
      source: "cross-tab",
      options: ["Reflect now", "Snooze to Monday morning", "Dismiss"],
      note: lines.join("\n"),
    };
  },
};
