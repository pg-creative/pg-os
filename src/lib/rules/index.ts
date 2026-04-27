/**
 * Cross-tab intelligence rules. Each rule reads from a few independent sources
 * (Whoop, Calendar, ships, claudeStore, habits) and emits an optional queue item.
 *
 * Schedules:
 *   - hourly:     evaluated on every cron tick (top of every hour)
 *   - daily:      evaluated once per day (when hour === 0 in cron's local time)
 *   - weekly:sun: evaluated only on Sundays (UTC, cron is UTC by default)
 */
import type { Rule } from "../ruleEngine";
import { lowRecoveryHeavyCalendar } from "./lowRecoveryHeavyCalendar";
import { correctionSpike } from "./correctionSpike";
import { velocityDrop } from "./velocityDrop";
import { projectDrift } from "./projectDrift";
import { brutalMirror } from "./brutalMirror";
import { reconcileJanitor } from "./reconcileJanitor";

export const RULES: Rule[] = [
  lowRecoveryHeavyCalendar,
  correctionSpike,
  velocityDrop,
  projectDrift,
  brutalMirror,
  reconcileJanitor,
];
