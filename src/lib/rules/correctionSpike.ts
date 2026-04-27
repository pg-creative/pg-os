/**
 * Correction spike — when ≥5 corrections fire in the last 24 hours of
 * self-improvement signals, surface a "review corrections" queue item that
 * points PG at the Flow tab for triage.
 */
import type { Rule, RuleAction } from "../ruleEngine";
import { getRecentFindings } from "../claudeStore";

const SPIKE_THRESHOLD = 5;

export const correctionSpike: Rule = {
  id: "correction-spike",
  name: "Correction spike",
  schedule: "hourly",
  evaluate: async (): Promise<RuleAction | null> => {
    let signals;
    try {
      // getRecentFindings(1) reads today's + yesterday's date-stamped jsonl files.
      signals = await getRecentFindings(1);
    } catch {
      return null;
    }
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let corrections = 0;
    for (const s of signals) {
      if (!s?.signals?.includes("correction")) continue;
      const ts = Date.parse(s.timestamp);
      if (Number.isNaN(ts)) continue;
      if (ts >= cutoff) corrections += 1;
    }
    if (corrections < SPIKE_THRESHOLD) return null;
    return {
      kind: "queue_item",
      title: `${corrections} corrections in 24h — review on Flow tab`,
      source: "cross-tab",
      options: ["Review on Flow tab", "Tune a rule", "Snooze"],
      note: `${corrections} correction signals in the last 24 hours. Open the Flow tab and skim the recent corrections list — pattern likely worth promoting to a rule.`,
    };
  },
};
