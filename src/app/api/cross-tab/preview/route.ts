/**
 * Cross-tab preview — dry-run the rule engine and return what WOULD fire right
 * now without writing anything to disk. Used by the dashboard to show a
 * "what's brewing" panel.
 *
 * Filters by `schedule_now` are skipped (we evaluate every rule regardless of
 * its schedule, so the dashboard can see all conditions, not just the ones
 * that happen to match the current hour). Engine still respects scheduling on
 * the real cron.
 */
import { NextResponse } from "next/server";
import { runRules } from "@/lib/ruleEngine";
import { RULES } from "@/lib/rules/index";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const startedAt = new Date();
  // For preview, run each rule directly (bypassing schedule gating) so the
  // dashboard can see "what would fire right now", regardless of cadence.
  const results = await Promise.all(
    RULES.map(async (rule) => {
      try {
        const action = await rule.evaluate({ now: startedAt });
        return {
          rule_id: rule.id,
          rule_name: rule.name,
          schedule: rule.schedule,
          scheduled_now: true,
          fired: !!action,
          dry: true,
          action: action ?? undefined,
        };
      } catch (err) {
        return {
          rule_id: rule.id,
          rule_name: rule.name,
          schedule: rule.schedule,
          scheduled_now: true,
          fired: false,
          dry: true,
          error: err instanceof Error ? err.message : "unknown",
        };
      }
    }),
  );
  // Also include the "schedule-respecting" results for transparency
  const scheduled = await runRules({ now: startedAt, dryRun: true });
  return NextResponse.json({
    ok: true,
    started_at: startedAt.toISOString(),
    duration_ms: Date.now() - startedAt.getTime(),
    preview: results,
    scheduled,
  });
}
