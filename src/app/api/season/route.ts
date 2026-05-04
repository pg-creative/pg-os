/**
 * GET /api/season
 *
 * Returns the current SeasonStatus from HC's profile + habit-completion data.
 * Shape mirrors `getSeasonStatus()` in `src/lib/habits.ts`. When HC isn't
 * connected (no env, no profile season fields, no user), we degrade to a
 * minimal stub so the SeasonMeter can still render an empty-but-valid bar.
 *
 * Notes:
 * - Tier and tier_progress are derived from xp_percent (0–100+); thresholds
 *   live in `pctToTier()` inside habits.ts. Spec calls out absolute XP
 *   thresholds (F:0, D:1500, C:4000…) but the live system is percent-based,
 *   so the meter stays consistent with what HC actually reports.
 * - Season cadence is read from profile.season_length_days (default 66).
 * - days_elapsed / days_remaining are computed from profile.season_started_at;
 *   no client-side anchor needed.
 */
import { NextResponse } from "next/server";
import { getSeasonStatus } from "@/lib/habits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const status = await getSeasonStatus();

    if (!status) {
      // HC not connected or season not started — render as F-tier empty.
      return NextResponse.json({
        connected: false,
        length_days: 66,
        started_at: null,
        days_elapsed: 0,
        days_remaining: 66,
        xp_earned: 0,
        xp_target: 0,
        xp_percent: 0,
        tier: "F" as const,
        tier_floor: "F" as const,
        tier_progress: 0,
        coins: 0,
      });
    }

    return NextResponse.json({ connected: true, ...status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json(
      {
        connected: false,
        error: msg,
        length_days: 66,
        started_at: null,
        days_elapsed: 0,
        days_remaining: 66,
        xp_earned: 0,
        xp_target: 0,
        xp_percent: 0,
        tier: "F" as const,
        tier_floor: "F" as const,
        tier_progress: 0,
        coins: 0,
      },
      { status: 200 },
    );
  }
}
