// Shared types for the Habits v2 UI. These mirror the server-side
// shapes from src/lib/habits.ts but are duplicated here so client
// components don't need to import server-only modules.

export type Tier = "F" | "D" | "C" | "B" | "A" | "S" | "SSS";

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  frequency: "daily" | "weekdays" | "weekends" | "weekly" | "custom";
  attribute_id: string | null;
  xp_per_completion: number;
  target_value?: number | null;
  target_unit?: string | null;
  weekly_target?: number | null;
  completed: boolean;
  completion_notes: string | null;
  actual_value?: number | null;
  weekly_completions?: number;
}

export interface SeasonStatus {
  length_days: number;
  started_at: string;
  days_elapsed: number;
  days_remaining: number;
  xp_earned: number;
  xp_target: number;
  xp_percent: number;
  /** Live tier derived from xp_percent — can move down if pace slows. */
  tier: Tier;
  /**
   * Ratchet floor: highest tier ever reached this season. Once you hit C,
   * C is locked even if pace slips. UI shows floor as the displayed letter
   * with a small "currently pacing X" subtitle when current < floor.
   */
  tier_floor: Tier;
  tier_progress: number;
  coins: number;
}

/** Map an attribute_id (HC's attribute UUID) to a named glyph. Falls back to "star". */
export function attributeGlyph(_id: string | null): "star" | "sun" | "heart" | "cloud" | "sparkles" | "feather" | "music" | "compass" {
  // We don't have a stable attribute→glyph mapping here yet; the seed habits use names like Body/Mind/Spirit/Skill.
  // Keep this as a thin wrapper so callers can swap to a smarter mapping later without edits.
  return "sparkles";
}
